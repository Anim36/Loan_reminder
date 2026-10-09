"use client";

// Dashboard page.
// Figma frames: Dashboard Desktop (10:3868) and Mobile (10:4024), plus
// the Empty (10:4431 / 10:4497) and Dark (10:4654 / 10:4810) variants.
//
// Layout summary (per the Figma frame):
//   1. Header — "Hi, Ayesha" greeting, weekday/date overline, the
//      "Reports" link in the header for mobile / desktop access, and
//      a "Add loan" primary CTA.
//   2. 4 summary cards: Total Lent, Total Received, Pending, Overdue.
//      Totals are derived from the live loans list:
//        Total Lent    = sum(loan.amount)
//        Total Received = sum(loan.payments.amount)
//        Pending       = sum(loan.amount - sum(payments)) for status=Pending
//        Overdue       = sum(loan.amount - sum(payments)) for status=Overdue
//   3. Gentle attention row — only when there are overdue loans.
//   4. Status filter chips (All / Pending / Overdue / Paid).
//   5. Recent loans list with the partial-paid progress text under the
//      amount.
//   6. Floating "Add loan" pill — fixed bottom-right.
//
// Data: subscribes to the loans store via `useLoans()` (which already
// caches by raw localStorage string). The summary cards derive from
// `loansByStatus` so a re-render that only changes a status still
// produces a fresh list with the new statuses already baked in.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  HandCoins,
  Plus,
} from "lucide-react";
import {
  amountPaid,
  remainingAmount,
} from "@/services/loanService";
import { useLoans } from "@/services/use-loans";
import {
  Chip,
  EmptyState,
  QueryErrorState,
  SummaryCard,
} from "@/components/ui";
import { PageHeader } from "@/components/layout/page-header";
import { useToday } from "@/lib/use-today";
import {
  daysBetween,
  formatDate,
  formatMoney,
  formatOverlineDate,
  greetingFor,
} from "@/lib/format";
import { useT } from "@/lib/i18n/LanguageProvider";
import { useUserSettings } from "@/services/use-user-settings";
import type { Loan } from "@/types";
import { TodayProvider } from "./today-context";

const STATUS_FILTERS = ["All", "Pending", "Overdue", "Paid"] as const;
type Filter = (typeof STATUS_FILTERS)[number];

export default function DashboardPage() {
  return (
    <TodayProvider>
      <Dashboard />
    </TodayProvider>
  );
}

function Dashboard() {
  const router = useRouter();
  const { t, lang } = useT();
  const today = useToday();
  const { settings } = useUserSettings();
  const numeralMode = settings.banglaNumerals ? "bn" : "latin";
  // The dashboard's summary numbers and recent-loans list both come
  // from `useLoans()`. If the request failed, `loansByStatus` is `[]`
  // and we'd otherwise show "no loans yet" — which is misleading.
  // We branch on `isError` to render a real error state with a
  // retry button instead.
  const { loansByStatus, ready, isError, error, refresh } = useLoans();
  const [filter, setFilter] = useState<Filter>("All");

  // ---- Derived values -------------------------------------------
  const { totals, activeCount, overdueCount } = useMemo(() => {
    let lent = 0;
    let received = 0;
    let pending = 0;
    let overdue = 0;
    let active = 0;
    let due = 0;
    for (const l of loansByStatus) {
      lent += l.amount;
      received += amountPaid(l);
      const r = remainingAmount(l);
      if (l.status === "Overdue") {
        overdue += r;
        due += 1;
      }
      if (l.status === "Pending") pending += r;
      if (l.status !== "Paid") active += 1;
    }
    return {
      totals: { lent, received, pending, overdue },
      activeCount: active,
      overdueCount: due,
    };
  }, [loansByStatus]);

  const isEmpty = loansByStatus.length === 0;

  // ---- Filtering ------------------------------------------------
  const filteredLoans = useMemo(() => {
    const base = loansByStatus.filter((l) => {
      if (filter === "All") return true;
      return l.status === filter;
    });
    return base.sort((a, b) => {
      const ka = a.status === "Overdue" ? 0 : a.status === "Pending" ? 1 : 2;
      const kb = b.status === "Overdue" ? 0 : b.status === "Pending" ? 1 : 2;
      if (ka !== kb) return ka - kb;
      return a.dueDate < b.dueDate ? -1 : 1;
    });
  }, [filter, loansByStatus]);

  return (
    <section
      data-node-id="10:3868/10:4024"
      className="flex w-full flex-col gap-6 p-6 md:gap-7"
    >
      {/* Header — eyebrow overline + greeting + reports + add loan */}
      <PageHeader
        eyebrow={formatOverlineDate(today, lang, numeralMode)}
        title={t["ui.dashboard.greeting"](greetingFor(today, lang))}
        action={
          <>
            <Link
              href="/reports"
              className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-2 text-helper font-medium text-text hover:border-brand-600 hover:text-brand-600"
            >
              <BarChart3 className="size-4" aria-hidden />
              {t["nav.reports"]}
            </Link>
            <Link
              href="/loans/new"
              className="inline-flex items-center gap-1.5 rounded-pill bg-brand-600 px-4 py-2 text-helper font-semibold text-white hover:bg-[#176348]"
            >
              <Plus className="size-4" aria-hidden />
              {t["dashboard.addLoan"]}
            </Link>
          </>
        }
      />

      {/* When the loans request failed, we replace the summary
       *  cards + list with a single error block so the user knows
       *  the empty state is a real failure, not "no loans yet". */}
      {isError ? (
        <QueryErrorState
          error={error}
          onRetry={() => {
            void refresh();
          }}
        />
      ) : (
        <>
          {/* Summary cards */}
          <div
            data-node-id="10:3912"
            className="grid w-full grid-cols-2 gap-3 lg:grid-cols-4"
          >
        <SummaryCard
          type="Total Lent"
          label={t["dashboard.totalLent"]}
          amount={formatMoney(totals.lent, numeralMode)}
          caption={
            isEmpty
              ? t["common.empty"]
              : t["dashboard.activeLoans"](activeCount)
          }
        />
        <SummaryCard
          type="Total Received"
          label={t["dashboard.totalReceived"]}
          amount={formatMoney(totals.received, numeralMode)}
          caption={
            isEmpty
              ? t["common.empty"]
              : t["dashboard.paidBack"](
                  loansByStatus.filter((l) => l.status === "Paid").length,
                )
          }
        />
        <SummaryCard
          type="Pending"
          label={t["dashboard.pending"]}
          amount={formatMoney(totals.pending, numeralMode)}
          caption={
            isEmpty
              ? t["common.empty"]
              : t["dashboard.awaiting"](
                  loansByStatus.filter((l) => l.status === "Pending").length,
                )
          }
        />
        <SummaryCard
          type="Overdue"
          label={t["dashboard.overdue"]}
          amount={formatMoney(totals.overdue, numeralMode)}
          caption={
            isEmpty
              ? t["common.empty"]
              : t["dashboard.pastDue"](
                  loansByStatus.filter((l) => l.status === "Overdue").length,
                )
          }
        />
      </div>

      {/* Gentle attention — amber notice when there are overdue loans. */}
      {overdueCount > 0 ? (
        <div
          data-node-id="10:3918"
          className="flex items-center gap-3 overflow-clip rounded-input bg-status-pending-bg p-4"
          role="status"
        >
          <Bell size={18} className="shrink-0 text-status-pending-text" aria-hidden />
          <p className="flex-1 min-w-0 font-normal text-helper leading-[1.5] text-status-pending-text">
            {t["dashboard.overdueNotice"](overdueCount)}
          </p>
        </div>
      ) : null}

      {/* Status filter chips */}
      <div
        data-node-id="10:4207"
        className="flex items-start gap-2"
        role="tablist"
        aria-label={t["ui.loansList.status.aria"]}
      >
        {STATUS_FILTERS.map((f) => (
          <Chip
            key={f}
            selected={filter === f}
            onClick={() => setFilter(f)}
            role="tab"
            aria-selected={filter === f}
          >
            {chipLabel(f, t)}
          </Chip>
        ))}
      </div>

      {/* Recent loans list */}
      <div data-node-id="10:3941" className="flex flex-col gap-3">
        <div className="flex items-center justify-between leading-6">
          <h2 className="font-semibold text-list-title text-text">
            {t["dashboard.recent"]}
          </h2>
          <Link
            href="/loans"
            className="inline-flex items-center gap-1 text-helper font-medium text-muted hover:text-text"
          >
            {t["dashboard.seeAll"]}
            <ArrowUpRight className="size-3" aria-hidden />
          </Link>
        </div>

        {isEmpty ? (
          <div className="rounded-card border border-border bg-surface shadow-card p-6">
            <EmptyState
              type="Loans"
              onAddLoan={() => router.push("/loans/new")}
            />
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="rounded-card border border-border bg-surface p-6 text-center text-muted text-helper">
            {t["common.empty"]}
          </div>
        ) : (
          <ul className="flex flex-col rounded-card border border-border bg-surface shadow-card overflow-hidden">
            {filteredLoans.map((loan, idx) => (
              <RecentLoanRow
                key={loan.id}
                loan={loan}
                today={today}
                isLast={idx === filteredLoans.length - 1}
                numeralMode={numeralMode}
                lang={lang}
                t={t}
              />
            ))}
          </ul>
        )}
      </div>

      </>
      )}

      {/* Floating add loan pill */}
      <Link
        href="/loans/new"
        aria-label={t["ui.dashboard.addLoan.aria"]}
        data-node-id="10:4806/10:4150"
        className="fixed bottom-6 right-6 z-20 inline-flex items-center justify-center gap-2 rounded-pill bg-brand-600 px-6 py-4 text-white shadow-overlay transition-colors hover:bg-brand-700 md:bottom-8 md:right-8"
      >
        <Plus size={18} aria-hidden="true" />
        <span className="whitespace-nowrap font-semibold text-body">
          {t["dashboard.addLoan"]}
        </span>
      </Link>

      {!ready ? (
        <span className="sr-only">{t["ui.loadingLoans"]}</span>
      ) : null}
    </section>
  );
}

function chipLabel(
  f: Filter,
  t: ReturnType<typeof useT>["t"],
): string {
  // The chip keys are simple string entries; cast to a string map to
  // bypass the union-typed Dictionary (which has a few function leaves).
  const map = t as unknown as Record<string, string | ((n: number) => string)>;
  const v = map[`loans.chip.${f.toLowerCase()}`];
  if (typeof v === "string") return v;
  return f;
}

function RecentLoanRow({
  loan,
  today,
  isLast,
  numeralMode,
  lang,
  t,
}: {
  loan: Loan;
  today: Date;
  isLast: boolean;
  numeralMode: "latin" | "bn";
  lang: "en" | "bn";
  t: ReturnType<typeof useT>["t"];
}) {
  const due = new Date(loan.dueDate);
  const daysToDue = daysBetween(today, due);
  const overdueBy = daysToDue < 0 ? -daysToDue : 0;
  const daysUntil = daysToDue > 0 ? daysToDue : 0;
  const paid = amountPaid(loan);
  const balance = remainingAmount(loan);
  const isPaid = balance === 0;
  const isPartial = !isPaid && paid > 0;
  return (
    <li
      className={[
        "flex items-center gap-3 p-4",
        isLast ? "" : "border-b border-border",
      ].join(" ")}
    >
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-brand-50 text-brand-600"
      >
        <HandCoins size={18} />
      </span>
      <Link
        href={`/loans/${loan.id}`}
        className="flex min-w-0 flex-1 flex-col gap-0.5"
      >
        <p className="font-medium text-body text-text">{loan.friend.name}</p>
        <p className="font-normal text-helper text-muted">
          {isPaid
            ? t["dashboard.paidOn"](formatDate(loan.dueDate, { lang, numeralMode }))
            : overdueBy > 0
              ? t["loans.overdueBy"](overdueBy)
              : t["loans.dueIn"](daysUntil)}
        </p>
      </Link>
      <div className="flex flex-col items-end gap-0.5">
        <p className="tabular font-semibold text-body text-text">
          {formatMoney(loan.amount, numeralMode)}
        </p>
        {isPartial ? (
          <p className="tabular font-normal text-helper text-muted">
            {t["loans.partial"](
              formatMoney(paid, numeralMode),
              formatMoney(loan.amount, numeralMode),
            )}
          </p>
        ) : null}
      </div>
    </li>
  );
}
