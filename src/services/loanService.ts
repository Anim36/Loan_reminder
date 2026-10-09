// Loan storage layer.
//
// When `NEXT_PUBLIC_API_URL` is set the functions below hit the backend
// described in the root README. When it's empty they fall back to a
// `localStorage`-backed store that matches the API contract, so the
// prototype keeps working without a server.
//
// All exports are `async` so the call sites never branch on which
// backend is configured. SSR-safe: nothing here touches `window` at
// module scope; the storage helpers check `hasWindow()` themselves.
//
// Storage versioning
// ------------------
// Loans are persisted under `:v3` (an envelope `{ __v, items }`) so
// future shape changes can be detected and migrated without bumping
// the storage key.
//
//   v0 / :v1 — bare array of loans (no `payments`, no
//               `rescheduleHistory`, no per-loan `messageLanguage`)
//   v1 / :v2 — bare array, with `payments` + synthetic full payment
//               for any loan already marked Paid
//   v2 / :v3 — `{ __v: 2, items: [...] }` envelope, `payments`,
//               `rescheduleHistory`, and per-loan `messageLanguage`
//               all populated via `normalizeLoan`
//
// `normalizeLoan` fills every missing field on every read so a
// partial record (e.g. one that was saved before per-loan
// `messageLanguage` existed) still renders correctly. Corrupt or
// non-array JSON falls back to the seed loans without throwing.

import { API_ENABLED, apiDelete, apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import { SEED_LOANS } from "@/data";
import type { Loan, Payment, RescheduleEntry } from "@/types/loan";
import { hasWindow, safeJsonParse } from "./storage";

const STORAGE_VERSION = 2;
const STORAGE_KEY = "loan-reminder:loans:v3";
const STORAGE_KEY_V2 = "loan-reminder:loans:v2";
const STORAGE_KEY_V1 = "loan-reminder:loans:v1";
const CHANGE_EVENT = "loans:change";

/* ---- Parsing --------------------------------------------------------- */

/* ---- Normalization -------------------------------------------------- */

export function normalizeLoan(l: Partial<Loan> & { id: string }): Loan {
  return {
    id: l.id,
    friend: l.friend ?? { id: l.id, name: "Friend" },
    amount: l.amount ?? 0,
    dateGiven: l.dateGiven ?? "2026-01-01",
    dueDate: l.dueDate ?? "2026-01-01",
    tone: (l.tone as Loan["tone"]) ?? "Friendly",
    reminders: {
      sms: l.reminders?.sms ?? true,
      email: l.reminders?.email ?? false,
    },
    note: l.note,
    consent: l.consent ?? false,
    messageLanguage: l.messageLanguage,
    status: (l.status as Loan["status"]) ?? "Pending",
    paidAt: l.paidAt,
    payments: Array.isArray(l.payments) ? l.payments : [],
    rescheduleHistory: Array.isArray(l.rescheduleHistory)
      ? l.rescheduleHistory
      : [],
    createdAt: l.createdAt ?? new Date().toISOString(),
    updatedAt: l.updatedAt ?? new Date().toISOString(),
  };
}

/* ---- Migration ------------------------------------------------------- */

/** Unwrap a v3 envelope (`{ __v, items }`) or pass through a v1/v2
 *  bare array. Returns `null` for anything else. */
function unwrap(raw: unknown): Loan[] | null {
  if (Array.isArray(raw)) return raw as Loan[];
  if (raw && typeof raw === "object") {
    const items = (raw as Record<string, unknown>).items;
    if (Array.isArray(items)) return items as Loan[];
  }
  return null;
}

/** Returns a copy of `loans` migrated from the v1 shape (no payments
 *  / rescheduleHistory) to the v2 shape. */
function migrateFromV1(loans: Loan[]): Loan[] {
  return loans.map((raw) => {
    const base = normalizeLoan(raw);
    if (base.payments.length === 0 && base.status === "Paid") {
      // Synthesize a single full payment so the new UI has something
      // to display in the payment history.
      base.payments = [
        {
          id: `${base.id}-migrated`,
          amount: base.amount,
          date: (base.paidAt ?? base.updatedAt).slice(0, 10),
          method: "Other",
          note: "Imported from earlier data.",
        },
      ];
    }
    return base;
  });
}

/* Caches the parsed snapshot by the raw storage string so the
 *  same array reference is returned until the underlying value
 *  actually changes. */
let cachedRaw: string | null = null;
let cachedLoans: Loan[] | null = null;

function readV3(): Loan[] | null {
  if (!hasWindow()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedLoans;
  const parsed = safeJsonParse<unknown>(raw);
  const arr = parsed ? unwrap(parsed) : null;
  if (!arr) {
    cachedRaw = raw;
    cachedLoans = null;
    return null;
  }
  const normalized = arr.map(normalizeLoan);
  // Persist the migrated form if anything changed.
  if (JSON.stringify(normalized) !== JSON.stringify(arr)) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ __v: STORAGE_VERSION, items: normalized }),
      );
    } catch {
      // ignore — storage may be unavailable in private mode
    }
  }
  cachedRaw = raw;
  cachedLoans = normalized;
  return cachedLoans;
}

function readAll(): Loan[] {
  if (!hasWindow()) return SEED_LOANS;
  const v3 = readV3();
  if (v3) return v3;
  // v2 (bare array) — wrap and migrate.
  const v2Raw = safeJsonParse<Loan[]>(window.localStorage.getItem(STORAGE_KEY_V2));
  if (Array.isArray(v2Raw)) {
    const migrated = v2Raw.map(normalizeLoan).map((l) => {
      if (l.payments.length === 0 && l.status === "Paid") {
        return {
          ...l,
          payments: [
            {
              id: `${l.id}-migrated`,
              amount: l.amount,
              date: (l.paidAt ?? l.updatedAt).slice(0, 10),
              method: "Other" as const,
              note: "Imported from earlier data.",
            },
          ],
        };
      }
      return l;
    });
    writeAll(migrated);
    window.localStorage.removeItem(STORAGE_KEY_V2);
    return migrated;
  }
  // v1 → v2/v3 migration.
  const v1Raw = safeJsonParse<Loan[]>(window.localStorage.getItem(STORAGE_KEY_V1));
  if (Array.isArray(v1Raw)) {
    const migrated = migrateFromV1(v1Raw);
    writeAll(migrated);
    window.localStorage.removeItem(STORAGE_KEY_V1);
    return migrated;
  }
  return SEED_LOANS;
}

function writeAll(loans: Loan[]): void {
  if (!hasWindow()) return;
  try {
    // Persist with a version envelope so future shape changes can be
    // detected and migrated. The normalizer unwraps both the
    // envelope and the bare array so old readers keep working.
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ __v: STORAGE_VERSION, items: loans }),
    );
  } catch {
    // ignore — storage may be unavailable in private mode
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/* ---- Status / derived helpers --------------------------------------- */

/** Sum of all payment amounts. */
export function amountPaid(loan: Loan): number {
  let sum = 0;
  for (const p of loan.payments) sum += p.amount;
  return sum;
}

/** Outstanding balance: `max(0, amount - amountPaid)`. */
export function remainingAmount(loan: Loan): number {
  return Math.max(0, loan.amount - amountPaid(loan));
}

/** Recompute the status of a loan. Status rules:
 *  - remaining === 0 → Paid
 *  - due date has passed (compared to `today`) and remaining > 0 → Overdue
 *  - otherwise → Pending */
export function deriveStatus(loan: Loan, today: Date): Loan["status"] {
  if (remainingAmount(loan) === 0) return "Paid";
  const due = new Date(loan.dueDate);
  if (Number.isNaN(due.getTime())) return loan.status;
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
  return b < a ? "Overdue" : "Pending";
}

/* ---- Public API ------------------------------------------------------ */

type CreateLoanBody = Omit<
  Loan,
  "id" | "status" | "createdAt" | "updatedAt" | "payments" | "rescheduleHistory"
> & {
  status?: Loan["status"];
  payments?: Payment[];
  rescheduleHistory?: RescheduleEntry[];
};

type UpdateLoanBody = Partial<Omit<Loan, "id" | "createdAt">>;

export async function getLoans(): Promise<Loan[]> {
  if (API_ENABLED) return apiGet<Loan[]>("/loans");
  return readAll();
}

export async function getLoan(id: string): Promise<Loan | undefined> {
  if (API_ENABLED) {
    try {
      return await apiGet<Loan>(`/loans/${encodeURIComponent(id)}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return undefined;
      throw err;
    }
  }
  return readAll().find((l) => l.id === id);
}

export async function createLoan(input: CreateLoanBody): Promise<Loan> {
  if (API_ENABLED) return apiPost<Loan>("/loans", input);
  const all = readAll();
  const now = new Date().toISOString();
  const loan: Loan = normalizeLoan({
    ...input,
    id: `loan-${Math.random().toString(36).slice(2, 10)}`,
    status: input.status ?? "Pending",
    payments: input.payments ?? [],
    rescheduleHistory: input.rescheduleHistory ?? [],
    createdAt: now,
    updatedAt: now,
  });
  const next = [loan, ...all];
  writeAll(next);
  return loan;
}

export async function updateLoan(
  id: string,
  patch: UpdateLoanBody,
): Promise<Loan | undefined> {
  if (API_ENABLED) {
    try {
      return await apiPatch<Loan>(
        `/loans/${encodeURIComponent(id)}`,
        patch,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return undefined;
      throw err;
    }
  }
  const all = readAll();
  const idx = all.findIndex((l) => l.id === id);
  if (idx === -1) return undefined;
  const next = [...all];
  next[idx] = {
    ...all[idx],
    ...patch,
    payments: patch.payments ?? all[idx].payments,
    rescheduleHistory: patch.rescheduleHistory ?? all[idx].rescheduleHistory,
    updatedAt: new Date().toISOString(),
  };
  writeAll(next);
  return next[idx];
}

export async function deleteLoan(id: string): Promise<void> {
  if (API_ENABLED) {
    await apiDelete(`/loans/${encodeURIComponent(id)}`);
    return;
  }
  const next = readAll().filter((l) => l.id !== id);
  writeAll(next);
}

/* ---- Payment helpers ------------------------------------------------- */

function nextPaymentId(loan: Loan): string {
  return `pay-${loan.id}-${(loan.payments.length + 1).toString(36)}-${Date.now().toString(36).slice(-4)}`;
}

/** Records a payment for a loan and returns the updated loan. */
export async function addPayment(
  id: string,
  payment: Omit<Payment, "id">,
): Promise<Loan | undefined> {
  const all = readAll();
  const idx = all.findIndex((l) => l.id === id);
  if (idx === -1) return undefined;
  const loan = all[idx];
  const newPayment: Payment = { ...payment, id: nextPaymentId(loan) };
  const updated: Loan = {
    ...loan,
    payments: [...loan.payments, newPayment],
    updatedAt: new Date().toISOString(),
  };
  // If the new payment fills the loan, stamp paidAt to the payment's
  // timestamp so legacy "Paid on …" copy still works.
  if (remainingAmount(updated) === 0 && !loan.paidAt) {
    const paymentTs = newPayment.date
      ? `${newPayment.date}T10:00:00.000Z`
      : new Date().toISOString();
    updated.paidAt = paymentTs;
  }
  const next = [...all];
  next[idx] = updated;
  writeAll(next);
  return updated;
}

/** Removes a payment from a loan. */
export async function deletePayment(
  id: string,
  paymentId: string,
): Promise<Loan | undefined> {
  const all = readAll();
  const idx = all.findIndex((l) => l.id === id);
  if (idx === -1) return undefined;
  const loan = all[idx];
  const updated: Loan = {
    ...loan,
    payments: loan.payments.filter((p) => p.id !== paymentId),
    updatedAt: new Date().toISOString(),
  };
  // Clear paidAt if the loan is no longer fully paid.
  if (remainingAmount(updated) > 0 && loan.paidAt) {
    delete updated.paidAt;
  }
  const next = [...all];
  next[idx] = updated;
  writeAll(next);
  return updated;
}

/* ---- Reschedule ------------------------------------------------------ */

function nextRescheduleId(loan: Loan): string {
  return `res-${loan.id}-${(loan.rescheduleHistory.length + 1).toString(36)}-${Date.now().toString(36).slice(-4)}`;
}

/** Moves the due date, appends to the reschedule history, and
 *  returns the updated loan. */
export async function rescheduleLoan(
  id: string,
  args: { to: string; reason?: string },
): Promise<Loan | undefined> {
  const all = readAll();
  const idx = all.findIndex((l) => l.id === id);
  if (idx === -1) return undefined;
  const loan = all[idx];
  const entry: RescheduleEntry = {
    id: nextRescheduleId(loan),
    from: loan.dueDate,
    to: args.to,
    reason: args.reason,
    changedAt: new Date().toISOString(),
  };
  const updated: Loan = {
    ...loan,
    dueDate: args.to,
    rescheduleHistory: [...loan.rescheduleHistory, entry],
    updatedAt: new Date().toISOString(),
  };
  const next = [...all];
  next[idx] = updated;
  writeAll(next);
  return updated;
}

/* ---- Mark fully paid (records a synthetic final payment) ----------- */

/** Records a synthetic full payment covering the remaining amount. */
export async function markFullyPaid(id: string): Promise<Loan | undefined> {
  const all = readAll();
  const idx = all.findIndex((l) => l.id === id);
  if (idx === -1) return undefined;
  const loan = all[idx];
  if (remainingAmount(loan) === 0) return loan;
  return addPayment(loan.id, {
    amount: remainingAmount(loan),
    date: new Date().toISOString().slice(0, 10),
    method: "Other",
    note: "Marked fully paid.",
  });
}

/** Marks a loan as paid (legacy / fire-and-forget). If the loan has
 *  outstanding balance, records a synthetic full payment. */
export async function markAsPaid(id: string): Promise<Loan | undefined> {
  if (API_ENABLED) {
    try {
      return await apiPost<Loan>(`/loans/${encodeURIComponent(id)}/pay`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return undefined;
      throw err;
    }
  }
  return markFullyPaid(id);
}

/* ---- Loan remap helper (for the hook) ------------------------------- */

/** Returns a copy of every loan with the latest status derived
 *  against the supplied `today`. Used by hooks so the dashboard, list
 *  and reports can render without re-running the migration. */
export function remapStatuses(loans: Loan[], today: Date): Loan[] {
  return loans.map((l) => {
    const status = deriveStatus(l, today);
    if (status === l.status) return l;
    return { ...l, status };
  });
}

// Re-export for tests / debug.
export { safeJsonParse };
