// Notification storage layer.
//
// A notification is a small message we show to the user — "Loan
// marked as paid", "Reminder sent", "New loan saved". The feed is
// grouped by day on /notifications, and the unread count drives the
// dot on the TopBar bell.
//
// When `NEXT_PUBLIC_API_URL` is set, every function hits the
// backend. When it's empty, the records live in `localStorage`
// seeded with a believable set based on the loan seeds.
//
// SSR-safe: nothing here touches `window` at module scope.
//
// Storage versioning
// ------------------
// Each notification record is normalized before being read back.
// Older records may be missing the `kind` / `href` / `unread` fields
// (added in v1), or the `createdAt` field (added in v0). The
// normalizer fills every missing field with a safe default so the
// page never renders a broken entry. Corrupt or non-JSON storage
// falls back to the seed feed without throwing.

import {
  API_ENABLED,
  apiGet,
  apiPost,
  ApiError,
} from "@/lib/api";
import { SEED_LOANS } from "@/data";
import type { Loan, Tone } from "@/types";
import { hasWindow, readAndNormalize, safeJsonParse } from "./storage";
import { formatDate, formatMoney } from "@/lib/format";
import type { Lang } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/types";

export type NotificationKind =
  | "loan-created"
  | "loan-paid"
  | "reminder-sent"
  | "due-soon"
  | "overdue"
  | "payment-recorded"
  | "due-date-updated";

const VALID_KINDS: NotificationKind[] = [
  "loan-created",
  "loan-paid",
  "reminder-sent",
  "due-soon",
  "overdue",
  "payment-recorded",
  "due-date-updated",
];

function isKind(v: unknown): v is NotificationKind {
  return typeof v === "string" && (VALID_KINDS as string[]).includes(v);
}

export interface Notification {
  id: string;
  /** ISO timestamp. */
  createdAt: string;
  kind: NotificationKind;
  /** Friendly title shown in the feed. Pre-rendered English text —
   *  used as a fallback when no `messageKey` is present, or for
   *  notifications created before the per-language migration. */
  title: string;
  /** Short body shown beneath the title. Same fallback story as
   *  `title`. */
  description: string;
  /** Where clicking the notification navigates. */
  href: string;
  /** Optional loan id that this notification is about. */
  loanId?: string;
  /** True when the user has not seen this notification yet. */
  unread: boolean;
  /** Optional translation key. When present, the page renders the
   *  dictionary entry instead of `title` for the active language. */
  messageKey?: NotificationMessageKey;
  /** Params for the translation key. The order matches the
   *  corresponding dictionary function's argument list. */
  messageParams?: unknown[];
}

/** The set of supported translation keys for notifications. */
export type NotificationMessageKey =
  | "notif.paid"
  | "notif.overdue"
  | "notif.reminderSent"
  | "notif.dueSoon"
  | "notif.loanCreated"
  | "notif.payment"
  | "notif.paymentFully"
  | "notif.dueDateUpdated";

const STORAGE_KEY = "loan-reminder:notifications:v2";
const CHANGE_EVENT = "notifications:change";

function isString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

/** Translate a notification for the active language. Uses
 *  `messageKey` / `messageParams` when present, otherwise falls
 *  back to the pre-rendered `title` / `description` (the legacy
 *  shape used before the per-language migration).
 *
 *  `numeralMode` is forwarded to `formatMoney` so Bangla numerals
 *  flow through.
 */
export function translateNotification(
  n: Notification,
  t: Dictionary,
  lang: Lang,
  numeralMode: "latin" | "bn" = "latin",
): { title: string; body: string } {
  if (!n.messageKey) {
    return { title: n.title, body: n.description };
  }
  const params = n.messageParams ?? [];
  switch (n.messageKey) {
    case "notif.paid":
      return {
        title: t["notif.paid.title"],
        body: t["notif.paid.body"](formatMoney(params[0] as number, numeralMode)),
      };
    case "notif.overdue":
      return {
        title: t["notif.overdue.title"],
        body: t["notif.overdue.body"](
          String(params[0] ?? ""),
          formatMoney((params[1] as number) ?? 0, numeralMode),
          formatDate(String(params[2] ?? ""), { lang, numeralMode: "latin" }),
        ),
      };
    case "notif.reminderSent":
      return {
        title: t["notif.reminderSent.title"],
        body: t["notif.reminderSent.body"](
          String(params[0] ?? ""),
          String(params[1] ?? ""),
        ),
      };
    case "notif.dueSoon":
      return {
        title: t["notif.dueSoon.title"],
        body: t["notif.dueSoon.body"](
          String(params[0] ?? ""),
          formatDate(String(params[1] ?? ""), { lang, numeralMode: "latin" }),
        ),
      };
    case "notif.loanCreated":
      return {
        title: t["notif.loanCreated.title"],
        body: t["notif.loanCreated.body"](
          String(params[0] ?? ""),
          formatMoney((params[1] as number) ?? 0, numeralMode),
        ),
      };
    case "notif.payment":
      return {
        title: t["notif.payment.title"],
        body: t["notif.payment.body"](
          String(params[0] ?? ""),
          formatMoney((params[1] as number) ?? 0, numeralMode),
          formatMoney((params[2] as number) ?? 0, numeralMode),
        ),
      };
    case "notif.paymentFully":
      return {
        title: t["notif.paymentFully.title"],
        body: t["notif.paymentFully.body"](
          String(params[0] ?? ""),
          formatMoney((params[1] as number) ?? 0, numeralMode),
        ),
      };
    case "notif.dueDateUpdated":
      return {
        title: t["notif.dueDateUpdated.title"],
        body: t["notif.dueDateUpdated.body"](
          String(params[0] ?? ""),
          formatDate(String(params[1] ?? ""), { lang, numeralMode: "latin" }),
          formatDate(String(params[2] ?? ""), { lang, numeralMode: "latin" }),
        ),
      };
  }
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

/** Normalize a single notification record. Never throws; always
 *  returns a complete record. */
export function normalizeNotification(raw: unknown, idx: number): Notification {
  if (!raw || typeof raw !== "object") {
    return {
      id: `notif-fallback-${idx}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      kind: "loan-created",
      title: "Notification",
      description: "",
      href: "/dashboard",
      unread: true,
    };
  }
  const r = raw as Partial<Notification> & Record<string, unknown>;
  const id = isString(r.id) ? r.id : `notif-fallback-${idx}-${Date.now()}`;
  const createdAt = isString(r.createdAt) ? r.createdAt : new Date().toISOString();
  const kind: NotificationKind = isKind(r.kind) ? r.kind : "loan-created";
  const title = isString(r.title) ? r.title : "Notification";
  const description = isString(r.description) ? r.description : "";
  const href = isString(r.href) ? r.href : "/dashboard";
  const loanId = isString(r.loanId) ? r.loanId : undefined;
  const unread = isBoolean(r.unread) ? r.unread : true;
  // Optional per-language message key. When the field is missing the
  // page falls back to the pre-rendered `title` / `description`
  // (legacy shape), so older localStorage records keep working.
  const messageKey = isMessageKey(r.messageKey) ? r.messageKey : undefined;
  const messageParams = Array.isArray(r.messageParams)
    ? (r.messageParams as unknown[])
    : undefined;
  return {
    id,
    createdAt,
    kind,
    title,
    description,
    href,
    loanId,
    unread,
    messageKey,
    messageParams,
  };
}

function isMessageKey(v: unknown): v is NotificationMessageKey {
  return (
    typeof v === "string" &&
    [
      "notif.paid",
      "notif.overdue",
      "notif.reminderSent",
      "notif.dueSoon",
      "notif.loanCreated",
      "notif.payment",
      "notif.paymentFully",
      "notif.dueDateUpdated",
    ].includes(v)
  );
}

/** Normalize a full feed (array of records). Returns an empty array
 *  for any non-array input so callers never have to null-check. */
function normalizeFeed(raw: unknown): Notification[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r, i) => normalizeNotification(r, i));
}

function readAll(): Notification[] {
  if (!hasWindow()) return SEED_NOTIFICATIONS;
  // We treat the array as opaque — the normalizer produces a new array
  // only when the input was a different shape, so most reads are
  // O(1) via the migration cache.
  const normalized = readAndNormalize<Notification[]>(
    STORAGE_KEY,
    (raw) => normalizeFeed(raw),
    (a, b) => {
      if (a === b) return true;
      if (!Array.isArray(a)) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        const x = a[i] as Partial<Notification>;
        const y = b[i];
        if (
          x.id !== y.id ||
          x.createdAt !== y.createdAt ||
          x.kind !== y.kind ||
          x.title !== y.title ||
          x.description !== y.description ||
          x.href !== y.href ||
          x.loanId !== y.loanId ||
          x.unread !== y.unread
        ) {
          return false;
        }
      }
      return true;
    },
  );
  return normalized ?? SEED_NOTIFICATIONS;
}

function writeAll(items: Notification[]): void {
  if (!hasWindow()) return;
  try {
    // Persist as a plain array. The normalizer (`normalizeFeed`)
    // reads the same shape, so old data is migrated forward in
    // place by `normalizeNotification`. The version lives in the
    // storage key (`:v2`) and the per-record migration handles
    // shape changes inside the array.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore — storage may be unavailable in private mode
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

let counter = 0;
function nextId(): string {
  counter = (counter + 1) % 1_000_000;
  return `notif-${Date.now().toString(36)}-${counter.toString(36)}`;
}

const TONE_LABEL: Record<Tone, string> = {
  Friendly: "friendly",
  Neutral: "neutral",
  Firm: "firm",
};

/**
 * Synthetic seed notifications — keyed off the six seed loans so the
 * /notifications page is never empty for first-time demos.
 */
function seedNotifications(): Notification[] {
  const today = "2026-10-04";
  const yesterday = "2026-10-03";
  const twoDaysAgo = "2026-10-02";
  const threeDaysAgo = "2026-10-01";
  const out: Notification[] = [];
  for (const loan of SEED_LOANS) {
    if (loan.status === "Paid") {
      out.push({
        id: `${loan.id}-n-paid`,
        createdAt: `${loan.dueDate}T10:30:00.000Z`,
        kind: "loan-paid",
        title: `${loan.friend.name}'s loan marked as paid`,
        description: `৳${loan.amount.toLocaleString("en-IN")} marked paid. Reminders for this loan have stopped.`,
        href: `/loans/${loan.id}`,
        loanId: loan.id,
        unread: false,
        messageKey: "notif.paid",
        messageParams: [loan.amount],
      });
    }
    if (loan.status === "Overdue") {
      out.push({
        id: `${loan.id}-n-overdue`,
        createdAt: `${twoDaysAgo}T09:00:00.000Z`,
        kind: "overdue",
        title: `${loan.friend.name}'s loan is overdue`,
        description: `৳${loan.amount.toLocaleString("en-IN")} was due on ${loan.dueDate}. A friendly reminder was sent.`,
        href: `/loans/${loan.id}`,
        loanId: loan.id,
        unread: loan.id === "loan-rafi-2026-09-20",
        messageKey: "notif.overdue",
        messageParams: [loan.friend.name, loan.amount, loan.dueDate],
      });
    }
    if (loan.status === "Pending" && loan.reminders.sms) {
      out.push({
        id: `${loan.id}-n-reminder`,
        createdAt: `${yesterday}T10:00:00.000Z`,
        kind: "reminder-sent",
        title: `Reminder sent to ${loan.friend.name}`,
        description: `${TONE_LABEL[loan.tone]} SMS reminder delivered for ৳${loan.amount.toLocaleString("en-IN")}.`,
        href: `/loans/${loan.id}`,
        loanId: loan.id,
        unread: loan.id === "loan-tanvir-2026-09-22",
        messageKey: "notif.reminderSent",
        messageParams: [TONE_LABEL[loan.tone], "SMS"],
      });
    }
    if (loan.status === "Pending") {
      out.push({
        id: `${loan.id}-n-due-soon`,
        createdAt: `${threeDaysAgo}T08:00:00.000Z`,
        kind: "due-soon",
        title: `Loan to ${loan.friend.name} is due soon`,
        description: `Due on ${loan.dueDate}. We'll send a gentle reminder before then.`,
        href: `/loans/${loan.id}`,
        loanId: loan.id,
        unread: false,
        messageKey: "notif.dueSoon",
        messageParams: [loan.friend.name, loan.dueDate],
      });
    }
  }
  out.push({
    id: "loan-tanvir-2026-09-22-n-created",
    createdAt: `${today}T09:15:00.000Z`,
    kind: "loan-created",
    title: "New loan to Tanvir",
    description: "৳5,000 lent. Friendly SMS reminder scheduled for 12 Oct.",
    href: "/loans/loan-tanvir-2026-09-22",
    loanId: "loan-tanvir-2026-09-22",
    unread: false,
    messageKey: "notif.loanCreated",
    messageParams: ["Tanvir", 5000],
  });
  out.sort((a, b) => (a.createdAt > b.createdAt ? -1 : a.createdAt < b.createdAt ? 1 : 0));
  return out;
}

const SEED_NOTIFICATIONS: Notification[] = seedNotifications();

/**
 * Re-export the seed so client hooks (which can't call `seedNotifications`
 * during SSR) can render a stable snapshot.
 */
export { SEED_NOTIFICATIONS };

/* ---- API + localStorage ---------------------------------------------------- */

export async function getNotifications(): Promise<Notification[]> {
  if (API_ENABLED) return apiGet<Notification[]>("/notifications");
  return readAll();
}

export async function getUnreadCount(): Promise<number> {
  const items = await getNotifications();
  return items.filter((n) => n.unread).length;
}

export async function markRead(id: string): Promise<void> {
  if (API_ENABLED) {
    await apiPost<Notification>(
      `/notifications/${encodeURIComponent(id)}/read`,
    );
    return;
  }
  const all = readAll();
  const idx = all.findIndex((n) => n.id === id);
  if (idx === -1) return;
  const next = [...all];
  next[idx] = { ...all[idx], unread: false };
  writeAll(next);
}

export async function markAllRead(): Promise<void> {
  if (API_ENABLED) {
    await apiPost<Notification>("/notifications/read-all");
    return;
  }
  const all = readAll();
  const next = all.map((n) => (n.unread ? { ...n, unread: false } : n));
  writeAll(next);
}

export async function deleteNotification(id: string): Promise<void> {
  if (API_ENABLED) {
    try {
      await apiPost(`/notifications/${encodeURIComponent(id)}/delete`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return;
      throw err;
    }
    return;
  }
  const next = readAll().filter((n) => n.id !== id);
  writeAll(next);
}

/* ---- Mutation helpers (called by other services / UI) ------------------- */

export function createNotification(
  input: Omit<Notification, "id" | "createdAt" | "unread"> & {
    unread?: boolean;
  },
): Notification {
  const n: Notification = {
    ...input,
    id: nextId(),
    createdAt: new Date().toISOString(),
    unread: input.unread ?? true,
  };
  if (hasWindow()) {
    const all = readAll();
    writeAll([n, ...all]);
  }
  return n;
}

export function notifyLoanCreated(loan: Loan): Notification {
  return createNotification({
    kind: "loan-created",
    title: `New loan to ${loan.friend.name}`,
    description: `৳${loan.amount.toLocaleString("en-IN")} lent. ${
      loan.reminders.sms ? "SMS reminder scheduled." : ""
    }${loan.reminders.email && loan.reminders.sms ? " " : ""}${
      loan.reminders.email ? "Email reminder scheduled." : ""
    }`.trim(),
    href: `/loans/${loan.id}`,
    loanId: loan.id,
    messageKey: "notif.loanCreated",
    messageParams: [loan.friend.name, loan.amount],
  });
}

export function notifyLoanPaid(loan: Loan): Notification {
  return createNotification({
    kind: "loan-paid",
    title: `${loan.friend.name}'s loan marked as paid`,
    description: `৳${loan.amount.toLocaleString("en-IN")} marked paid. Reminders for this loan have stopped.`,
    href: `/loans/${loan.id}`,
    loanId: loan.id,
    messageKey: "notif.paid",
    messageParams: [loan.amount],
  });
}

export function notifyReminderSent(loan: Loan): Notification {
  const channel =
    loan.reminders.sms && loan.reminders.email
      ? "SMS and Email"
      : loan.reminders.sms
        ? "SMS"
        : "Email";
  return createNotification({
    kind: "reminder-sent",
    title: `Reminder sent to ${loan.friend.name}`,
    description: `${TONE_LABEL[loan.tone]} ${channel} reminder delivered.`,
    href: `/loans/${loan.id}`,
    loanId: loan.id,
    messageKey: "notif.reminderSent",
    messageParams: [TONE_LABEL[loan.tone], channel],
  });
}

export function notifyPaymentRecorded(args: {
  loan: Loan;
  amount: number;
  remaining: number;
  fullyPaid: boolean;
}): Notification {
  const { loan, amount, remaining, fullyPaid } = args;
  return createNotification({
    kind: "payment-recorded",
    title: fullyPaid
      ? `${loan.friend.name}'s loan fully paid`
      : `Payment received from ${loan.friend.name}`,
    description: fullyPaid
      ? `৳${amount.toLocaleString("en-IN")} recorded. Loan is now fully settled.`
      : `৳${amount.toLocaleString("en-IN")} received. ৳${remaining.toLocaleString("en-IN")} still outstanding.`,
    href: `/loans/${loan.id}`,
    loanId: loan.id,
    messageKey: fullyPaid ? "notif.paymentFully" : "notif.payment",
    messageParams: fullyPaid
      ? [loan.friend.name, amount]
      : [loan.friend.name, amount, remaining],
  });
}

export function notifyDueDateUpdated(args: {
  loan: Loan;
  from: string;
  to: string;
}): Notification {
  const { loan, from, to } = args;
  return createNotification({
    kind: "due-date-updated",
    title: `${loan.friend.name}'s due date moved`,
    description: `Rescheduled from ${from} to ${to}.`,
    href: `/loans/${loan.id}`,
    loanId: loan.id,
    messageKey: "notif.dueDateUpdated",
    messageParams: [loan.friend.name, from, to],
  });
}

/* ---- Hook ----------------------------------------------------------------- */

export function subscribeNotifications(handler: () => void): () => void {
  if (!hasWindow()) return () => {};
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export { safeJsonParse };
