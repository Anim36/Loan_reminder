// Domain types for the Loan Reminder app.
//
// Kept dependency-free (no runtime zod usage) so these can be imported
// from both server and client components without bundling issues.

export type LoanStatus = "Paid" | "Pending" | "Overdue";

export type Tone = "Friendly" | "Neutral" | "Firm";
export type ReminderChannel = "SMS" | "Email";

/** Language used for reminder messages. Separate from the UI language:
 *  a user can read the app in English but send Bangla reminders, and
 *  vice versa. */
export type MessageLanguage = "en" | "bn";

export type PaymentMethod = "Cash" | "bKash" | "Nagad" | "Bank" | "Other";

export interface Payment {
  id: string;
  /** Amount in BDT. */
  amount: number;
  /** ISO date string (YYYY-MM-DD) for when the payment was made. */
  date: string;
  method: PaymentMethod;
  /** Optional note (e.g. "settled in two parts"). */
  note?: string;
}

export interface RescheduleEntry {
  id: string;
  /** ISO date the loan was previously due. */
  from: string;
  /** ISO date the loan is now due. */
  to: string;
  reason?: string;
  /** ISO timestamp. */
  changedAt: string;
}

export interface Friend {
  /** Stable unique id (slug of the friend's display name). */
  id: string;
  name: string;
  /** Bangladeshi phone number; the "+880" prefix is implied and never stored. */
  phone?: string;
  /** Optional email address. */
  email?: string;
  /** Optional avatar tone override; if omitted the avatar component
   *  derives a stable color from the name. */
  avatarTone?: string;
}

export interface Loan {
  /** Stable unique id (e.g. "loan-rafi-2026-09-20"). */
  id: string;
  /** Friend this loan is associated with. */
  friend: Friend;
  /** Principal amount in BDT (৳). */
  amount: number;
  /** ISO date string (YYYY-MM-DD) for when the money was lent out. */
  dateGiven: string;
  /** ISO date string (YYYY-MM-DD) for when repayment is expected. */
  dueDate: string;
  /** Reminder tone preference. */
  tone: Tone;
  /** Reminder channels enabled for this loan. */
  reminders: { sms: boolean; email: boolean };
  /** Optional free-form private note (only visible to the lender). */
  note?: string;
  /** Whether the lender will tell the friend they may receive reminders. */
  consent: boolean;
  /** Per-loan override for the message language. Falls back to the
   *  global `reminderSettings.messageLanguage` when unset. */
  messageLanguage?: MessageLanguage;
  /** Cached status; the loan service recomputes it on load so the
   *  value here is treated as a hint. */
  status: LoanStatus;
  /** ISO timestamp of when the loan was marked paid, if applicable.
   *  For loans paid through multiple payments, this is the timestamp
   *  of the payment that closed out the loan. */
  paidAt?: string;
  /** All payments recorded for this loan, in any order. The service
   *  derives `amountPaid` and `remaining` from this list. */
  payments: Payment[];
  /** Reschedule history. Empty for loans that have never been moved. */
  rescheduleHistory: RescheduleEntry[];
  /** ISO timestamp of when the loan was created. */
  createdAt: string;
  /** ISO timestamp of the last update. */
  updatedAt: string;
}

export interface Reminder {
  id: string;
  loanId: string;
  /** When the reminder was scheduled to be sent. */
  scheduledFor: string;
  /** When the reminder was actually delivered. */
  sentAt?: string;
  /** Tone: Friendly / Neutral / Firm. */
  tone: Tone;
  /** Delivery channel used. */
  channel: ReminderChannel;
  status: "Scheduled" | "Sent" | "Failed";
}
