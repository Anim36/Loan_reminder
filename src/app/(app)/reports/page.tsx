"use client";

// Reports — /reports
//
// Header (title + range picker + CSV download button) +
// summary cards (Total lent / Total received / Outstanding /
// on-time rate) + monthly chart (zero-filled series) + status
// breakdown + top borrowers + friend reliability + upcoming
// due (next 7 days). Empty state and the "no CSV" error
// surface inline.
//
// Data: `useReportsQuery(range)` from `@/services/useQueries`
// reads `/api/reports?range=...` (server-side aggregation). The
// page only derives display strings from the result.

import Link from "next/link";
// (no router needed)
import { useState } from "react";
import {
  ArrowDown,
  Download,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Chip,
  SummaryCard,
  useToast,
} from "@/components/ui";
import { formatMoney, formatMoneyShort } from "@/lib/format";
import { applyNumeralMode } from "@/lib/i18n/format";
import { useT } from "@/lib/i18n/LanguageProvider";
import { useUserSettings } from "@/services/use-user-settings";
import {
  type ReportRange,
} from "@/services/reportService";
import { useReportsQuery, useExportReportMutation } from "@/services/useQueries";
import { useTranslateApiError } from "@/lib/useApiError";
import { PageHeader } from "@/components/layout/page-header";
import { CardHeading } from "@/components/layout/text";

const RANGES: ReportRange[] = ["3m", "6m", "12m", "all"];

export default function ReportsPage() {
  const { t, lang } = useT();
  const { settings } = useUserSettings();
  const numeralMode = settings.banglaNumerals ? "bn" : "latin";
  const [range, setRange] = useState<ReportRange>("6m");
  const reportsQ = useReportsQuery(range);
  const exportM = useExportReportMutation();
  const translateError = useTranslateApiError();
  const toast = useToast();

  const report = reportsQ.data;
  const isLoading = reportsQ.isLoading;
  const hasError = reportsQ.isError;

  function rangeLabel(r: ReportRange): string {
    if (r === "all") return t["ui.reportRangeAll"];
    if (r === "3m") return t["ui.reportRange3m"];
    if (r === "6m") return t["ui.reportRange6m"];
    return t["ui.reportRange12m"];
  }

  async function handleDownload() {
    if (!report) return;
    try {
      await exportM.mutateAsync(range);
    } catch (err) {
      toast.show(translateError(err));
    }
  }

  function retry() {
    reportsQ.refetch();
  }

  return (
    <section
      data-node-id="reports"
      className="flex w-full flex-col gap-6 p-6"
    >
      <PageHeader
        title={t["nav.reports"]}
        subtitle={t["ui.reports.subtitle"]}
        action={
          <Button
            variant="secondary"
            icon={<Download size={16} aria-hidden />}
            onClick={() => void handleDownload()}
            disabled={!report || exportM.isPending}
          >
            {exportM.isPending ? t["common.loading"] : t["reports.exportCsv"]}
          </Button>
        }
      />

      {/* Range picker */}
      <div className="flex flex-wrap items-center gap-2" role="tablist">
        {RANGES.map((r) => (
          <Chip
            key={r}
            selected={range === r}
            onClick={() => setRange(r)}
            role="tab"
            aria-selected={range === r}
          >
            {rangeLabel(r)}
          </Chip>
        ))}
      </div>

      {hasError ? (
        <ErrorState onRetry={retry} />
      ) : isLoading ? (
        <SkeletonState />
      ) : !report ? (
        <SkeletonState />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryCard
              type="Total Lent"
              label={t["reports.totalLent"]}
              amount={formatMoney(report.totalLent, numeralMode)}
              caption={
                report.startDate
                  ? `${t["ui.reports.since"](report.startDate)}`
                  : t["ui.reports.allTime"]
              }
            />
            <SummaryCard
              type="Total Received"
              label={t["reports.totalReceived"]}
              amount={formatMoney(report.totalReceived, numeralMode)}
              caption={t["ui.reports.since"](report.startDate ?? "—")}
            />
            <SummaryCard
              type="Outstanding"
              label={t["reports.outstanding"]}
              amount={formatMoney(report.outstanding, numeralMode)}
              caption={t["ui.reports.outstandingHelper"]}
            />
            <SummaryCard
              type="On-time"
              label={t["reports.onTimeRate"]}
              amount={`${report.onTimeRate}%`}
              caption={t["ui.reports.onTimeHelper"]}
            />
          </div>

          {/* Monthly chart */}
          <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card">
            <div className="flex items-center justify-between leading-6">
              <CardHeading>{t["reports.lentVsReceived"]}</CardHeading>
              <p className="font-normal text-helper text-muted">
                {t["ui.reports.monthlyHelper"]}
              </p>
            </div>
            {report.monthly.length === 0 ? (
              <div className="rounded-input border border-dashed border-border p-6 text-center text-muted text-helper">
                {t["common.empty"]}
              </div>
            ) : (
              <MonthlyBars points={report.monthly} numeralMode={numeralMode} />
            )}
          </section>

          {/* Status breakdown */}
          <section className="flex flex-col gap-3">
            <CardHeading>{t["reports.statusBreakdown"]}</CardHeading>
            <div className="grid grid-cols-3 gap-3">
              {(["Paid", "Pending", "Overdue"] as const).map((s) => {
                const labelKey = (
                  {
                    Paid: "reports.status.paid",
                    Pending: "reports.status.pending",
                    Overdue: "reports.status.overdue",
                  } as const
                )[s];
                return (
                  <SummaryCard
                    key={s}
                    type={s}
                    label={t[labelKey]}
                    amount={String(report.statusBreakdown[s] ?? 0)}
                    caption={t["ui.reports.loans"]}
                  />
                );
              })}
            </div>
          </section>

          {/* Top borrowers */}
          <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card">
            <CardHeading>{t["reports.topBorrowers"]}</CardHeading>
            {report.topBorrowers.length === 0 ? (
              <p className="font-normal text-helper text-muted">
                {t["reports.noBorrowers"]}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {report.topBorrowers.map((b, i) => (
                  <li
                    key={b.friendId}
                    className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-b-0"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-pill bg-brand-50 text-badge font-semibold text-brand-600">
                        {i + 1}
                      </span>
                      <span className="truncate font-medium text-body text-text">
                        {b.friendName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <span className="font-normal text-helper text-muted">
                        {t["ui.reportsLoansCount"](b.loans)}
                      </span>
                      <span className="tabular font-medium text-body text-text">
                        {formatMoneyShort(b.outstanding, numeralMode)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Average repay days */}
          <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <SummaryCard
              type="Avg days to repay"
              label={t["ui.reportsAvgRepayLate"]}
              amount={
                report.avgRepayDays === null
                  ? "—"
                  : formatNum(report.avgRepayDays, numeralMode)
              }
              caption={t["ui.reports.avgHelper"]}
            />
            <SummaryCard
              type="Friend reliability"
              label={t["ui.reports.reliability"]}
              amount={String(report.reliability.length)}
              caption={t["ui.reports.reliabilityHelper"]}
            />
          </section>

          {/* Upcoming due this week */}
          <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card">
            <CardHeading>{t["ui.reports.upcoming"]}</CardHeading>
            {report.upcoming.length === 0 ? (
              <p className="font-normal text-helper text-muted">
                {t["common.empty"]}
              </p>
            ) : (
              <ul className="flex flex-col">
                {report.upcoming.map((u) => (
                  <li
                    key={u.loanId}
                    className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-b-0"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Link
                        href={`/loans/${u.loanId}`}
                        className="truncate font-medium text-body text-text hover:underline"
                      >
                        {u.friendName}
                      </Link>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <span className="font-normal text-helper text-muted">
                        {dueLabel(u.daysUntilDue, t, lang)}
                      </span>
                      <span className="tabular font-medium text-body text-text">
                        {formatMoneyShort(u.amount, numeralMode)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <Link
        href="/dashboard"
        className="inline-flex w-fit items-center gap-1.5 text-helper font-normal text-muted hover:text-text"
      >
        {t["ui.backToDashboard"]}
      </Link>
    </section>
  );
}

function dueLabel(
  days: number,
  t: ReturnType<typeof useT>["t"],
  lang: "en" | "bn",
): string {
  if (days === 0) return t["loans.dueToday"];
  if (days === 1) return t["loans.dueTomorrow"];
  if (days > 1) {
    return lang === "bn"
      ? `আগামী ${days} দিন`
      : `in ${days} days`;
  }
  return t["status.overdue"];
}

function formatNum(n: number, mode: "latin" | "bn"): string {
  return applyNumeralMode(n.toFixed(1), mode);
}

function SkeletonState() {
  return (
    <div
      className="flex min-h-[40vh] flex-col gap-3"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading…</span>
      <div className="h-24 w-full animate-pulse rounded-input bg-neutral-50" />
      <div className="h-40 w-full animate-pulse rounded-card bg-neutral-50" />
      <div className="h-24 w-full animate-pulse rounded-card bg-neutral-50" />
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useT();
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface p-6 shadow-card">
      <p className="font-semibold text-list-title text-text">
        {t["app.error.title"]}
      </p>
      <p className="font-normal text-helper text-muted">
        {t["app.error.body"]}
      </p>
      <Button
        variant="secondary"
        icon={<TrendingUp size={16} aria-hidden />}
        onClick={onRetry}
      >
        {t["app.error.retry"]}
      </Button>
    </div>
  );
}

function MonthlyBars({
  points,
  numeralMode,
}: {
  points: Array<{ key: string; label: string; lent: number; received: number }>;
  numeralMode: "latin" | "bn";
}) {
  const max = Math.max(
    1,
    ...points.flatMap((p) => [p.lent, p.received]),
  );
  return (
    <div className="grid grid-cols-12 items-end gap-2" style={{ minHeight: 160 }}>
      {points.map((p) => (
        <div key={p.key} className="flex flex-col items-center gap-1">
          <div className="flex w-full items-end gap-1" style={{ height: 120 }}>
            <div
              className="flex-1 rounded-t-input bg-brand-600"
              style={{
                height: `${Math.max(2, (p.lent / max) * 100)}%`,
              }}
              title={`Lent: ${formatMoney(p.lent, numeralMode)}`}
            />
            <div
              className="flex-1 rounded-t-input bg-brand-200"
              style={{
                height: `${Math.max(2, (p.received / max) * 100)}%`,
              }}
              title={`Received: ${formatMoney(p.received, numeralMode)}`}
            />
          </div>
          <span className="truncate text-eyebrow font-normal text-muted">
            {p.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// Mark the variable as used to satisfy TS noUnusedLocals.
export const _reportsHint = ArrowDown;
