"use client";

// Friend detail — /friends/[id]
//
// Header: Avatar + name + phone + email + a "New loan" button.
// 3 SummaryCards: Total lent / Total repaid / Outstanding.
// Below: the friend's loans (same row/card style as /loans).
// Plus: a small reminder history list for that friend.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import {
  ArrowLeft,
  HandCoins,
  Mail,
  MessageSquare,
  Plus,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge, SummaryCard, useToast } from "@/components/ui";
import { PageHeader } from "@/components/layout/page-header";
import {
  getFriend,
  getFriendLoans,
  getFriendReminderHistory,
  type FriendSummary,
} from "@/services";
import {
  daysBetween,
  formatDate,
  formatDateTime,
  formatMoney,
} from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { Loan } from "@/types";

export default function FriendDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // React 19's `use()` unwraps the params promise synchronously during
  // render, which is what Next 16 requires for `params`.
  const { id } = use(params);
  const router = useRouter();
  const { t } = useT();
  const toast = useToast();
  const [friend, setFriend] = useState<FriendSummary | null | "missing">(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [reminders, setReminders] = useState<Awaited<ReturnType<typeof getFriendReminderHistory>>>([]);
  const today = useToday();

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getFriend(id),
      getFriendLoans(id),
      getFriendReminderHistory(id),
    ]).then(([f, l, r]) => {
      if (cancelled) return;
      setFriend(f ?? "missing");
      setLoans(l);
      setReminders(r);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (friend === "missing") {
    return (
      <section className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center">
        <p className="eyebrow">{t["ui.notFound"]}</p>
        <h1 className="font-semibold text-h1 tracking-[-0.02em] text-text">
          {t["ui.cantFindFriendTitle"]}
        </h1>
        <p className="font-normal text-helper text-muted">
          {t["ui.cantFindFriendBody"]}
        </p>
        <Link
          href="/friends"
          className="inline-flex items-center gap-1.5 font-normal text-helper text-brand-600 hover:underline"
        >
          <ArrowLeft size={14} aria-hidden />
          {t["ui.backToFriends"]}
        </Link>
      </section>
    );
  }

  if (friend === null) {
    return (
      <div
        className="flex min-h-[40vh] flex-col gap-3 p-6 md:p-10"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="sr-only">{t["ui.loadingFriend"]}</span>
        <div className="h-12 w-12 animate-pulse rounded-pill bg-neutral-50" />
        <div className="h-8 w-40 animate-pulse rounded-input bg-neutral-50" />
      </div>
    );
  }

  return (
    <section className="flex w-full flex-col gap-6 p-6">
      <Link
        href="/friends"
        className="inline-flex w-fit items-center gap-1.5 text-helper font-normal text-muted hover:text-text"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        {t["ui.backToFriends"]}
      </Link>

      {/* Page header — avatar + name (H1) + contact subtitle + New loan CTA */}
      <PageHeader
        title={friend.friend.name}
        subtitle={
          friend.friend.phone
            ? `+880 ${friend.friend.phone}${friend.friend.email ? ` · ${friend.friend.email}` : ""}`
            : friend.friend.email ?? t["ui.phoneNotOnFile"]
        }
        action={
          <Button
            variant="primary"
            icon={<Plus size={16} aria-hidden />}
            onClick={() => router.push("/loans/new")}
          >
            {t["ui.friends.newLoan"]}
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          type={t["ui.friends.detail.summary.totalLent"]}
          label={t["ui.friends.detail.summary.totalLent"]}
          amount={formatMoney(friend.totalLent)}
          caption={t["ui.loansCountCaption"](friend.loanCount)}
        />
        <SummaryCard
          type={t["ui.friends.detail.summary.totalReceived"]}
          label={t["ui.friends.detail.summary.totalReceived"]}
          amount={formatMoney(friend.totalRepaid)}
          caption={
            friend.totalRepaid > 0
              ? t["ui.friends.detail.summary.paidBack"]
              : t["ui.friends.detail.summary.nothingRepaid"]
          }
        />
        <SummaryCard
          type={t["ui.friends.detail.summary.outstanding"]}
          label={t["ui.friends.detail.summary.outstanding"]}
          amount={formatMoney(friend.outstanding)}
          caption={
            friend.worstStatus === "Overdue"
              ? t["ui.friends.detail.summary.includesOverdue"]
              : friend.worstStatus === "Pending"
                ? t["ui.friends.detail.summary.awaiting"]
                : t["ui.friends.detail.summary.allSettled"]
          }
        />
      </div>

      {/* Loans */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between leading-6">
          <h2 className="font-semibold text-list-title text-text">
            {t["ui.friends.detail.loansHeading"]}
          </h2>
          <p className="font-normal text-helper text-muted">
            {t["ui.loansCountCaption"](loans.length)}
          </p>
        </div>
        {loans.length === 0 ? (
          <div className="rounded-card border border-border bg-surface p-6 text-center text-muted text-helper">
            {t["ui.friends.detail.noLoans"](friend.friend.name)}
          </div>
        ) : (
          <ul className="flex flex-col gap-3 md:gap-0 md:rounded-card md:border md:border-border md:bg-surface md:shadow-card md:overflow-hidden">
            {loans.map((loan, idx) => (
              <FriendLoanRow
                key={loan.id}
                loan={loan}
                today={today}
                isLast={idx === loans.length - 1}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Reminder history */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between leading-6">
          <h2 className="font-semibold text-list-title text-text">
            {t["ui.friends.detail.reminderHistoryHeading"]}
          </h2>
          <Link
            href="/reminders/history"
            className="font-normal text-helper text-brand-600 hover:underline"
          >
            {t["ui.friends.detail.viewAll"]}
          </Link>
        </div>
        {reminders.length === 0 ? (
          <div className="rounded-card border border-border bg-surface p-6 text-center text-muted text-helper">
            {t["ui.friends.detail.noReminders"]}
          </div>
        ) : (
          <ul className="flex flex-col rounded-card border border-border bg-surface shadow-card overflow-hidden">
            {reminders.slice(0, 5).map((r, idx) => (
              <li
                key={r.id}
                className={[
                  "flex items-center gap-4 px-6 py-4",
                  idx === Math.min(reminders.length, 5) - 1 ? "" : "border-b border-border",
                ].join(" ")}
              >
                <span className="flex size-9 items-center justify-center rounded-pill bg-brand-50">
                  {r.channel === "SMS" ? (
                    <MessageSquare size={16} className="text-brand-600" aria-hidden />
                  ) : (
                    <Mail size={16} className="text-brand-600" aria-hidden />
                  )}
                </span>
                <div className="flex min-w-0 flex-1 flex-col leading-[1.4]">
                  <span className="font-medium text-body text-text">
                    {r.channel === "SMS"
                      ? t["ui.friends.detail.smsReminder"]
                      : t["ui.friends.detail.emailReminder"]}
                  </span>
                  <span className="font-normal text-helper text-muted">
                    {formatDateTime(r.sentAt)}
                  </span>
                </div>
                <StatusBadge status={r.status === "Delivered" ? "Paid" : "Overdue"} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        onClick={() => {
          toast.show(t["ui.friendShortcutCopied"]);
          if (typeof navigator !== "undefined" && navigator.clipboard) {
            void navigator.clipboard.writeText(
              `${window.location.origin}/friends/${friend.friend.id}`,
            );
          }
        }}
        className="hidden"
        aria-hidden
      >
        copy
      </button>
    </section>
  );
}

function FriendLoanRow({
  loan,
  today,
  isLast,
}: {
  loan: Loan;
  today: Date;
  isLast: boolean;
}) {
  const { t } = useT();
  const isOverdue = loan.status === "Overdue";
  const overdueBy = isOverdue ? daysBetween(new Date(loan.dueDate), today) : 0;
  return (
    <li
      className={[
        "md:bg-surface",
        isLast ? "" : "border-b border-border",
      ].join(" ")}
    >
      <Link
        href={`/loans/${loan.id}`}
        className={[
          "flex items-center gap-4 px-6 py-4 md:h-[72px] hover:bg-neutral-50 transition-colors",
        ].join(" ")}
      >
        <Avatar name={loan.friend.name} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium text-body text-text">
            {loan.friend.name}
          </span>
          <span className="truncate font-normal text-helper text-muted">
            {t["ui.friends.detail.dueLabel"](formatDate(loan.dueDate))}
          </span>
        </div>
        <span className="font-medium text-body text-text">
          {formatMoney(loan.amount)}
        </span>
        <StatusBadge status={loan.status} />
      </Link>
      {isOverdue ? (
        <p className="md:hidden px-6 font-normal text-badge text-status-overdue-text">
          {t["ui.friends.detail.overdueBy"](overdueBy)}
        </p>
      ) : null}
      <HandCoins className="hidden" aria-hidden />
    </li>
  );
}