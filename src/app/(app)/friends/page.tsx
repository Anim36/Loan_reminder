"use client";

// Friends — /friends
//
// A friend is derived from the loans list (grouped by `friend.id`).
// Lists every friend with their loan count, total lent, outstanding,
// and a status badge showing the worst current loan (Overdue > Pending > Paid).
// Desktop table + mobile stacked cards.
//
// Data: React Query (`useFriendsQuery`).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState, StatusBadge, useToast } from "@/components/ui";
import { useFriendsQuery } from "@/services/useQueries";
import { ApiError } from "@/lib/api-client";
import { formatMoney, formatOverlineDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { useToday } from "@/lib/use-today";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { FriendListRow as FriendSummaryRow } from "@/lib/api/mappers";

export default function FriendsPage() {
  const router = useRouter();
  const { t } = useT();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const today = useToday();
  const friendsQ = useFriendsQuery();
  const friends = friendsQ.data;

  // Surface a translated toast when the friends list fetch
  // fails. The previous code called `toast.show(...)` directly
  // in the render body, which triggered
  // "Cannot update a component (ToastProvider) while rendering a
  // different component (FriendsPage)". The toast is now fired
  // in a layout effect with a ref guard so a single error
  // transition only enqueues one toast (no duplicate on the
  // // subsequent re-render that React Query schedules).
  const lastErrorRef = useRef<unknown>(null);
  useEffect(() => {
    if (!friendsQ.isError) {
      lastErrorRef.current = null;
      return;
    }
    if (lastErrorRef.current === friendsQ.error) return;
    lastErrorRef.current = friendsQ.error;
    toast.show(t["ui.errorBoundary.body"]);
  }, [friendsQ.isError, friendsQ.error, toast, t]);

  const visible = useMemo(() => {
    if (!friends) return [];
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(
      (f) =>
        f.friend.name.toLowerCase().includes(q) ||
        (f.friend.phone ?? "").includes(q),
    );
  }, [friends, query]);

  const isEmpty = !!friends && friends.length === 0;
  const isFilteredEmpty = !isEmpty && visible.length === 0;

  return (
    <section className="flex w-full flex-col gap-6 p-6">
      <PageHeader
        eyebrow={formatOverlineDate(today)}
        title={t["ui.friends.title"]}
        subtitle={t["ui.friends.subtitle"]}
      />

      <div className="flex items-center gap-3">
        <label className="flex flex-1 min-w-0 items-center gap-2 rounded-input border border-border bg-surface px-[13px] py-[13px]">
          <Search size={16} aria-hidden="true" className="text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t["ui.searchFriendPlaceholder"]}
            aria-label={t["ui.searchFriends.aria"]}
            className="flex-1 min-w-0 bg-transparent outline-none font-normal text-label placeholder:text-placeholder"
          />
        </label>
        <Button
          variant="primary"
          icon={<Plus size={16} aria-hidden />}
          onClick={() => router.push("/loans/new")}
        >
          {t["ui.friends.newLoan"]}
        </Button>
      </div>

      {friendsQ.isError ? (
        <div className="rounded-card border border-border bg-surface p-6 text-center text-helper">
          <p className="text-status-overdue-text">
            {friendsQ.error instanceof ApiError && friendsQ.error.code
              ? t["ui.errorBoundary.body"]
              : t["ui.errorBoundary.body"]}
          </p>
          <button
            type="button"
            onClick={() => friendsQ.refetch()}
            className="mt-3 inline-flex items-center gap-2 rounded-pill border border-border px-4 py-2 text-helper font-medium text-text hover:border-brand-600"
          >
            {t["app.error.retry"]}
          </button>
        </div>
      ) : isEmpty ? (
        <div className="rounded-card border border-border bg-surface shadow-card">
          <EmptyState
            type="Loans"
            onAddLoan={() => router.push("/loans/new")}
          />
          <p className="px-8 pb-8 text-center text-helper text-muted">
            {t["ui.friends.firstLoan.helper"]}
          </p>
        </div>
      ) : isFilteredEmpty ? (
        <div className="rounded-card border border-border bg-surface p-6 text-center text-muted text-helper">
          {t["ui.friends.empty"]}
        </div>
      ) : (
        <>
          <DesktopTable rows={visible} />
          <MobileCards rows={visible} />
        </>
      )}

      {friendsQ.isLoading ? (
        <span className="sr-only">{t["ui.loadingFriends"]}</span>
      ) : null}
    </section>
  );
}

function DesktopTable({ rows }: { rows: FriendSummaryRow[] }) {
  const { t } = useT();
  return (
    <div className="hidden md:block rounded-card border border-border bg-surface overflow-hidden">
      <div className="grid grid-cols-[1.4fr_120px_120px_140px_140px_120px] bg-[#f6f7f3] px-6 h-12 font-medium text-eyebrow text-muted leading-6 items-center overflow-clip">
        <span>{t["ui.friends.table.friend"]}</span>
        <span>{t["ui.friends.table.loans"]}</span>
        <span>{t["ui.friends.table.totalLent"]}</span>
        <span>{t["ui.friends.table.outstanding"]}</span>
        <span>{t["ui.friends.table.status"]}</span>
        <span aria-hidden="true"></span>
      </div>
      {rows.map((row, idx) => (
        <Row key={row.friend.id} row={row} isLast={idx === rows.length - 1} />
      ))}
    </div>
  );
}

function Row({ row, isLast }: { row: FriendSummaryRow; isLast: boolean }) {
  const { t } = useT();
  return (
    <Link
      href={`/friends/${row.friend.id}`}
      className={[
        "grid grid-cols-[1.4fr_120px_120px_140px_140px_120px] items-center gap-4 px-6 h-[72px] overflow-clip hover:bg-neutral-50 transition-colors",
        isLast ? "" : "border-b border-border",
      ].join(" ")}
    >
      <div className="flex flex-1 min-w-0 items-center gap-3">
        <Avatar name={row.friend.name} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-body text-text">
            {row.friend.name}
          </span>
          <span className="truncate font-normal text-helper text-muted">
            {row.friend.phone
              ? `+880 ${row.friend.phone}`
              : t["ui.phoneNotOnFile"]}
          </span>
        </div>
      </div>
      <span className="font-normal text-body text-muted">{row.loanCount}</span>
      <span className="tabular font-medium text-body text-text">{formatMoney(row.totalLent)}</span>
      <span className="tabular font-medium text-body text-text">{formatMoney(row.outstanding)}</span>
      <div>
        <StatusBadge status={row.worstStatus} />
      </div>
      <span aria-hidden="true"></span>
    </Link>
  );
}

function MobileCards({ rows }: { rows: FriendSummaryRow[] }) {
  const { t } = useT();
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {rows.map((row) => (
        <li
          key={row.friend.id}
          className="rounded-card border border-border bg-surface p-4 shadow-card"
        >
          <Link
            href={`/friends/${row.friend.id}`}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar name={row.friend.name} />
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-body text-text">
                  {row.friend.name}
                </span>
                <span className="tabular truncate font-normal text-helper text-muted">
                  {t["ui.friends.mobileSub"](
                    row.loanCount,
                    formatMoney(row.totalLent),
                  )}
                </span>
              </div>
            </div>
            <StatusBadge status={row.worstStatus} />
          </Link>
        </li>
      ))}
    </ul>
  );
}