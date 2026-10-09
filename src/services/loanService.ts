// Loans service — B3/B4 API-backed.
//
// All public functions return the *UI-domain* shapes the pages
// already expect (the localStorage `Loan` type from
// `@/types/loan.ts`). The wire ↔ UI mapping happens in
// `@/lib/api/mappers.ts` so a single edit there propagates to
// every page.
//
// The function names are kept identical to the localStorage
// version so the call sites in the pages don't need to change.

import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { Loan, Payment, RescheduleEntry, PaymentMethod } from "@/types/loan";
import type { ApiLoan, ApiLoanListResponse } from "@/lib/api/api-types";
import { mapApiLoan } from "@/lib/api/mappers";

/* ---- Listing / detail --------------------------------------------- */

export interface LoanListFilters {
  status?: "Paid" | "Pending" | "Overdue" | undefined;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface LoanListResult {
  loans: Loan[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getLoans(filters: LoanListFilters = {}): Promise<Loan[]> {
  const res = await getLoansPaged(filters);
  return res.loans;
}

export async function getLoansPaged(
  filters: LoanListFilters = {},
): Promise<LoanListResult> {
  const query: Record<string, string | number> = {};
  if (filters.status) query.status = filters.status;
  if (filters.q) query.q = filters.q;
  if (filters.from) query.from = filters.from;
  if (filters.to) query.to = filters.to;
  if (filters.page) query.page = filters.page;
  if (filters.pageSize) query.pageSize = filters.pageSize;
  // api-client returns the full envelope `{ data, meta }` for list
  // endpoints. We read `.data` (the array) and `.meta` (page info)
  // exactly once.
  const res = await apiGet<ApiLoanListResponse>("/loans", { query });
  if (!res || !Array.isArray(res.data)) {
    throw new ApiError("Invalid loans list response", 500, null);
  }
  return {
    loans: res.data.map(mapApiLoan),
    total: res.meta.total,
    page: res.meta.page,
    pageSize: res.meta.pageSize,
  };
}

export async function getLoan(id: string): Promise<Loan | undefined> {
  try {
    // api-client returns the full envelope `{ data: ApiLoan }` for
    // single-resource endpoints. We read `.data` exactly once.
    const res = await apiGet<{ data: ApiLoan }>(`/loans/${encodeURIComponent(id)}`);
    return mapApiLoan(res.data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

/* ---- Create / update / delete ------------------------------------ */

export interface CreateLoanBody {
  friend: { name: string; phone: string; email?: string };
  amount: number;
  dateGiven: string;
  dueDate: string;
  tone: Loan["tone"];
  reminders: { sms: boolean; email: boolean };
  note?: string;
  consent: boolean;
  messageLanguage?: "en" | "bn";
}

export async function createLoan(input: CreateLoanBody): Promise<Loan> {
  // The server is the source of truth for the friend id (it
  // re-uses by phone, creates a new row otherwise) so we don't
  // pre-compute an id here.
  const defaultTimings: ("3_days_before" | "on_due_date" | "every_2_days_after")[] =
    input.reminders.sms ? ["3_days_before", "on_due_date"] : [];
  const body = {
    friend: {
      name: input.friend.name,
      phone: input.friend.phone,
      ...(input.friend.email ? { email: input.friend.email } : {}),
    },
    amount: input.amount,
    givenDate: input.dateGiven,
    dueDate: input.dueDate,
    note: input.note,
    smsEnabled: input.reminders.sms,
    emailEnabled: input.reminders.email,
    reminderTimings: defaultTimings,
    tone: input.tone,
    messageLanguage: input.messageLanguage ?? "en",
    consentConfirmed: input.consent,
  };
  const res = await apiPost<{ data: ApiLoan }>("/loans", body);
  return mapApiLoan(res.data);
}

export type UpdateLoanBody = Partial<CreateLoanBody>;

export async function updateLoan(
  id: string,
  patch: UpdateLoanBody,
): Promise<Loan | undefined> {
  const body: Record<string, unknown> = {};
  if (patch.friend) {
    body.friend = {
      name: patch.friend.name,
      phone: patch.friend.phone,
      ...(patch.friend.email ? { email: patch.friend.email } : {}),
    };
  }
  if (patch.amount !== undefined) body.amount = patch.amount;
  if (patch.dateGiven !== undefined) body.givenDate = patch.dateGiven;
  if (patch.dueDate !== undefined) body.dueDate = patch.dueDate;
  if (patch.tone !== undefined) body.tone = patch.tone;
  if (patch.reminders !== undefined) {
    body.smsEnabled = patch.reminders.sms;
    body.emailEnabled = patch.reminders.email;
    body.reminderTimings = patch.reminders.sms
      ? ["3_days_before", "on_due_date"]
      : [];
  }
  if (patch.note !== undefined) body.note = patch.note;
  if (patch.consent !== undefined) body.consentConfirmed = patch.consent;
  if (patch.messageLanguage !== undefined) {
    body.messageLanguage = patch.messageLanguage;
  }
  try {
    const res = await apiPatch<{ data: ApiLoan }>(
      `/loans/${encodeURIComponent(id)}`,
      body,
    );
    return mapApiLoan(res.data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

export async function deleteLoan(id: string): Promise<void> {
  await apiDelete(`/loans/${encodeURIComponent(id)}`);
}

export async function restoreLoan(id: string): Promise<Loan | undefined> {
  try {
    const res = await apiPost<{ data: ApiLoan }>(
      `/loans/${encodeURIComponent(id)}/restore`,
    );
    return mapApiLoan(res.data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

/* ---- Payments ----------------------------------------------------- */

export async function addPayment(
  loanId: string,
  payment: {
    amount: number;
    date: string;
    method: PaymentMethod;
    note?: string;
  },
): Promise<Loan | undefined> {
  try {
    const res = await apiPost<{ data: ApiLoan }>(
      `/loans/${encodeURIComponent(loanId)}/payments`,
      payment,
    );
    return mapApiLoan(res.data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

export async function deletePayment(
  loanId: string,
  paymentId: string,
): Promise<Loan | undefined> {
  try {
    const res = await apiDelete<{ data: ApiLoan }>(
      `/loans/${encodeURIComponent(loanId)}/payments/${encodeURIComponent(paymentId)}`,
    );
    return mapApiLoan(res.data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

export async function markFullyPaid(loanId: string): Promise<Loan | undefined> {
  try {
    const res = await apiPost<{ data: ApiLoan }>(
      `/loans/${encodeURIComponent(loanId)}/pay-in-full`,
    );
    return mapApiLoan(res.data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

/** Backwards-compatible alias — the localStorage version used to
 *  hit a route that no longer exists. The B4 endpoint is
 *  `pay-in-full`. */
export async function markAsPaid(loanId: string): Promise<Loan | undefined> {
  return markFullyPaid(loanId);
}

/* ---- Reschedule / remind ---------------------------------------- */

export async function rescheduleLoan(
  id: string,
  args: { to: string; reason?: string },
): Promise<Loan | undefined> {
  try {
    const res = await apiPost<{ data: ApiLoan }>(
      `/loans/${encodeURIComponent(id)}/reschedule`,
      args,
    );
    return mapApiLoan(res.data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

export interface RemindResult {
  queuedLogIds: string[];
  /** True when the call resulted in at least one QUEUED log. */
  delivered: boolean;
}

export async function sendReminderNow(id: string): Promise<RemindResult> {
  // The remind route returns the small envelope
  // `{ data: { queuedLogIds, delivered } }` (we wrap it in `data`
  // server-side to keep the response shape consistent with every
  // other B4 route). The api-client returns the raw body; we
  // read `.data` exactly once.
  const res = await apiPost<{ data: RemindResult }>(
    `/loans/${encodeURIComponent(id)}/remind`,
  );
  if (res && res.data) return res.data;
  // Defensive: an empty / non-envelope body would be a server bug.
  return { queuedLogIds: [], delivered: false };
}

/* ---- Pure helpers (server-friendly) ------------------------------ */

/** Sum of payment amounts on a loan. Pure. */
export function amountPaid(loan: Loan): number {
  const fromDto = (loan as Loan & { amountPaid?: number }).amountPaid;
  if (typeof fromDto === "number") return fromDto;
  return loan.payments.reduce((s, p) => s + p.amount, 0);
}

/** Outstanding balance: `max(0, amount - amountPaid)`. Pure. */
export function remainingAmount(loan: Loan): number {
  const fromDto = (loan as Loan & { remaining?: number }).remaining;
  if (typeof fromDto === "number") return fromDto;
  return Math.max(0, loan.amount - amountPaid(loan));
}

/** Server-derived status with a client fallback for old data
 *  without a `status` field. Pure. */
export function deriveStatus(loan: Loan, today: Date): Loan["status"] {
  const fromDto = (loan as Loan & { status?: Loan["status"] }).status;
  if (fromDto) return fromDto;
  if (remainingAmount(loan) === 0) return "Paid";
  const due = new Date(loan.dueDate);
  if (Number.isNaN(due.getTime())) return "Pending";
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
  return b < a ? "Overdue" : "Pending";
}

/** Recompute `status` on every loan using `today`. The list
 *  page uses this so a re-render that only changes `today`
 *  produces a fresh list with the new statuses already baked in. */
export function remapStatuses(loans: Loan[], today: Date): Loan[] {
  return loans.map((l) => {
    const next = deriveStatus(l, today);
    if (next === l.status) return l;
    return { ...l, status: next };
  });
}

/* ---- Re-exports (for test parity) -------------------------------- */

export type { ApiLoan };
export type { Payment, RescheduleEntry };
