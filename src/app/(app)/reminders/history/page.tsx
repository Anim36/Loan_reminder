"use client";

// Reminder history — /reminders/history.
//
// 3 small stat cards (Total sent / Delivered / Failed) + filters
// (search by friend name, channel chips, status chips, date sort)
// + a desktop table / mobile stacked cards list. Empty state reuses
// the existing "Reminder history" EmptyState component.
//
// i18n: every user-visible string is read from the dictionary.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Mail,
  MessageSquare,
  Search,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Chip, EmptyState, StatusBadge } from "@/components/ui";
import { useReminderHistoryQuery } from "@/services/useQueries";
import type { ReminderHistoryItem } from "@/lib/api/mappers";
import {
  formatDateTime,
  formatMoney,
  formatOverlineDate,
} from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { useToday } from "@/lib/use-today";
import { useT } from "@/lib/i18n/LanguageProvider";
import { useUserSettings } from "@/services/use-user-settings";
import type { ReminderChannel } from "@/types";

type ChannelFilter = "All" | ReminderChannel;
type StatusFilter = "All" | "Delivered" | "Failed";
type SortDir = "asc" | "desc";

const CHANNELS: ChannelFilter[] = ["All", "SMS", "Email"];
const STATUSES: StatusFilter[] = ["All", "Delivered", "Failed"];

export default function ReminderHistoryPage() {
  const { t, lang } = useT();
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<ChannelFilter>("All");
  const [status, setStatus] = useState<StatusFilter>("All");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const today = useToday();
  const { settings } = useUserSettings();
  const numeralMode = settings.banglaNumerals ? "bn" : "latin";

  // Server-side filter debounced. We send `channel` / `status` as
  // booleans; the wire understands them.
  const [debouncedQ, setDebouncedQ] = useState(query);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(query), 250);
    return () => clearTimeout(id);
  }, [query]);

  // The wire enum covers QUEUED/SENT/DELIVERED/FAILED/SKIPPED. The
  // page UI only offers "Delivered" / "Failed" (the post-send
  // outcomes a user actually cares about), so we map the UI choice
  // to FAILED vs anything-else here.
  const wireStatus =
    status === "Failed"
      ? "FAILED"
      : status === "Delivered"
        ? "DELIVERED"
        : undefined;

  const historyQ = useReminderHistoryQuery({
    q: debouncedQ || undefined,
    channel: channel === "All" ? undefined : channel,
    status: wireStatus,
  });

  const history = historyQ.data?.items;
  const stats = historyQ.data?.stats;

  const visible = useMemo(() => {
    if (!history) return [];
    const arr = history.slice();
    arr.sort((a, b) =>
      sortDir === "desc"
        ? a.sentAt < b.sentAt
          ? 1
          : a.sentAt > b.sentAt
            ? -1
            : 0
        : a.sentAt < b.sentAt
          ? -1
          : a.sentAt > b.sentAt
            ? 1
          : 0,
    );
    return arr;
  }, [history, sortDir]);

  const isEmpty = !!history && history.length === 0;
  const isFilteredEmpty = !isEmpty && visible.length === 0;

  return (
    <section className="flex w-full flex-col gap-6 p-6">
      <PageHeader
        eyebrow={formatOverlineDate(today, lang, numeralMode)}
        title={t["reminders.history.title"]}
        subtitle={t["reminders.history.subtitle"]}
      />

      <Link
        href="/reminders"
        className="inline-flex w-fit items-center gap-1.5 text-helper font-normal text-muted hover:text-text"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        {t["ui.backToReminderSettings"]}
      </Link>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label={t["reminders.history.totalSent"]}
          value={stats?.total ?? 0}
          tone="brand"
        />
        <StatCard
          label={t["reminders.history.delivered"]}
          value={stats?.delivered ?? 0}
          tone="paid"
        />
        <StatCard
          label={t["reminders.history.failed"]}
          value={stats?.failed ?? 0}
          tone="overdue"
        />
      </div>

      {isEmpty ? (
        <div className="rounded-card border border-border bg-surface shadow-card">
          <EmptyState type="Reminder history" />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex flex-1 min-w-0 items-center gap-2 rounded-input border border-border bg-surface px-[13px] py-[13px]">
                <Search size={16} aria-hidden="true" className="text-muted" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t["reminders.history.searchPlaceholder"]}
                  aria-label={t["ui.searchReminders.aria"]}
                  className="flex-1 min-w-0 bg-transparent outline-none font-normal text-label placeholder:text-placeholder"
                />
              </label>
              <SortButton
                dir={sortDir}
                onToggle={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                t={t}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-normal text-helper text-muted mr-1">
                {t["reminders.history.channelLabel"]}
              </span>
              {CHANNELS.map((c) => (
                <Chip key={c} selected={channel === c} onClick={() => setChannel(c)}>
                  {channelLabel(c, t)}
                </Chip>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-normal text-helper text-muted mr-1">
                {t["reminders.history.statusLabel"]}
              </span>
              {STATUSES.map((s) => (
                <Chip key={s} selected={status === s} onClick={() => setStatus(s)}>
                  {statusLabel(s, t)}
                </Chip>
              ))}
            </div>
          </div>

          {isFilteredEmpty ? (
            <div className="rounded-card border border-border bg-surface p-6 text-center text-muted text-helper">
              {t["ui.noRemindersMatch"]}
            </div>
          ) : (
            <>
              <DesktopTable rows={visible} t={t} lang={lang} numeralMode={numeralMode} />
              <MobileCards rows={visible} t={t} lang={lang} numeralMode={numeralMode} />
            </>
          )}
        </>
      )}

      {historyQ.isLoading ? (
        <span className="sr-only">{t["ui.loadingReminders"]}</span>
      ) : null}
    </section>
  );
}

function channelLabel(
  c: ChannelFilter,
  t: ReturnType<typeof useT>["t"],
): string {
  if (c === "All") return t["common.all"];
  if (c === "SMS") return t["ui.method.sms"];
  return t["ui.method.email"];
}

function statusLabel(
  s: StatusFilter,
  t: ReturnType<typeof useT>["t"],
): string {
  if (s === "All") return t["common.all"];
  if (s === "Delivered") return t["reminders.history.delivered"];
  return t["reminders.history.failed"];
}



function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "brand" | "paid" | "overdue";
}) {
  const toneClass =
    tone === "overdue"
      ? "bg-status-overdue-bg border-status-overdue-border"
      : "bg-surface border-border";
  const textClass = tone === "overdue" ? "text-status-overdue-text" : "text-text";
  return (
    <div
      className={`flex flex-col gap-1 rounded-card border p-5 shadow-card ${toneClass}`}
    >
      <span className="text-helper text-muted">{label}</span>
      <span className={`font-semibold text-summary ${textClass}`}>
        {value}
      </span>
    </div>
  );
}

function SortButton({
  dir,
  onToggle,
  t,
}: {
  dir: SortDir;
  onToggle: () => void;
  t: ReturnType<typeof useT>["t"];
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={t["ui.sortAria"](dir)}
      className="inline-flex items-center gap-2 rounded-input border border-border bg-surface px-[13px] py-[13px]"
    >
      <span className="font-normal text-helper text-text">{t["ui.sortDate"]}</span>
      <span className="font-normal text-helper text-muted">
        ({dir === "asc" ? t["ui.sortOldest"] : t["ui.sortNewest"]})
      </span>
      {dir === "asc" ? (
        <ArrowUp size={16} aria-hidden className="text-muted" />
      ) : (
        <ArrowDown size={16} aria-hidden className="text-muted" />
      )}
    </button>
  );
}

type Row = ReminderHistoryItem;

function DesktopTable({
  rows,
  t,
  lang,
  numeralMode,
}: {
  rows: Row[];
  t: ReturnType<typeof useT>["t"];
  lang: "en" | "bn";
  numeralMode: "latin" | "bn";
}) {
  return (
    <div className="hidden md:block rounded-card border border-border bg-surface overflow-hidden">
      <div className="grid grid-cols-[1.6fr_120px_120px_180px_120px] bg-[#f6f7f3] px-6 h-12 font-medium text-eyebrow text-muted leading-6 items-center overflow-clip">
        <span>{t["reminders.history.table.friend"]}</span>
        <span>{t["reminders.history.table.amount"]}</span>
        <span>{t["reminders.history.table.channel"]}</span>
        <span>{t["reminders.history.table.sent"]}</span>
        <span>{t["reminders.history.table.status"]}</span>
      </div>
      {rows.map((r, idx) => (
        <Row
          key={r.id}
          row={r}
          isLast={idx === rows.length - 1}
          t={t}
          lang={lang}
          numeralMode={numeralMode}
        />
      ))}
    </div>
  );
}

function Row({
  row,
  isLast,
  t,
  lang,
  numeralMode,
}: {
  row: ReminderHistoryItem;
  isLast: boolean;
  t: ReturnType<typeof useT>["t"];
  lang: "en" | "bn";
  numeralMode: "latin" | "bn";
}) {
  // The reminder history API returns the friend name and amount
  // alongside every row, so the page no longer needs a second round
  // trip just to render the avatar / amount cells.
  return (
    <div
      className={`grid grid-cols-[1.6fr_120px_120px_180px_120px] items-center gap-4 px-6 h-[72px] overflow-clip ${
        isLast ? "" : "border-b border-border"
      }`}
    >
      <Link
        href={`/loans/${row.loanId}`}
        className="flex flex-1 min-w-0 items-center gap-3"
      >
        <Avatar name={row.friendName} />
        <span className="font-medium text-body text-text truncate">
          {row.friendName}
        </span>
      </Link>
      <span className="font-medium text-body text-text">
        {formatMoney(row.amount, numeralMode)}
      </span>
      <ChannelCell channel={row.channel} t={t} />
      <span className="font-normal text-helper text-muted">
        {formatDateTime(row.sentAt, { lang, numeralMode })}
      </span>
      <div>
        <StatusBadge
          status={row.status === "Delivered" ? "Paid" : "Overdue"}
          label={
            row.status === "Delivered"
              ? t["reminders.history.delivered"]
              : t["reminders.history.failed"]
          }
        />
      </div>
    </div>
  );
}

function ChannelCell({
  channel,
  t,
}: {
  channel: ReminderChannel;
  t: ReturnType<typeof useT>["t"];
}) {
  const Icon = channel === "SMS" ? MessageSquare : Mail;
  return (
    <span className="inline-flex items-center gap-2">
      <Icon size={14} className="text-muted" aria-hidden />
      <span className="font-normal text-body text-text">
        {channel === "SMS" ? t["ui.method.sms"] : t["ui.method.email"]}
      </span>
    </span>
  );
}

function MobileCards({
  rows,
  t,
  lang,
  numeralMode,
}: {
  rows: Row[];
  t: ReturnType<typeof useT>["t"];
  lang: "en" | "bn";
  numeralMode: "latin" | "bn";
}) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {rows.map((r) => (
        <MobileCard
          key={r.id}
          row={r}
          t={t}
          lang={lang}
          numeralMode={numeralMode}
        />
      ))}
    </ul>
  );
}

function MobileCard({
  row,
  t,
  lang,
  numeralMode,
}: {
  row: ReminderHistoryItem;
  t: ReturnType<typeof useT>["t"];
  lang: "en" | "bn";
  numeralMode: "latin" | "bn";
}) {
  return (
    <li className="rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/loans/${row.loanId}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <Avatar name={row.friendName} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-body text-text">
              {row.friendName}
            </span>
            <span className="truncate font-normal text-helper text-muted">
              {formatMoney(row.amount, numeralMode)} ·{" "}
              {formatDateTime(row.sentAt, { lang, numeralMode })}
            </span>
          </div>
        </Link>
        <StatusBadge
          status={row.status === "Delivered" ? "Paid" : "Overdue"}
          label={
            row.status === "Delivered"
              ? t["reminders.history.delivered"]
              : t["reminders.history.failed"]
          }
        />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <ChannelCell channel={row.channel} t={t} />
      </div>
    </li>
  );
}
