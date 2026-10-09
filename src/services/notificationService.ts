// Notifications service — B3/B4 API-backed.
//
// Two pages consume notifications:
//   * `/notifications`        — list with day grouping + filter
//   * TopBar bell (PREVIEW_LIMIT most recent)
//
// The list is paginated server-side; the bell uses the list
// page filtered to the first page (5 rows). Unread count is its
// own cheap endpoint for the badge.

import { ApiError, apiGet, apiPost } from "@/lib/api-client";
import type { ApiNotificationListResponse, ApiUnreadCount } from "@/lib/api/api-types";
import { mapApiNotification } from "@/lib/api/mappers";
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

export type NotificationMessageKey =
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

/* ---- API wrappers ------------------------------------------------ */

export interface NotificationListFilters {
  unread?: boolean;
  page?: number;
  pageSize?: number;
}

export async function getNotifications(
  filters: NotificationListFilters = {},
): Promise<Notification[]> {
  const query: Record<string, string | number> = {};
  if (filters.unread) query.unread = "true";
  if (filters.page) query.page = filters.page;
  if (filters.pageSize) query.pageSize = filters.pageSize;
  const res = await apiGet<ApiNotificationListResponse>("/notifications", {
    query,
  });
  return res.data.map(mapApiNotification);
}

export async function getUnreadCount(): Promise<number> {
  const res = await apiGet<ApiUnreadCount>("/notifications/unread-count");
  return res.count;
}

export async function markRead(id: string): Promise<void> {
  try {
    await apiPost(`/notifications/${encodeURIComponent(id)}/read`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return;
    throw err;
  }
}

export async function markAllRead(): Promise<void> {
  await apiPost("/notifications/read-all");
}

/* ---- Local mutation helpers ---------------------------------------
 *
 * The B4 routes auto-create notifications on loan create / payment
 * recorded / etc. — the UI no longer needs to push a row into
 * localStorage. These helpers exist only so the legacy call sites
 * (e.g. `notifyLoanCreated(loan)` from the form submit) keep
 * compiling. They are no-ops in the API-backed world; the actual
 * notification will appear on the next refetch.
 */

export function notifyLoanCreated(): void {
  /* no-op: server creates the notification. */
}

export function notifyLoanPaid(): void {
  /* no-op */
}

export function notifyReminderSent(): void {
  /* no-op */
}

export function notifyPaymentRecorded(): void {
  /* no-op */
}

export function notifyDueDateUpdated(): void {
  /* no-op */
}

/** Keep the legacy `Notification` constructor available so existing
 *  imports don't break. It produces an empty (unsaved) record. */
export function createNotification(
  input: Partial<Notification> & { id: string },
): Notification {
  return {
    id: input.id,
    createdAt: input.createdAt ?? new Date().toISOString(),
    kind: input.kind ?? "loan-created",
    title: input.title ?? "",
    description: input.description ?? "",
    href: input.href ?? "/notifications",
    loanId: input.loanId,
    unread: input.unread ?? true,
    messageKey: input.messageKey,
    messageParams: input.messageParams,
  };
}

/* ---- Translation (used by the page renderers) ------------------- */

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
