// Mappers between the API DTO shapes and the UI domain types.
//
// The server returns stable, wire-friendly shapes (ApiLoan,
// ApiFriend, etc.). The UI was written against the localStorage
// `Loan`/`Friend` types (dateGiven vs givenDate, reminders.sms
// vs smsEnabled, etc.). These adapters bridge the two in one
// place so individual pages don't have to.
//
// The mappers are pure, deterministic, and unit-tested.

import type { Friend, Loan, Payment, RescheduleEntry } from "@/types/loan";
import type {
  ApiLoan,
  ApiPayment,
  ApiRescheduleEntry,
  ApiFriend,
  ApiNotification,
  ApiDashboardSummary,
  ApiDashboardLoan,
  ApiReports,
  ApiFriendListItem,
  ApiFriendDetail,
  ApiReminderHistoryItem,
  ApiReminderLogEntry,
  ApiReminderSettings,
  ApiProfile,
  ApiPreferences,
  ApiUnreadCount,
} from "./api-types";

/* ---- Loan ----------------------------------------------------------- */

function mapFriend(f: ApiFriend | undefined): Friend {
  if (!f) {
    return { id: "unknown", name: "Friend" };
  }
  // The wire `phone` is E.164 (`+8801XXXXXXXXX`). The UI's localStorage
  // friend used a BD-body (no prefix); the rest of the app already
  // renders `+880 ${phone}` for display, so storing the E.164 and
  // stripping the prefix at render time is fine. We strip it here so
  // the UI's `+880 ${phone}` display keeps working.
  const phone = f.phone?.startsWith("+880")
    ? f.phone.slice(4).replace(/^-+/, "")
    : f.phone ?? undefined;
  return {
    id: f.id,
    name: f.name,
    phone,
    email: f.email ?? undefined,
  };
}

function mapPayment(p: ApiPayment): Payment {
  return {
    id: p.id,
    amount: p.amount,
    date: p.date,
    method: p.method,
    note: p.note,
  };
}

function mapReschedule(r: ApiRescheduleEntry): RescheduleEntry {
  return {
    id: r.id,
    from: r.from,
    to: r.to,
    reason: r.reason,
    changedAt: r.changedAt,
  };
}

/** Map an API loan DTO to the UI's `Loan` shape. Throws a
 *  `MalformedLoanError` when the response is missing the fields a
 *  `Loan` needs (`id`, `givenDate`, `dueDate`, `payments`, …) so
 *  that consumers fail loudly instead of crashing with
 *  "Cannot read properties of undefined (reading 'id')" later in
 *  the page. */
export function mapApiLoan(dto: ApiLoan | null | undefined): Loan {
  if (!dto || typeof dto !== "object" || typeof (dto as { id?: unknown }).id !== "string" || !(dto as { id: string }).id) {
    throw new MalformedLoanError(
      "mapApiLoan: response is missing a loan id",
      dto ?? null,
    );
  }
  const safe = dto as ApiLoan;
  return {
    id: safe.id,
    friend: mapFriend(safe.friend),
    amount: safe.amount,
    dateGiven: safe.givenDate,
    dueDate: safe.dueDate,
    tone: safe.tone,
    reminders: { sms: safe.smsEnabled, email: safe.emailEnabled },
    note: safe.note,
    consent: safe.consentConfirmed,
    messageLanguage: safe.messageLanguage,
    status: safe.status,
    paidAt: safe.paidAt,
    payments: (safe.payments ?? []).map(mapPayment),
    rescheduleHistory: (safe.rescheduleHistory ?? []).map(mapReschedule),
    createdAt: safe.createdAt,
    updatedAt: safe.updatedAt,
    // The server-derived fields on the DTO mirror what the localStorage
    // helpers used to compute. We re-expose them as `amountPaid` /
    // `remaining` so the UI doesn't have to re-derive on every render.
    amountPaid: safe.amountPaid,
    remaining: safe.remaining,
    // `daysRemaining` only exists on the wire; expose it so list pages
    // can sort without re-deriving against `useToday()`.
    daysRemaining: safe.daysRemaining,
  } as Loan & {
    amountPaid: number;
    remaining: number;
    daysRemaining: number;
  };
}

/** Thrown by `mapApiLoan` when the server response is missing the
 *  fields the UI needs. Carries the original payload for the
 *  server log; never include the payload in user-facing copy. */
export class MalformedLoanError extends Error {
  readonly payload: unknown;
  constructor(message: string, payload: unknown) {
    super(message);
    this.name = "MalformedLoanError";
    this.payload = payload;
  }
}

/** Map a list page DTO (lighter) to a UI `Loan`. */
export function mapApiDashboardLoan(dto: ApiDashboardLoan): Loan {
  return mapApiLoan(dto as unknown as ApiLoan);
}

/* ---- Friend list / detail ------------------------------------------ */

export interface FriendListRow {
  friend: Friend;
  loanCount: number;
  totalLent: number;
  totalRepaid: number;
  outstanding: number;
  worstStatus: Loan["status"];
}

export function mapFriendListItem(dto: ApiFriendListItem): FriendListRow {
  return {
    friend: mapFriend({
      id: dto.id,
      name: dto.name,
      phone: dto.phone ?? undefined,
      email: dto.email ?? undefined,
    }),
    loanCount: dto.loanCount,
    totalLent: dto.totalLent,
    totalRepaid: dto.totalRepaid,
    outstanding: dto.outstanding,
    worstStatus: dto.worstStatus,
  };
}

export interface FriendDetailMapped {
  friend: Friend;
  totals: {
    loanCount: number;
    totalLent: number;
    totalRepaid: number;
    outstanding: number;
    worstStatus: Loan["status"];
  };
  loans: Loan[];
  reminderHistory: ReminderHistoryItem[];
}

export function mapFriendDetail(dto: ApiFriendDetail): FriendDetailMapped {
  return {
    friend: mapFriend({
      id: dto.friend.id,
      name: dto.friend.name,
      phone: dto.friend.phone ?? undefined,
      email: dto.friend.email ?? undefined,
    }),
    totals: {
      loanCount: dto.totals.loanCount,
      totalLent: dto.totals.totalLent,
      totalRepaid: dto.totals.totalRepaid,
      outstanding: dto.totals.outstanding,
      worstStatus: dto.totals.worstStatus,
    },
    loans: dto.loans.map(mapApiLoan),
    reminderHistory: dto.reminderHistory.map(mapReminderHistoryItem),
  };
}

/* ---- Notifications -------------------------------------------------- */

type NotificationKind =
  | "loan-created"
  | "loan-paid"
  | "reminder-sent"
  | "due-soon"
  | "overdue"
  | "payment-recorded"
  | "due-date-updated";

type NotificationMessageKey =
  | "notif.paid"
  | "notif.overdue"
  | "notif.reminderSent"
  | "notif.dueSoon"
  | "notif.loanCreated"
  | "notif.payment"
  | "notif.paymentFully"
  | "notif.dueDateUpdated";

export interface Notification {
  id: string;
  createdAt: string;
  kind: NotificationKind;
  title: string;
  description: string;
  href: string;
  loanId?: string;
  unread: boolean;
  messageKey?: NotificationMessageKey;
  messageParams?: unknown[];
}

export type { NotificationKind, NotificationMessageKey };

/** Map a single API notification row to the UI's shape. The wire
 *  shape gives us `titleKey` / `params` (and the loan id when
 *  present); we render `title` / `description` here as a
 *  dictionary-key-only stub so `translateNotification` can take
 *  over at render time. */
export function mapApiNotification(dto: ApiNotification): Notification {
  const messageKey = (dto.titleKey ?? undefined) as
    | NotificationMessageKey
    | undefined;
  return {
    id: dto.id,
    createdAt: dto.createdAt,
    kind: (dto.type ?? "loan-created") as Notification["kind"],
    title: dto.titleKey ?? "Notification",
    description: "",
    href: dto.loanId ? `/loans/${dto.loanId}` : "/notifications",
    loanId: dto.loanId ?? undefined,
    // Wire field: `readAt` is null while unread.
    unread: dto.readAt === null,
    messageKey,
    messageParams: dto.params ? Object.values(dto.params) : undefined,
  };
}

export function mapUnreadCount(dto: ApiUnreadCount): number {
  return dto.count;
}

/* ---- Dashboard summary -------------------------------------------- */

export interface DashboardSummaryMapped {
  totals: {
    totalLent: number;
    totalReceived: number;
    pending: number;
    overdue: number;
    counts: Record<Loan["status"], number>;
  };
  recentLoans: Loan[];
  upcomingDue: Loan[];
}

export function mapDashboardSummary(
  dto: ApiDashboardSummary,
): DashboardSummaryMapped {
  return {
    totals: {
      totalLent: dto.totals.totalLent,
      totalReceived: dto.totals.totalReceived,
      pending: dto.totals.pending,
      overdue: dto.totals.overdue,
      counts: {
        Paid: dto.totals.counts.Paid,
        Pending: dto.totals.counts.Pending,
        Overdue: dto.totals.counts.Overdue,
      },
    },
    recentLoans: dto.recentLoans.map(mapApiLoan),
    upcomingDue: dto.upcomingDue.map(mapApiLoan),
  };
}

/* ---- Reminder history --------------------------------------------- */

export interface ReminderHistoryItem {
  id: string;
  loanId: string;
  channel: "SMS" | "Email";
  sentAt: string;
  tone: import("@/types/loan").Tone;
  status: "Delivered" | "Failed";
  friendName: string;
  amount: number;
  scheduledFor: string;
  error: string | null;
}

export function mapReminderHistoryItem(
  dto: ApiReminderHistoryItem | ApiReminderLogEntry,
): ReminderHistoryItem {
  // The wire `status` is one of QUEUED/SENT/DELIVERED/FAILED/SKIPPED.
  // The UI's localStorage history used "Delivered" | "Failed"; we
  // squash SENT + DELIVERED into Delivered and FAILED into Failed.
  const status: "Delivered" | "Failed" =
    dto.status === "FAILED" ? "Failed" : "Delivered";
  // `tone` is not on the wire; we default to "Friendly" so the
  // `ui.method.tone.*` lookup never breaks. The history page
  // doesn't read `tone` today; this is future-proofing.
  return {
    id: dto.id,
    loanId: dto.loanId,
    channel: dto.channel,
    sentAt: dto.sentAt ?? dto.scheduledFor,
    tone: "Friendly",
    status,
    friendName: dto.friendName,
    amount: dto.amount,
    scheduledFor: dto.scheduledFor,
    error: dto.error,
  };
}

export interface ReminderHistoryResponse {
  items: ReminderHistoryItem[];
  stats: { total: number; delivered: number; failed: number };
  total: number;
  page: number;
  pageSize: number;
}

/* ---- Reports ------------------------------------------------------- */

export interface ReportsMapped {
  range: "3m" | "6m" | "12m" | "all";
  startDate: string | null;
  totalLent: number;
  totalReceived: number;
  outstanding: number;
  onTimeRate: number; // 0..100 (server already rounds)
  statusBreakdown: Record<Loan["status"], number>;
  monthly: Array<{ key: string; label: string; lent: number; received: number }>;
  topBorrowers: Array<{
    friendId: string;
    friendName: string;
    outstanding: number;
    loans: number;
  }>;
  reliability: Array<{
    friendId: string;
    friendName: string;
    avgDaysLate: number;
    loans: number;
    bucket: "always" | "sometimes" | "often";
  }>;
  avgRepayDays: number | null;
  upcoming: Array<{
    loanId: string;
    friendName: string;
    amount: number;
    dueDate: string;
    daysUntilDue: number;
  }>;
}

export function mapReports(dto: ApiReports): ReportsMapped {
  // The server returns totals inside `summary` (it builds the
  // shape from a single `computeReport` pass and groups the
  // aggregates together). A couple of routes also produce a
  // top-level `totals` block — accept both shapes here so a
  // shape change on the server doesn't crash the page.
  const summaryTotals = (dto.summary ?? {}) as unknown as {
    totalLent?: number;
    totalReceived?: number;
    outstanding?: number;
  };
  const totalsBlock = (dto.totals ?? {}) as {
    totalLent?: number;
    totalReceived?: number;
    outstanding?: number;
  };
  return {
    range: dto.range,
    startDate: dto.startDate,
    totalLent:
      summaryTotals.totalLent ?? totalsBlock.totalLent ?? 0,
    totalReceived:
      summaryTotals.totalReceived ?? totalsBlock.totalReceived ?? 0,
    outstanding:
      summaryTotals.outstanding ?? totalsBlock.outstanding ?? 0,
    onTimeRate: Math.round((dto.summary?.onTimeRate ?? 0) * 100),
    statusBreakdown: dto.statusBreakdown ?? ({} as never),
    monthly: dto.monthly ?? [],
    topBorrowers: (dto.topBorrowers ?? []).map((b) => ({
      friendId: b.friendId,
      friendName: b.name,
      outstanding: b.outstanding,
      loans: b.loans,
    })),
    reliability: (dto.friendReliability ?? []).map((r) => {
      // Server labels: always_on_time / sometimes_late / often_late /
      // insufficient_data. The UI's old localStorage labels were
      // "always" / "sometimes" / "often". We map "always_on_time"
      // → "always" and "often_late" → "often"; "insufficient_data"
      // is rendered as "sometimes" (the UI just needs 3 buckets).
      const bucket: ReportsMapped["reliability"][number]["bucket"] =
        r.label === "always_on_time"
          ? "always"
          : r.label === "often_late"
            ? "often"
            : "sometimes";
      return {
        friendId: r.friendId,
        friendName: r.name,
        avgDaysLate: 0, // The server doesn't expose this yet; the UI
        // only reads `bucket`, so a 0 is a safe placeholder.
        loans: r.loanCount,
        bucket,
      };
    }),
    avgRepayDays: dto.averageDaysToRepay,
    upcoming: (dto.upcomingDueThisWeek ?? []).map((u) => ({
      loanId: u.loanId,
      friendName: u.friendName,
      amount: u.remaining,
      dueDate: u.dueDate,
      daysUntilDue: u.daysRemaining,
    })),
  };
}

/* ---- Reminder settings -------------------------------------------- */

import type { MessageLanguage, Tone } from "@/types/loan";

export interface ReminderSettingsUi {
  __v: 2;
  tone: Tone;
  messageLanguage: MessageLanguage;
  channels: {
    sms: boolean;
    email: boolean;
    threeDaysBefore: boolean;
    onDueDate: boolean;
    everyTwoDaysAfterOverdue: boolean;
  };
  templates: Record<
    Tone,
    Record<
      MessageLanguage,
      { sms: string; emailSubject: string; email: string }
    >
  >;
}

export function mapReminderSettings(
  dto: ApiReminderSettings,
): ReminderSettingsUi {
  // The server returns the DB-encoded `defaultTimings` JSON; we
  // expand it back to the channel flags the UI expects.
  const timingMap = (dto.defaultTimings ?? {}) as Record<string, boolean>;
  return {
    __v: 2,
    tone: dto.defaultTone,
    messageLanguage: dto.messageLanguage,
    channels: {
      sms: dto.smsEnabled,
      email: dto.emailEnabled,
      threeDaysBefore: !!timingMap.threeDaysBefore,
      onDueDate: !!timingMap.onDueDate,
      everyTwoDaysAfterOverdue: !!timingMap.everyTwoDaysAfterOverdue,
    },
    templates: dto.templates as unknown as ReminderSettingsUi["templates"],
  };
}

/* ---- Profile / preferences --------------------------------------- */

export interface ProfileUi {
  id: string;
  email: string;
  name: string;
  /** E.164 (`+8801XXXXXXXXX`); UI re-strips the `+880` for display. */
  phone: string | null;
  image: string | null;
}

export function mapProfile(dto: ApiProfile): ProfileUi {
  return {
    id: dto.id,
    email: dto.email,
    name: dto.name,
    phone: dto.phone,
    image: dto.image,
  };
}

export interface PreferencesUi {
  language: "en" | "bn";
  theme: "light" | "dark" | "system";
  banglaNumerals: boolean;
  notifications: {
    emailOnPaid: boolean;
    emailOnOverdue: boolean;
    weeklySummary: boolean;
  };
}

export function mapPreferences(dto: ApiPreferences): PreferencesUi {
  return {
    language: dto.language,
    theme: dto.theme,
    banglaNumerals: dto.banglaNumerals,
    notifications: {
      emailOnPaid: dto.notifications.emailOnPaid,
      emailOnOverdue: dto.notifications.emailOnOverdue,
      weeklySummary: dto.notifications.weeklySummary,
    },
  };
}
