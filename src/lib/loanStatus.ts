// Loan status derivation.
//
// `status` is **never** stored in the database. The server derives it
// from `Loan.dueDate` and the sum of its `Payment` rows on every read.
// This file is the single source of truth for those rules — the
// frontend's `deriveStatus` must stay byte-identical so the UI and
// the API agree on what a loan looks like.

import type { Loan, LoanStatus, Payment, RescheduleEntry } from "@/types/loan";

/** Sum of all payment amounts in poisha. */
export function amountPaidPoisha(payments: Payment[]): number {
  let sum = 0;
  for (const p of payments) sum += p.amount;
  return sum;
}

/** Outstanding balance in poisha: `max(0, amount - amountPaid)`. */
export function remainingPoisha(
  loan: Pick<Loan, "amount">,
  payments: Payment[],
): number {
  return Math.max(0, loan.amount - amountPaidPoisha(payments));
}

/**
 * Compute the status of a loan.
 *
 *  - `remaining === 0`  → "Paid"
 *  - `dueDate < today` (date-only comparison, UTC) and `remaining > 0`
 *    → "Overdue"
 *  - otherwise → "Pending"
 */
export function deriveStatus(
  loan: Pick<Loan, "amount" | "dueDate">,
  payments: Payment[],
  today: Date,
): LoanStatus {
  if (remainingPoisha(loan, payments) === 0) return "Paid";
  const due = new Date(loan.dueDate);
  if (Number.isNaN(due.getTime())) return "Pending";
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
  return b < a ? "Overdue" : "Pending";
}

/** Strip the time component of a date in the Asia/Dhaka timezone. */
export function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Re-export the typed payment / reschedule types so callers don't have
// to know where they came from.
export type { Payment, RescheduleEntry };
