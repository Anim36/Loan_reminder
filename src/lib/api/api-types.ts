// Wire types for the B3/B4 API.
//
// Each type is the *exact* shape returned by the matching route
// handler. Service files (and the mappers under `./mappers.ts`)
// consume these so the rest of the app never has to guess.

import type {
  LoanStatus,
  Tone,
  MessageLanguage,
  PaymentMethod,
} from "@/types/loan";

/* ---- Loans --------------------------------------------------------- */

export interface ApiFriend {
  id: string;
  name: string;
  /** E.164 (`+8801XXXXXXXXX`). Omitted when the friend has no
   *  phone on file. */
  phone?: string;
  email?: string;
}

export interface ApiPayment {
  id: string;
  /** Taka (2dp). */
  amount: number;
  /** `YYYY-MM-DD`. */
  date: string;
  method: PaymentMethod;
  note?: string;
  /** ISO timestamp. */
  createdAt: string;
}

export interface ApiRescheduleEntry {
  id: string;
  /** `YYYY-MM-DD`. */
  from: string;
  to: string;
  reason?: string;
  changedAt: string;
}

export type ReminderTiming =
  | "3_days_before"
  | "on_due_date"
  | "every_2_days_after";

export interface ApiLoan {
  id: string;
  friend: ApiFriend;
  /** Taka. */
  amount: number;
  amountPaid: number;
  remaining: number;
  status: LoanStatus;
  givenDate: string;
  dueDate: string;
  /** Negative when overdue. */
  daysRemaining: number;
  note?: string;
  smsEnabled: boolean;
  emailEnabled: boolean;
  reminderTimings: ReminderTiming[];
  tone: Tone;
  messageLanguage: MessageLanguage;
  consentConfirmed: boolean;
  paidAt?: string;
  payments: ApiPayment[];
  rescheduleHistory: ApiRescheduleEntry[];
  rescheduled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiLoanListResponse {
  data: ApiLoan[];
  meta: { page: number; pageSize: number; total: number };
}

/* ---- Friends ------------------------------------------------------ */

export interface ApiFriendListItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  loanCount: number;
  totalLent: number;
  totalRepaid: number;
  outstanding: number;
  worstStatus: LoanStatus;
}

export interface ApiFriendListResponse {
  data: ApiFriendListItem[];
  meta: { page: number; pageSize: number; total: number };
}

export interface ApiFriendTotals {
  loanCount: number;
  totalLent: number;
  totalRepaid: number;
  outstanding: number;
  worstStatus: LoanStatus;
}

export interface ApiReminderLogEntry {
  id: string;
  loanId: string;
  friendName: string;
  amount: number;
  channel: "SMS" | "Email";
  scheduledFor: string;
  sentAt: string | null;
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED" | "SKIPPED";
  error: string | null;
}

export interface ApiFriendDetail {
  friend: { id: string; name: string; phone: string | null; email: string | null };
  totals: ApiFriendTotals;
  loans: ApiLoan[];
  reminderHistory: ApiReminderLogEntry[];
}

/* ---- Notifications ------------------------------------------------- */

export type ApiNotificationType =
  | "loan-created"
  | "loan-paid"
  | "reminder-sent"
  | "due-soon"
  | "overdue"
  | "payment-recorded"
  | "due-date-updated";

export type ApiNotificationTitleKey =
  | "notif.paid"
  | "notif.overdue"
  | "notif.reminderSent"
  | "notif.dueSoon"
  | "notif.loanCreated"
  | "notif.payment"
  | "notif.paymentFully"
  | "notif.dueDateUpdated";

export interface ApiNotification {
  id: string;
  type: ApiNotificationType;
  titleKey: ApiNotificationTitleKey;
  params: Record<string, unknown> | null;
  loanId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface ApiNotificationListResponse {
  data: ApiNotification[];
  meta: { page: number; pageSize: number; total: number };
}

export interface ApiUnreadCount {
  count: number;
}

/* ---- Dashboard summary ------------------------------------------- */

export interface ApiDashboardSummary {
  totals: {
    totalLent: number;
    totalReceived: number;
    pending: number;
    overdue: number;
    counts: Record<LoanStatus, number>;
  };
  recentLoans: ApiLoan[];
  upcomingDue: ApiLoan[];
}

export type ApiDashboardLoan = ApiLoan;

/* ---- Reminder history -------------------------------------------- */

export interface ApiReminderHistoryItem {
  id: string;
  loanId: string;
  friendName: string;
  friendPhone: string | null;
  amount: number;
  channel: "SMS" | "Email";
  scheduledFor: string;
  sentAt: string | null;
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED" | "SKIPPED";
  error: string | null;
}

export interface ApiReminderHistoryResponse {
  data: ApiReminderHistoryItem[];
  meta: { page: number; pageSize: number; total: number };
  stats: { total: number; delivered: number; failed: number };
}

/* ---- Reminder settings ------------------------------------------- */

export interface ApiReminderSettings {
  defaultTone: Tone;
  defaultTimings: unknown;
  smsEnabled: boolean;
  emailEnabled: boolean;
  messageLanguage: MessageLanguage;
  templates: Record<
    Tone,
    Record<MessageLanguage, { sms: string; emailSubject: string; emailBody: string }>
  >;
}

/* ---- Reports ------------------------------------------------------ */

export interface ApiReports {
  range: "3m" | "6m" | "12m" | "all";
  startDate: string | null;
  /**
   * Optional top-level totals. The current
   * `/api/reports` route returns the aggregates inside
   * `summary` instead, so this block is optional and the
   * `mapReports` mapper reads from whichever shape is
   * present.
   */
  totals?: {
    totalLent: number;
    totalReceived: number;
    outstanding: number;
  };
  summary: {
    // The current server shape puts the aggregates inside
    // `summary` (not in a separate `totals` block). They are
    // optional so the mapper can fall back to `totals`.
    totalLent?: number;
    totalReceived?: number;
    outstanding?: number;
    onTimeRate: number; // 0..1
    counts: Record<LoanStatus, number>;
  };
  statusBreakdown: Record<LoanStatus, number>;
  monthly: Array<{ key: string; label: string; lent: number; received: number }>;
  topBorrowers: Array<{
    friendId: string;
    name: string;
    outstanding: number;
    loans: number;
  }>;
  friendReliability: Array<{
    friendId: string;
    name: string;
    loanCount: number;
    onTimeCount: number;
    onTimeRate: number; // 0..1
    label: "always_on_time" | "sometimes_late" | "often_late" | "insufficient_data";
  }>;
  averageDaysToRepay: number | null;
  upcomingDueThisWeek: Array<{
    loanId: string;
    friendId: string;
    friendName: string;
    amount: number;
    remaining: number;
    dueDate: string;
    daysRemaining: number;
  }>;
}

/* ---- Profile / preferences --------------------------------------- */

export interface ApiProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  image: string | null;
}

export interface ApiPreferences {
  language: "en" | "bn";
  theme: "light" | "dark" | "system";
  banglaNumerals: boolean;
  notifications: {
    emailOnPaid: boolean;
    emailOnOverdue: boolean;
    weeklySummary: boolean;
  };
}
