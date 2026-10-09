// Reports — pure derive layer.
//
// Everything in this module is a pure function over a list of loans.
// No I/O, no localStorage, no React. The /reports page passes its
// `loansByStatus` and `today` into `computeReport()` and renders the
// returned snapshot. CSV export is a small formatter that also lives
// here so the data shape is defined in one place.

import type { Loan, LoanStatus } from "@/types";
import { amountPaid, remainingAmount } from "./loanService";

export type ReportRange = "3m" | "6m" | "12m" | "all";

/** Number of whole months back from `today` for a given range. */
function rangeMonths(range: ReportRange): number | null {
  switch (range) {
    case "3m":
      return 3;
    case "6m":
      return 6;
    case "12m":
      return 12;
    case "all":
      return null;
  }
}

/** A single monthly bucket for the lent-vs-received chart. */
export interface MonthlyBucket {
  /** YYYY-MM */
  key: string;
  /** English/Bangla-independent month label, e.g. "Oct 2026". */
  label: string;
  lent: number;
  received: number;
}

/** A single friend reliability label. */
export interface ReliabilityRow {
  friendId: string;
  friendName: string;
  /** Average days past due over the friend's settled loans. */
  avgDaysLate: number;
  /** How many loans they have. */
  loans: number;
  bucket: "always" | "sometimes" | "often";
}

export interface UpcomingDue {
  loanId: string;
  friendName: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
}

export interface ReportSnapshot {
  range: ReportRange;
  /** Inclusive lower bound (ISO date) for the period, or `null` for "all time". */
  startDate: string | null;
  totalLent: number;
  totalReceived: number;
  outstanding: number;
  /** 0–100 percentage. */
  onTimeRate: number;
  statusBreakdown: Record<LoanStatus, number>;
  monthly: MonthlyBucket[];
  topBorrowers: Array<{ friendId: string; friendName: string; outstanding: number; loans: number }>;
  reliability: ReliabilityRow[];
  avgRepayDays: number | null;
  upcoming: UpcomingDue[];
  /** All loans in range for CSV export. */
  rows: Loan[];
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function ymKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ymLabel(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Subtract `months` from a date, returning the same day-of-month when
 *  possible (clamps to the last day for short months). */
function subtractMonths(d: Date, months: number): Date {
  const target = new Date(d.getFullYear(), d.getMonth() - months, 1);
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), endOfMonth(target).getDate()));
}

/** Add N whole months to a date, clamped. */
function addMonths(d: Date, months: number): Date {
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), endOfMonth(target).getDate()));
}

/** Filter helper: only include loans whose `dateGiven` falls in the
 *  range. Returns the same array reference when the range is "all". */
function filterByRange(loans: Loan[], range: ReportRange, today: Date): {
  start: Date | null;
  rows: Loan[];
} {
  const months = rangeMonths(range);
  if (months === null) return { start: null, rows: loans };
  const start = subtractMonths(startOfMonth(today), months - 1);
  return {
    start,
    rows: loans.filter((l) => {
      const d = new Date(l.dateGiven);
      if (Number.isNaN(d.getTime())) return false;
      return d >= start && d <= today;
    }),
  };
}

/** Build the monthly buckets for the chart. Always returns the same
 *  number of months (1 when range is "3m" the first of those), with
 *  zero-filled gaps so the chart never has a missing month. */
function buildMonthly(rows: Loan[], range: ReportRange, today: Date): MonthlyBucket[] {
  const months = rangeMonths(range) ?? 12;
  const buckets: MonthlyBucket[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const m = addMonths(startOfMonth(today), -i);
    buckets.push({ key: ymKey(m), label: ymLabel(m), lent: 0, received: 0 });
  }
  const byKey: Record<string, MonthlyBucket> = {};
  for (const b of buckets) byKey[b.key] = b;
  for (const l of rows) {
    const d = new Date(l.dateGiven);
    if (Number.isNaN(d.getTime())) continue;
    const key = ymKey(d);
    if (byKey[key]) byKey[key].lent += l.amount;
    for (const p of l.payments) {
      const pd = new Date(p.date);
      if (Number.isNaN(pd.getTime())) continue;
      const pkey = ymKey(pd);
      if (byKey[pkey]) byKey[pkey].received += p.amount;
    }
  }
  return buckets;
}

/** On-time rate: of all settled loans, what percentage closed on or
 *  before `dueDate`. */
function onTimeRate(rows: Loan[]): number {
  const settled = rows.filter((l) => l.payments.length > 0);
  if (settled.length === 0) return 0;
  let onTime = 0;
  for (const l of settled) {
    const due = new Date(l.dueDate);
    if (Number.isNaN(due.getTime())) continue;
    // Find the latest payment date.
    let latest: Date | null = null;
    for (const p of l.payments) {
      const pd = new Date(p.date);
      if (Number.isNaN(pd.getTime())) continue;
      if (!latest || pd > latest) latest = pd;
    }
    if (latest && latest.getTime() <= due.getTime()) onTime++;
  }
  return Math.round((onTime / settled.length) * 100);
}

/** Average repayment time in days (positive means late, negative means
 *  early). `null` when there are no settled loans. */
function avgRepayDays(rows: Loan[]): number | null {
  const settled = rows.filter((l) => l.payments.length > 0);
  if (settled.length === 0) return null;
  let total = 0;
  let count = 0;
  for (const l of settled) {
    const due = new Date(l.dueDate);
    if (Number.isNaN(due.getTime())) continue;
    let latest: Date | null = null;
    for (const p of l.payments) {
      const pd = new Date(p.date);
      if (Number.isNaN(pd.getTime())) continue;
      if (!latest || pd > latest) latest = pd;
    }
    if (!latest) continue;
    const a = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
    const b = Date.UTC(latest.getFullYear(), latest.getMonth(), latest.getDate());
    total += Math.round((b - a) / 86_400_000);
    count++;
  }
  return count === 0 ? null : Math.round(total / count);
}

function statusBreakdown(rows: Loan[]): Record<LoanStatus, number> {
  const out: Record<LoanStatus, number> = { Paid: 0, Pending: 0, Overdue: 0 };
  for (const l of rows) out[l.status]++;
  return out;
}

function topBorrowers(rows: Loan[]): Array<{
  friendId: string;
  friendName: string;
  outstanding: number;
  loans: number;
}> {
  const byFriend = new Map<
    string,
    { friendName: string; outstanding: number; loans: number }
  >();
  for (const l of rows) {
    const key = l.friend.id;
    const existing = byFriend.get(key) ?? {
      friendName: l.friend.name,
      outstanding: 0,
      loans: 0,
    };
    existing.outstanding += remainingAmount(l);
    existing.loans += 1;
    byFriend.set(key, existing);
  }
  return [...byFriend.entries()]
    .map(([friendId, v]) => ({ friendId, ...v }))
    .filter((b) => b.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 5);
}

function reliability(rows: Loan[]): ReliabilityRow[] {
  const byFriend = new Map<
    string,
    { friendName: string; total: number; count: number }
  >();
  for (const l of rows) {
    if (l.payments.length === 0) continue;
    const due = new Date(l.dueDate);
    if (Number.isNaN(due.getTime())) continue;
    let latest: Date | null = null;
    for (const p of l.payments) {
      const pd = new Date(p.date);
      if (Number.isNaN(pd.getTime())) continue;
      if (!latest || pd > latest) latest = pd;
    }
    if (!latest) continue;
    const a = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
    const b = Date.UTC(latest.getFullYear(), latest.getMonth(), latest.getDate());
    const daysLate = Math.max(0, Math.round((b - a) / 86_400_000));
    const existing = byFriend.get(l.friend.id) ?? {
      friendName: l.friend.name,
      total: 0,
      count: 0,
    };
    existing.total += daysLate;
    existing.count += 1;
    byFriend.set(l.friend.id, existing);
  }
  return [...byFriend.entries()]
    .map(([friendId, v]) => {
      const avg = v.count > 0 ? v.total / v.count : 0;
      const bucket: ReliabilityRow["bucket"] =
        avg <= 0 ? "always" : avg <= 3 ? "sometimes" : "often";
      return {
        friendId,
        friendName: v.friendName,
        avgDaysLate: Math.round(avg),
        loans: v.count,
        bucket,
      };
    })
    .sort((a, b) => a.avgDaysLate - b.avgDaysLate);
}

function upcoming(rows: Loan[], today: Date): UpcomingDue[] {
  const in7 = new Date(today);
  in7.setDate(today.getDate() + 7);
  const out: UpcomingDue[] = [];
  for (const l of rows) {
    if (l.status === "Paid") continue;
    const due = new Date(l.dueDate);
    if (Number.isNaN(due.getTime())) continue;
    if (due < today || due > in7) continue;
    const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const b = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
    out.push({
      loanId: l.id,
      friendName: l.friend.name,
      amount: remainingAmount(l),
      dueDate: l.dueDate,
      daysUntilDue: Math.round((b - a) / 86_400_000),
    });
  }
  return out.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

/** Main entry: derives the entire report in one pass. */
export function computeReport(
  loans: Loan[],
  today: Date,
  range: ReportRange = "6m",
): ReportSnapshot {
  const { start, rows } = filterByRange(loans, range, today);
  let totalLent = 0;
  let totalReceived = 0;
  let outstanding = 0;
  for (const l of rows) {
    totalLent += l.amount;
    totalReceived += amountPaid(l);
    outstanding += remainingAmount(l);
  }
  return {
    range,
    startDate: start ? start.toISOString().slice(0, 10) : null,
    totalLent,
    totalReceived,
    outstanding,
    onTimeRate: onTimeRate(rows),
    statusBreakdown: statusBreakdown(rows),
    monthly: buildMonthly(rows, range, today),
    topBorrowers: topBorrowers(rows),
    reliability: reliability(rows),
    avgRepayDays: avgRepayDays(rows),
    upcoming: upcoming(rows, today),
    rows,
  };
}

/** Format the rows of a report as a downloadable CSV string. */
export function formatCsv(rows: Loan[]): string {
  const header = [
    "Loan id",
    "Friend",
    "Amount",
    "Date given",
    "Due date",
    "Status",
    "Amount paid",
    "Remaining",
    "Tone",
    "Reschedules",
  ];
  const lines: string[] = [header.map(quote).join(",")];
  for (const l of rows) {
    lines.push(
      [
        l.id,
        l.friend.name,
        String(l.amount),
        l.dateGiven,
        l.dueDate,
        l.status,
        String(amountPaid(l)),
        String(remainingAmount(l)),
        l.tone,
        String(l.rescheduleHistory.length),
      ]
        .map(quote)
        .join(","),
    );
  }
  return lines.join("\n");
}

function quote(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}
