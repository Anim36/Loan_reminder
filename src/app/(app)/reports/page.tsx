"use client";

// Reports page.
// Figma frame: none. Layout was matched by reusing the rhythm from
// the closest existing frames (Dashboard, Loans, Loan details) and
// the design tokens in `@theme inline` (globals.css).
//
// Sections (top to bottom):
//   1. Header — H1 + subhead, range selector
//   2. Four SummaryCards
//   3. Lent vs Received SVG bar chart + table alternative
//   4. Status breakdown (bars, color-coded)
//   5. Top borrowers + Average time to repay
//   6. Friend reliability list
//   7. Upcoming due this week
//   8. Export CSV ghost button (loans in range)
//
// i18n: every visible string (and the chart's aria label and SVG
// tooltips) is read from the dictionary.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Download,
} from "lucide-react";
import {
  Chip,
  EmptyState,
  SummaryCard,
  useToast,
} from "@/components/ui";
import { useLoans } from "@/services/use-loans";
import { useToday } from "@/lib/use-today";
import { formatDate, formatMoney, formatMoneyShort } from "@/lib/format";
import { applyNumeralMode } from "@/lib/i18n/format";
import { useT } from "@/lib/i18n/LanguageProvider";
import { useUserSettings } from "@/services/use-user-settings";
import {
  computeReport,
  formatCsv,
  type ReportRange,
} from "@/services/reportService";
import { PageHeader } from "@/components/layout/page-header";
import { CardHeading } from "@/components/layout/text";

const RANGES: ReportRange[] = ["3m", "6m", "12m", "all"];

export default function ReportsPage() {
  const router = useRouter();
  const { t, lang } = useT();
  const { loansByStatus, ready } = useLoans();
  const today = useToday();
  const { settings } = useUserSettings();
  const numeralMode = settings.banglaNumerals ? "bn" : "latin";
  const [range, setRange] = useState<ReportRange>("6m");

  const report = useMemo(
    () => computeReport(loansByStatus, today, range),
    [loansByStatus, range, today],
  );
  const toast = useToast();

  const isEmpty = loansByStatus.length === 0;

  function rangeLabel(r: ReportRange): string {
    if (r === "all") return t["ui.reportRangeAll"];
    if (r === "3m") return t["ui.reportRange3m"];
    if (r === "6m") return t["ui.reportRange6m"];
    return t["ui.reportRange12m"];
  }

  return (
    <section
      data-node-id="reports"
      className="flex w-full flex-col gap-6 p-6"
    >
      {/* Header */}
      <PageHeader
        title={t["reports.title"]}
        subtitle={t["reports.subtitle"]}
        action={
          <div
            className="flex flex-wrap items-center gap-2"
            role="tablist"
            aria-label={t["ui.reportRangeAria"]}
          >
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
        }
      />

      {isEmpty ? (
        <div className="rounded-card border border-border bg-surface p-6 shadow-card">
          <EmptyState
            type="Loans"
            onAddLoan={() => router.push("/loans/new")}
          />
        </div>
      ) : (
        <>
          {/* 4 summary cards */}
          <div className="grid w-full grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryCard
              variant="Total Lent"
              label={t["reports.totalLent"]}
              type={t["reports.totalLent"]}
              amount={formatMoney(report.totalLent, numeralMode)}
              caption={t["ui.reportsLoansCount"](report.rows.length)}
            />
            <SummaryCard
              variant="Total Received"
              label={t["reports.totalReceived"]}
              type={t["reports.totalReceived"]}
              amount={formatMoney(report.totalReceived, numeralMode)}
              caption={t["ui.reportsPaidCount"](report.statusBreakdown.Paid)}
            />
            <SummaryCard
              variant="Outstanding"
              label={t["reports.outstanding"]}
              type={t["reports.outstanding"]}
              amount={formatMoney(report.outstanding, numeralMode)}
              caption={
                report.outstanding === 0
                  ? t["ui.reportsStatusAllSettled"]
                  : t["ui.reportsStatusOutstanding"]
              }
            />
            <SummaryCard
              variant="On-time rate"
              label={t["reports.onTimeRate"]}
              type={t["reports.onTimeRate"]}
              amount={`${applyNumeralMode(String(report.onTimeRate), numeralMode)}%`}
              caption={
                report.onTimeRate >= 90
                  ? t["ui.reportsStatusExcellent"]
                  : report.onTimeRate >= 70
                    ? t["ui.reportsStatusGood"]
                    : t["ui.reportsStatusImprove"]
              }
            />
          </div>

          {/* Chart: Lent vs Received */}
          <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card">
            <div className="flex items-center justify-between">
              <CardHeading>{t["reports.lentVsReceived"]}</CardHeading>
              <Legend t={t} />
            </div>
            <MonthlyChart buckets={report.monthly} numeralMode={numeralMode} t={t} />
            <MonthlyTable buckets={report.monthly} numeralMode={numeralMode} t={t} />
          </div>

          {/* Two columns: status + top borrowers */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card">
              <CardHeading>{t["reports.statusBreakdown"]}</CardHeading>
              <StatusBars
                paid={report.statusBreakdown.Paid}
                pending={report.statusBreakdown.Pending}
                overdue={report.statusBreakdown.Overdue}
                numeralMode={numeralMode}
                t={t}
              />
            </div>
            <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card">
              <CardHeading>{t["reports.topBorrowers"]}</CardHeading>
              {report.topBorrowers.length === 0 ? (
                <p className="text-body font-normal text-placeholder">—</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {report.topBorrowers.map((b) => (
                    <li key={b.friendId} className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="flex size-9 items-center justify-center rounded-pill bg-brand-50 font-semibold text-body text-brand-600"
                      >
                        {b.friendName.charAt(0).toUpperCase()}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <Link
                          href={`/friends/${b.friendId}`}
                          className="truncate text-body font-medium text-text hover:text-brand-600"
                        >
                          {b.friendName}
                        </Link>
                        <p className="text-helper font-normal text-muted">
                          {t["ui.reportsLoansCount"](b.loans)}
                        </p>
                      </div>
                      <p className="tabular font-semibold text-body text-text">
                        {formatMoney(b.outstanding, numeralMode)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Reliability + average time to repay */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card">
              <CardHeading>{t["reports.avgRepayTime"](report.avgRepayDays ?? 0)}</CardHeading>
              <p className="font-normal text-body text-muted">
                {report.avgRepayDays === null
                  ? t["ui.reportsAvgRepayNone"]
                  : report.avgRepayDays <= 0
                    ? t["ui.reportsAvgRepayOnTime"]
                    : t["ui.reportsAvgRepayLate"]}
              </p>
            </div>
            <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card">
              <CardHeading>{t["reports.reliability"]}</CardHeading>
              {report.reliability.length === 0 ? (
                <p className="text-body font-normal text-placeholder">—</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {report.reliability.map((r) => (
                    <li
                      key={r.friendId}
                      className="flex items-center gap-3"
                    >
                      <span
                        aria-hidden
                        className={[
                          "inline-flex size-2 rounded-pill",
                          r.bucket === "always"
                            ? "bg-status-paid-text"
                            : r.bucket === "sometimes"
                              ? "bg-status-pending-text"
                              : "bg-status-overdue-text",
                        ].join(" ")}
                      />
                      <p className="flex-1 text-body font-normal text-text">
                        {r.friendName}
                      </p>
                      <p className="text-helper font-normal text-muted">
                        {r.bucket === "always"
                          ? t["reports.reliability.always"]
                          : r.bucket === "sometimes"
                            ? t["reports.reliability.sometimes"]
                            : t["reports.reliability.often"]}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Upcoming */}
          <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card">
            <CardHeading>{t["reports.upcoming"]}</CardHeading>
            {report.upcoming.length === 0 ? (
              <p className="text-body font-normal text-placeholder">
                {t["reports.upcomingEmpty"]}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {report.upcoming.map((u) => (
                  <li
                    key={u.loanId}
                    className="flex items-center gap-3 rounded-input border border-border bg-bg px-3 py-2"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-brand-50 text-brand-600">
                      <Calendar className="size-4" aria-hidden />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="truncate text-body font-medium text-text">
                        {u.friendName}
                      </p>
                      <p className="text-helper font-normal text-muted">
                        {formatDate(u.dueDate, { lang, numeralMode })} ·{" "}
                        {u.daysUntilDue === 0
                          ? t["ui.upcomingToday"]
                          : u.daysUntilDue === 1
                            ? t["ui.upcomingTomorrow"]
                            : t["ui.upcomingInDays"](u.daysUntilDue)}
                      </p>
                    </div>
                    <p className="tabular font-semibold text-body text-text">
                      {formatMoney(u.amount, numeralMode)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Export CSV */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                const csv = formatCsv(report.rows);
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `loans-${range}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                toast.show(t["ui.reportRangeExport"]);
              }}
              className="inline-flex items-center gap-1.5 rounded-input border border-border bg-surface px-4 py-2 text-helper font-semibold text-text hover:border-brand-600 hover:text-brand-600"
            >
              <Download className="size-4" aria-hidden />
              {t["ui.reportRangeExport"]}
            </button>
          </div>
        </>
      )}

      {!ready ? <span className="sr-only">{t["ui.loadingReports"]}</span> : null}
    </section>
  );
}

function Legend({ t }: { t: ReturnType<typeof useT>["t"] }) {
  return (
    <div className="flex items-center gap-3 text-helper text-muted">
      <span className="inline-flex items-center gap-1">
        <span className="inline-block size-2 rounded-pill bg-brand-600" aria-hidden />
        {t["ui.legend.lent"]}
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block size-2 rounded-pill bg-muted" aria-hidden />
        {t["ui.legend.received"]}
      </span>
    </div>
  );
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** X-axis label: short month name, with the year appended only on the
 *  first bucket of a new year. Falls back to the bucket's full label
 *  if the key isn't a YYYY-MM string (e.g. custom data sources). */
function axisLabel(
  bucket: { key: string; label: string },
  index: number,
  buckets: Array<{ key: string }>,
): string {
  const m = /^(\d{4})-(\d{2})$/.exec(bucket.key);
  if (!m) return bucket.label;
  const year = m[1];
  const monthIndex = Number(m[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return bucket.label;
  const short = MONTH_NAMES[monthIndex];
  // Append the year when this bucket is the first of a new year.
  if (index === 0) return `${short} ${year}`;
  const prev = /^(\d{4})-(\d{2})$/.exec(buckets[index - 1].key);
  if (prev && prev[1] !== year) return `${short} ${year}`;
  return short;
}

function MonthlyChart({
  buckets,
  numeralMode,
  t,
}: {
  buckets: Array<{ key: string; label: string; lent: number; received: number }>;
  numeralMode: "latin" | "bn";
  t: ReturnType<typeof useT>["t"];
}) {
  // The chart is rendered in real pixel coordinates (no viewBox) so
  // that `fontSize: 11` is a literal 11px on screen. A `ResizeObserver`
  // re-measures the container so the bars reflow when the viewport
  // grows or the language switches (Bangla labels take more width).
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(560);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setWidth(w);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Layout constants — all in px.
  const height = 220;
  const padding = { top: 16, right: 16, bottom: 28, left: 48 };
  const innerW = Math.max(1, width - padding.left - padding.right);
  const innerH = height - padding.top - padding.bottom;
  const maxY = Math.max(
    1,
    ...buckets.flatMap((b) => [b.lent, b.received]),
  );
  const barGroupW = innerW / Math.max(1, buckets.length);
  const barW = Math.max(6, barGroupW / 3);
  return (
    <div ref={containerRef} className="w-full">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={t["ui.reportsChartAria"]}
        className="block"
      >
        {/* Y-axis ticks — abbreviated values (৳10k, ৳32.5k) so the
            left edge has room. */}
        {Array.from({ length: 4 }).map((_, i) => {
          const y = padding.top + (innerH / 3) * i;
          const v = Math.round(maxY - (maxY / 3) * i);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="currentColor"
                className="text-border"
                strokeWidth={1}
                opacity={i === 3 ? 1 : 0.3}
              />
              <text
                x={padding.left - 6}
                y={y + 4}
                textAnchor="end"
                className="fill-muted tabular"
                style={{ fontSize: 11 }}
              >
                {formatMoneyShort(v, numeralMode)}
              </text>
            </g>
          );
        })}
        {/* Bars */}
        {buckets.map((b, i) => {
          const x0 = padding.left + i * barGroupW + barGroupW / 2;
          const lentH = (b.lent / maxY) * innerH;
          const recvH = (b.received / maxY) * innerH;
          const lentY = padding.top + innerH - lentH;
          const recvY = padding.top + innerH - recvH;
          return (
            <g key={b.key}>
              <rect
                x={x0 - barW - 2}
                y={lentY}
                width={barW}
                height={lentH}
                rx={3}
                className="fill-brand-600"
              >
                <title>
                  {t["ui.reportsChartTooltipLent"](
                    b.label,
                    formatMoney(b.lent, numeralMode),
                  )}
                </title>
              </rect>
              <rect
                x={x0 + 2}
                y={recvY}
                width={barW}
                height={recvH}
                rx={3}
                className="fill-muted"
              >
                <title>
                  {t["ui.reportsChartTooltipReceived"](
                    b.label,
                    formatMoney(b.received, numeralMode),
                  )}
                </title>
              </rect>
              <text
                x={x0}
                y={height - 8}
                textAnchor="middle"
                className="fill-muted"
                style={{ fontSize: 11 }}
              >
                {axisLabel(b, i, buckets)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MonthlyTable({
  buckets,
  numeralMode,
  t,
}: {
  buckets: Array<{ key: string; label: string; lent: number; received: number }>;
  numeralMode: "latin" | "bn";
  t: ReturnType<typeof useT>["t"];
}) {
  return (
    <div className="sr-only">
      <table>
        <caption>{t["reports.lentVsReceivedTable"]}</caption>
        <thead>
          <tr>
            <th scope="col">{t["reports.month"]}</th>
            <th scope="col">{t["reports.lent"]}</th>
            <th scope="col">{t["reports.received"]}</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.key}>
              <th scope="row">{b.label}</th>
              <td>{formatMoney(b.lent, numeralMode)}</td>
              <td>{formatMoney(b.received, numeralMode)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBars({
  paid,
  pending,
  overdue,
  numeralMode,
  t,
}: {
  paid: number;
  pending: number;
  overdue: number;
  numeralMode: "latin" | "bn";
  t: ReturnType<typeof useT>["t"];
}) {
  const total = Math.max(1, paid + pending + overdue);
  return (
    <ul className="flex flex-col gap-3">
      {[
        {
          label: t["reports.status.paid"],
          count: paid,
          className: "bg-status-paid-text",
          unitLabel: t["ui.statusLoansUnit"],
        },
        {
          label: t["reports.status.pending"],
          count: pending,
          className: "bg-status-pending-text",
          unitLabel: t["ui.statusLoansUnit"],
        },
        {
          label: t["reports.status.overdue"],
          count: overdue,
          className: "bg-status-overdue-text",
          unitLabel: t["ui.statusLoansUnit"],
        },
      ].map((row) => (
        <li key={row.label} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-helper font-normal text-text">
            <span>{row.label}</span>
            <span className="text-muted">
              {t["ui.statusCounts"](
                applyNumeralMode(String(row.count), numeralMode),
                row.unitLabel,
              )}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-pill bg-brand-50">
            <div
              className={["h-full rounded-pill", row.className].join(" ")}
              style={{ width: `${(row.count / total) * 100}%` }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round((row.count / total) * 100)}
              aria-label={row.label}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}