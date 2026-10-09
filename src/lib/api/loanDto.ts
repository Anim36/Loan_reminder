// Loan DTO — converts Prisma rows into the API response shape.
//
// This is a deliberately *separate* type from `@/types/loan.ts`'s
// `Loan` (which is what the localStorage fallback uses). The API
// response shape is fixed by the B4 spec:
//
//   id, friend{id,name,phone,email}, amount, amountPaid, remaining,
//   status, givenDate, dueDate, daysRemaining, note, smsEnabled,
//   emailEnabled, reminderTimings, tone, messageLanguage,
//   consentConfirmed, payments[], rescheduleHistory[], rescheduled,
//   createdAt
//
// When the frontend is wired to the API in B5, that code does the
// shape mapping. Until then, this DTO is the only place the API
// shape is defined.
//
// All date fields are surfaced as `"YYYY-MM-DD"` strings;
// timestamps as ISO-8601 strings. Money is taka (number, 2 dp).
//
// `status`, `amountPaid` and `remaining` are derived on the server
// at the boundary — never read from the database.

import { roundTaka } from "@/lib/money";
import { deriveStatus, remainingPoisha, amountPaidPoisha } from "@/lib/loanStatus";
import { formatDateOnly, todayInDhaka } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import type {
  LoanStatus,
  PaymentMethod,
  MessageLanguage,
  Tone,
} from "@/types/loan";

/** A single reminder-timing flag. */
export type ReminderTiming = "3_days_before" | "on_due_date" | "every_2_days_after";

/** Friend object on the wire. */
export interface ApiFriend {
  id: string;
  name: string;
  /** E.164 (`+8801XXXXXXXXX`). Omitted when the friend has no
   *  phone on file. */
  phone?: string;
  email?: string;
}

/** Payment object on the wire. */
export interface ApiPayment {
  id: string;
  amount: number; // taka
  date: string; // YYYY-MM-DD
  method: PaymentMethod;
  note?: string;
  createdAt: string; // ISO
}

/** Reschedule entry on the wire. */
export interface ApiRescheduleEntry {
  id: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  reason?: string;
  changedAt: string; // ISO
}

/** The API loan response shape. */
export interface ApiLoan {
  id: string;
  friend: ApiFriend;
  amount: number; // taka
  amountPaid: number; // taka
  remaining: number; // taka
  status: LoanStatus;
  givenDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  /** Negative when overdue. */
  daysRemaining: number;
  note?: string;
  smsEnabled: boolean;
  emailEnabled: boolean;
  reminderTimings: ReminderTiming[];
  tone: Tone;
  messageLanguage: MessageLanguage;
  consentConfirmed: boolean;
  paidAt?: string; // ISO
  payments: ApiPayment[];
  rescheduleHistory: ApiRescheduleEntry[];
  rescheduled: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

/** A loose Prisma loan row. The mapper only touches fields that
 *  are selected, so unused optional fields are fine. */
export interface PrismaLoanForDto {
  id: string;
  amount: number;
  givenDate: Date;
  dueDate: Date;
  note: string | null;
  smsEnabled: boolean;
  emailEnabled: boolean;
  reminderTimings: unknown;
  tone: string;
  messageLanguage: string;
  consentConfirmed: boolean;
  paidAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  friend: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  };
  payments: Array<{
    id: string;
    amount: number;
    date: Date;
    method: string;
    note: string | null;
    createdAt: Date;
  }>;
  rescheduleEntries: Array<{
    id: string;
    fromDate: Date;
    toDate: Date;
    reason: string | null;
    notifyFriend: boolean;
    changedAt: Date;
  }>;
}

const REMINDER_TIMINGS: readonly ReminderTiming[] = [
  "3_days_before",
  "on_due_date",
  "every_2_days_after",
];

const TONES = ["Friendly", "Neutral", "Firm"] as const;
const PAYMENT_METHODS = ["Cash", "bKash", "Nagad", "Bank", "Other"] as const;
const MESSAGE_LANGS = ["en", "bn"] as const;

function asTone(v: string): Tone {
  return (TONES as readonly string[]).includes(v) ? (v as Tone) : "Friendly";
}
function asMethod(v: string): PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(v)
    ? (v as PaymentMethod)
    : "Other";
}
function asMessageLanguage(v: string): MessageLanguage {
  return (MESSAGE_LANGS as readonly string[]).includes(v) ? (v as MessageLanguage) : "en";
}

/** Decode the `reminderTimings` JSON blob. We accept:
 *   - `{ list: ReminderTiming[] }`  (canonical)
 *   - a bare array                  (legacy)
 *   - anything else                 → []
 */
function decodeReminderTimings(raw: unknown): ReminderTiming[] {
  let list: unknown;
  if (Array.isArray(raw)) list = raw;
  else if (raw && typeof raw === "object") list = (raw as { list?: unknown }).list;
  if (!Array.isArray(list)) return [];
  return list.filter((t): t is ReminderTiming =>
    typeof t === "string" && (REMINDER_TIMINGS as readonly string[]).includes(t),
  );
}

/** Map a Prisma row to the API DTO. `today` is
 *  Asia/Dhaka-today; pass `null` to use the default. */
export function toLoanDto(
  row: PrismaLoanForDto,
  today: Date = todayInDhaka(),
): ApiLoan {
  // Re-derive the payment records with poisha amounts to keep the
  // derivation helpers happy. We hand them the canonical
  // "YYYY-MM-DD" string for `date` (matching the existing
  // `Loan` type) so `deriveStatus` / `amountPaidPoisha` accept
  // the values.
  const paymentsForDerive = row.payments.map((p) => ({
    id: p.id,
    amount: p.amount,
    date: formatDateOnly(p.date),
    method: asMethod(p.method),
    note: p.note ?? undefined,
  }));

  const status: LoanStatus = deriveStatus(
    { amount: row.amount, dueDate: formatDateOnly(row.dueDate) },
    paymentsForDerive,
    today,
  );
  const amountPaid = roundTaka(amountPaidPoisha(paymentsForDerive));
  const remaining = roundTaka(remainingPoisha({ amount: row.amount }, paymentsForDerive));

  const payments: ApiPayment[] = row.payments.map((p) => ({
    id: p.id,
    amount: roundTaka(p.amount),
    date: formatDateOnly(p.date),
    method: asMethod(p.method),
    note: p.note ?? undefined,
    createdAt: p.createdAt.toISOString(),
  }));

  const rescheduleHistory: ApiRescheduleEntry[] = row.rescheduleEntries.map((r) => ({
    id: r.id,
    from: formatDateOnly(r.fromDate),
    to: formatDateOnly(r.toDate),
    reason: r.reason ?? undefined,
    changedAt: r.changedAt.toISOString(),
  }));

  const friend: ApiFriend = {
    id: row.friend.id,
    name: row.friend.name,
    phone: row.friend.phone ? formatPhone(row.friend.phone, "e164") : undefined,
    email: row.friend.email ?? undefined,
  };

  // `daysRemaining` is negative when the loan is overdue.
  const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const dueStart = new Date(Date.UTC(row.dueDate.getUTCFullYear(), row.dueDate.getUTCMonth(), row.dueDate.getUTCDate()));
  const daysRemaining = Math.round((dueStart.getTime() - todayStart.getTime()) / 86_400_000);

  return {
    id: row.id,
    friend,
    amount: roundTaka(row.amount),
    amountPaid,
    remaining,
    status,
    givenDate: formatDateOnly(row.givenDate),
    dueDate: formatDateOnly(row.dueDate),
    daysRemaining,
    note: row.note ?? undefined,
    smsEnabled: row.smsEnabled,
    emailEnabled: row.emailEnabled,
    reminderTimings: decodeReminderTimings(row.reminderTimings),
    tone: asTone(row.tone),
    messageLanguage: asMessageLanguage(row.messageLanguage),
    consentConfirmed: row.consentConfirmed,
    paidAt: row.paidAt ? row.paidAt.toISOString() : undefined,
    payments,
    rescheduleHistory,
    rescheduled: rescheduleHistory.length > 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Re-export the helpers other DTOs may need. */
export { amountPaidPoisha, remainingPoisha };

