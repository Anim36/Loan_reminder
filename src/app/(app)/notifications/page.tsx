"use client";

// Notifications — /notifications
//
// Grouped by day (Today, Yesterday, Earlier). Each item: icon in a
// brand-50 or status-tinted disc, title, description, relative time,
// unread dot. Click marks it read and navigates to /loans/[id].
// "Mark all as read" ghost button + filter chips (All, Unread).
//
// i18n: every string is read from the dictionary. Notification titles
// and bodies are translated by the notification service's
// `translateNotification` (using `messageKey` / `messageParams`);
// older notifications without those fields fall back to their stored
// English text.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CircleAlert,
  CircleCheck,
  Clock,
  HandCoins,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui";
import {
  translateNotification,
  useNotifications,
  type Notification,
  type NotificationKind,
} from "@/services";
import { formatOverlineDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { useToday } from "@/lib/use-today";
import { useT } from "@/lib/i18n/LanguageProvider";
import { useUserSettings } from "@/services/use-user-settings";

type Group = {
  labelKey: "common.today" | "common.yesterday" | "common.earlier";
  items: Notification[];
};

export default function NotificationsPage() {
  const router = useRouter();
  const { t, lang } = useT();
  const { settings } = useUserSettings();
  const numeralMode = settings.banglaNumerals ? "bn" : "latin";
  const { notifications, ready, markRead, markAllRead: markAll } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const today = useToday();

  const visible = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => n.unread);
    return notifications;
  }, [notifications, filter]);

  const groups = useMemo(() => groupByDay(visible, today), [visible, today]);

  async function handleClick(n: Notification) {
    await markRead(n.id);
    if (n.href) router.push(n.href);
  }

  return (
    <section className="flex w-full flex-col gap-6 p-6">
      <PageHeader
        eyebrow={formatOverlineDate(today, lang, numeralMode)}
        title={t["ui.notifications.title"]}
        subtitle={t["ui.notifications.subtitle"]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { value: "all" as const, key: "ui.notifications.all" as const },
              { value: "unread" as const, key: "ui.notifications.unread" as const },
            ]
          ).map((opt) => (
            <Chip
              key={opt.value}
              selected={filter === opt.value}
              onClick={() => setFilter(opt.value)}
            >
              {t[opt.key]}
            </Chip>
          ))}
        </div>
        <Button variant="ghost" onClick={() => void markAll()}>
          {t["ui.notifications.markAll"]}
        </Button>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center">
          <p className="font-semibold text-card-heading text-text">
            {t["ui.allCaughtUpTitle"]}
          </p>
          <p className="mt-2 font-normal text-helper text-muted">
            {t["ui.allCaughtUpBody"]}
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-6 text-center text-muted text-helper">
          {t["ui.noUnreadNotifications"]}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.labelKey} className="flex flex-col gap-3">
              <h2 className="font-semibold text-list-title text-text">
                {t[group.labelKey]}
              </h2>
              <ul className="flex flex-col rounded-card border border-border bg-surface shadow-card overflow-hidden">
                {group.items.map((n, idx) => {
                  const { title, body } = translateNotification(
                    n,
                    t,
                    lang,
                    numeralMode,
                  );
                  return (
                    <li
                      key={n.id}
                      className={[
                        "flex items-center gap-4 px-6 py-3",
                        idx === group.items.length - 1 ? "" : "border-b border-border",
                      ].join(" ")}
                    >
                      <NotificationIcon kind={n.kind} />
                      <button
                        type="button"
                        onClick={() => void handleClick(n)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left hover:opacity-90"
                      >
                        <div className="flex min-w-0 flex-1 flex-col leading-[1.4]">
                          <span
                            className={[
                              "truncate",
                              n.unread ? "font-semibold text-text" : "font-medium text-text",
                            ].join(" ")}
                          >
                            {title}
                          </span>
                          <span className="truncate font-normal text-helper text-muted">
                            {body}
                          </span>
                        </div>
                        <span className="shrink-0 font-normal text-helper text-muted">
                          {formatRelative(n.createdAt, today, t, lang, numeralMode)}
                        </span>
                      </button>
                      {n.unread ? (
                        <span
                          aria-label={t["ui.notifications.unreadDot"]}
                          className="size-2 rounded-pill bg-brand-600"
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Link
        href="/dashboard"
        className="inline-flex w-fit items-center gap-1.5 text-helper font-normal text-muted hover:text-text"
      >
        {t["ui.backToDashboard"]}
      </Link>

      {!ready ? <span className="sr-only">{t["ui.loadingNotifications"]}</span> : null}
    </section>
  );
}

function NotificationIcon({ kind }: { kind: NotificationKind }) {
  const map: Record<NotificationKind, { icon: typeof CircleCheck; className: string }> = {
    "loan-paid": { icon: CircleCheck, className: "bg-brand-50 text-brand-600" },
    "reminder-sent": { icon: Send, className: "bg-brand-50 text-brand-600" },
    "due-soon": { icon: Clock, className: "bg-status-pending-bg text-status-pending-text" },
    overdue: { icon: CircleAlert, className: "bg-status-overdue-bg text-status-overdue-text" },
    "loan-created": { icon: HandCoins, className: "bg-brand-50 text-brand-600" },
    "payment-recorded": { icon: CircleCheck, className: "bg-brand-50 text-brand-600" },
    "due-date-updated": { icon: Clock, className: "bg-status-pending-bg text-status-pending-text" },
  };
  const { icon: Icon, className } = map[kind];
  return (
    <span
      aria-hidden
      className={[
        "flex size-9 items-center justify-center rounded-pill",
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
  lang: "en" | "bn",
  numeralMode: "latin" | "bn",
): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const diffMs = now.getTime() - then.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return localizeDigits(t["common.justNow"], numeralMode);
  if (minutes < 60) return t["common.ago"](minutes);
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t["common.hoursAgo"](hours);
  const days = Math.round(hours / 24);
  if (days === 1) return t["common.yesterday"];
  if (days < 7) return t["common.daysAgo"](days);
  // For older items, fall back to a localized date.
  return new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    month: "short",
  }).format(then).replace(/[0-9]/g, (d) =>
    numeralMode === "bn" ? "০১২৩৪৫৬৭৮৯"[Number(d)] : d,
  );
}

function groupByDay(items: Notification[], today: Date): Group[] {
  const groups: Record<Group["labelKey"], Notification[]> = {
    "common.today": [],
    "common.yesterday": [],
    "common.earlier": [],
  };
  for (const item of items) {
    const then = new Date(item.createdAt);
    if (Number.isNaN(then.getTime())) continue;
    const startOfThen = new Date(then);
    startOfThen.setHours(0, 0, 0, 0);
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    const diff = Math.round(
      (startOfToday.getTime() - startOfThen.getTime()) / 86_400_000,
    );
    if (diff <= 0) groups["common.today"].push(item);
    else if (diff === 1) groups["common.yesterday"].push(item);
    else groups["common.earlier"].push(item);
  }
  const out: Group[] = [];
  if (groups["common.today"].length) {
    out.push({ labelKey: "common.today", items: groups["common.today"] });
  }
  if (groups["common.yesterday"].length) {
    out.push({ labelKey: "common.yesterday", items: groups["common.yesterday"] });
  }
  if (groups["common.earlier"].length) {
    out.push({ labelKey: "common.earlier", items: groups["common.earlier"] });
  }
  return out;
}

function localizeDigits(input: string, mode: "latin" | "bn"): string {
  if (mode !== "bn" || !input) return input;
  return input.replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
}
