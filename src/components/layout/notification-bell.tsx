"use client";

/**
 * Figma reference: Dashboard 10:3868 (desktop) / 10:4024 (mobile).
 * Bell button in the TopBar that opens a popover with the 5 latest
 * notifications. The bell is always visible (no layout shift on
 * changes). On mobile (<md) the popover becomes a full-width sheet
 * anchored to the top-right corner of the viewport.
 *
 * Behaviour:
 *   - Closes on outside click, ESC, and route change.
 *   - Shows a brand-coloured badge with the unread count (9+ when
 *     larger); hidden when count is 0.
 *   - Footer: "Mark all as read" ghost button + "View all" link to
 *     /notifications.
 *   - Live count: the bell subscribes to the cached
 *     `useNotifications()` snapshot, so new notifications and
 *     mark-read events update the badge without an infinite loop.
 *
 * Translations:
 *   - The bell and the panel chrome (header, "View all", "Mark all
 *     as read", empty state, "unread" badge) all read from
 *     `useT()`. The per-notification title/description are stored in
 *     localStorage as final text (legacy) OR a message-key + params
 *     pair (new). The page uses `translateNotification(n, t)` to
 *     render the right one for the active language.
 */

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Bell,
  CircleAlert,
  CircleCheck,
  Clock,
  HandCoins,
  Send,
} from "lucide-react";

import { useNotifications } from "@/services/use-notifications";
import {
  translateNotification,
  type Notification,
  type NotificationKind,
} from "@/services/notificationService";
import { useToday } from "@/lib/use-today";
import { useT } from "@/lib/i18n/LanguageProvider";

const PREVIEW_LIMIT = 5;

export function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const { notifications, unread, ready, markRead, markAllRead } =
    useNotifications();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Close on route change. `usePathname` returns a primitive, so this
  // effect is stable and never re-fires on every render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  // Close on outside click + ESC.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const latest = useMemo(
    () => notifications.slice(0, PREVIEW_LIMIT),
    [notifications],
  );
  const today = useToday();

  function handleItemClick(n: Notification) {
    void markRead(n.id);
    setOpen(false);
    if (n.href) router.push(n.href);
  }

  function handleMarkAll() {
    if (unread === 0) return;
    void markAllRead();
  }

  function handleViewAll() {
    setOpen(false);
    router.push("/notifications");
  }

  const badgeLabel = unread > 9 ? "9+" : String(unread);
  const ariaLabel =
    unread > 0
      ? t["topbar.aria.notificationsUnread"](unread)
      : t["topbar.aria.notifications"];

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        data-node-id="10:7143"
        className="relative flex size-9 items-center justify-center rounded-pill text-muted transition-colors hover:bg-neutral-50 hover:text-text"
      >
        <Bell size={18} aria-hidden="true" />
        {ready && unread > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-brand-600 px-1 text-badge font-semibold leading-none text-white ring-2 ring-surface"
          >
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <NotificationPanel
          id={panelId}
          items={latest}
          unread={unread}
          hasMore={notifications.length > PREVIEW_LIMIT}
          today={today}
          onItemClick={handleItemClick}
          onMarkAll={handleMarkAll}
          onViewAll={handleViewAll}
        />
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Panel
 *
 * Two layouts, same content:
 *   - Mobile (<md): full-width sheet from the top-right, slides down.
 *   - Desktop (md+): 360px popover anchored to the bell, top-right
 *     with a small gap.
 * --------------------------------------------------------------------------- */

interface NotificationPanelProps {
  id: string;
  items: Notification[];
  unread: number;
  hasMore: boolean;
  today: Date;
  onItemClick: (n: Notification) => void;
  onMarkAll: () => void;
  onViewAll: () => void;
}

function NotificationPanel({
  id,
  items,
  unread,
  hasMore,
  today,
  onItemClick,
  onMarkAll,
  onViewAll,
}: NotificationPanelProps) {
  const { t, lang } = useT();
  return (
    <div
      role="dialog"
      aria-label={t["topbar.aria.notifications"]}
      id={id}
      data-node-id="10:7145"
      className={[
        "fixed inset-x-3 top-[80px] z-50 flex max-h-[calc(100dvh-100px)] flex-col overflow-hidden rounded-card border border-border bg-surface shadow-overlay",
        "md:absolute md:inset-x-auto md:right-0 md:top-[calc(100%+8px)] md:max-h-[520px] md:w-[360px]",
      ].join(" ")}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-body font-semibold text-text">
            {t["nav.notifications"]}
          </h2>
          {unread > 0 ? (
            <span className="rounded-pill bg-brand-50 px-2 py-0.5 text-badge font-semibold text-brand-600">
              {t["notifications.hasUnread"](unread)}
            </span>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="px-4 py-10 text-center font-normal text-helper text-muted">
            {t["notifications.noUnread"]}
          </p>
        ) : (
          <ul role="list" className="flex flex-col">
            {items.map((n, idx) => {
              const rendered = translateNotification(n, t, lang);
              return (
                <li
                  key={n.id}
                  className={
                    idx < items.length - 1 ? "border-b border-border" : ""
                  }
                >
                  <button
                    type="button"
                    onClick={() => onItemClick(n)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none"
                  >
                    <NotificationIcon kind={n.kind} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span
                        className={[
                          "line-clamp-2",
                          n.unread
                            ? "font-semibold text-text"
                            : "font-medium text-text",
                        ].join(" ")}
                      >
                        {rendered.title}
                      </span>
                      <span className="line-clamp-2 font-normal text-helper text-muted">
                        {rendered.body}
                      </span>
                      <span className="font-normal text-badge text-muted">
                        {formatRelative(n.createdAt, today, t)}
                      </span>
                    </div>
                    {n.unread ? (
                      <span
                        aria-label={t["notifications.aria.unread"]}
                        className="mt-1 size-2 shrink-0 rounded-pill bg-brand-600"
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-surface px-3 py-2">
        <button
          type="button"
          onClick={onMarkAll}
          disabled={unread === 0}
          className={[
            "rounded-input px-2 py-1.5 font-semibold text-helper transition-colors",
            unread === 0
              ? "text-disabled-text cursor-not-allowed"
              : "text-text hover:bg-brand-50 hover:text-brand-600",
          ].join(" ")}
        >
          {t["notifications.markAllRead"]}
        </button>
        <button
          type="button"
          onClick={onViewAll}
          className="rounded-input px-2 py-1.5 font-semibold text-helper text-brand-600 transition-colors hover:bg-brand-50"
        >
          {hasMore ? t["common.seeAll"] : t["common.open"]}
        </button>
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Icon
 *
 * Same shape as the /notifications page icon: a 36px disc in a tint
 * that matches the notification kind. Uses existing semantic tokens
 * so the disc looks right in both light and dark mode.
 * --------------------------------------------------------------------------- */

function NotificationIcon({ kind }: { kind: NotificationKind }) {
  const map: Record<
    NotificationKind,
    { icon: typeof Bell; className: string }
  > = {
    "loan-paid": { icon: CircleCheck, className: "bg-brand-50 text-brand-600" },
    "reminder-sent": { icon: Send, className: "bg-brand-50 text-brand-600" },
    "due-soon": {
      icon: Clock,
      className: "bg-status-pending-bg text-status-pending-text",
    },
    overdue: {
      icon: CircleAlert,
      className: "bg-status-overdue-bg text-status-overdue-text",
    },
    "loan-created": { icon: HandCoins, className: "bg-brand-50 text-brand-600" },
    "payment-recorded": {
      icon: CircleCheck,
      className: "bg-brand-50 text-brand-600",
    },
    "due-date-updated": {
      icon: Clock,
      className: "bg-status-pending-bg text-status-pending-text",
    },
  };
  const { icon: Icon, className } = map[kind];
  return (
    <span
      aria-hidden
      className={[
        "flex size-9 shrink-0 items-center justify-center rounded-pill",
        className,
      ].join(" ")}
    >
      <Icon size={16} />
    </span>
  );
}

function formatRelative(
  iso: string,
  now: Date,
  t: ReturnType<typeof useT>["t"],
): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const diffMs = now.getTime() - then.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return t["common.justNow"];
  if (minutes < 60) return t["common.ago"](minutes);
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t["common.hoursAgo"](hours);
  const days = Math.round(hours / 24);
  if (days === 1) return t["common.yesterday"];
  return t["common.daysAgo"](days);
}
