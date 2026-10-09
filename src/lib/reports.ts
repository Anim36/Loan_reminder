// Report aggregations.
//
// Pure functions over the rows the API fetches. The route
// does ONE `findMany` for the user's loans in range and one
// for the matching friends; the helpers in this file turn
// those into the report sections without further DB hits.
//
// All "today" / "month" / "week" math is in Asia/Dhaka.
//
// Definitions used throughout
// ---------------------------
//   * **status** is *derived* (Paid | Pending | Overdue). The
//     DB never stores it; we call `deriveStatus` here.
//
//   * **on-time rate** = (# of paid loans whose `paidAt` is
//     ≤ `dueDate` in Asia/Dhaka) / (# of paid loans in the
//     range). "Paid" = has `paidAt`. Returns 1 when no paid
//     loans exist (vacuous truth).
//
//   * **average days to repay** = mean over paid loans of
//     `(paidAt - dueDate)` in whole days, Asia/Dhaka
//     comparison. Positive = late, negative = early.
//
//   * **friend reliability** (with a minimum of 2 loans
//     before a label is assigned):
//       - `always_on_time`  — ≥ 80% of their loans paid on
//         time
//       - `often_late`      — ≤ 30% paid on time
//       - `sometimes_late`  — the rest (or fewer than 2 loans)
//
//   * **monthly series** = total amount lent and total
//     received per Asia/Dhaka month (YYYY-MM). Months in
//     the range without data are zero-filled.

import { deriveStatus, remainingPoisha, amountPaidPoisha } from "@/lib/loanStatus";
import { daysBetween, formatDateOnly } from "@/lib/dates";
import { roundTaka } from "@/lib/money";
import type { LoanStatus } from "@/types/loan";

export type ReportRange = "3m" | "6m" | "12m" | "all";

/** Returns the lower bound (inclusive) for a report range, as
 *  an Asia/Dhaka date pinned to UTC midnight. `null` means
 *  no lower bound. */
export function rangeStart(range: ReportRange, today: Date): Date | null {
  if (range === "all") return null;
  const months = range === "3m" ? 3 : range === "6m" ? 6 : 12;
  // Subtract `months - 1` so the *current* month is included
  // and we have exactly N months of data.
  const start = new Date(today);
  start.setUTCMonth(start.getUTCMonth() - (months - 1));
  // Snap to the 1st of the month.
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
}

/** Convert a Date to its `YYYY-MM` month key in Asia/Dhaka. */
export function monthKey(d: Date): string {
  return formatDateOnly(d).slice(0, 7);
}

/** Generate the list of month keys in `[from, to]` inclusive.
 *  `from` and `to` are both `YYYY-MM` strings. */
export function monthKeysInRange(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ey, em] = to.split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

/** Months the report covers, given a range and "today". */
export function monthsForRange(
  range: ReportRange,
  today: Date,
): string[] {
  const start = rangeStart(range, today);
  const last = monthKey(today);
  const first = start ? monthKey(start) : last;
  // The first month should be the 1st of its month so the
  // zero-fill grid lines up; we already snap in rangeStart.
  return monthKeysInRange(first, last);
}

export interface ReportLoanRow {
  id: string;
  amount: number; // poisha
  dueDate: Date;
  paidAt: Date | null;
  givenDate: Date;
  deletedAt: Date | null;
  friendId: string;
  payments: Array<{ amount: number; date: Date; createdAt: Date }>;
}

export interface ReportFriendRow {
  id: string;
  name: string;
}

export interface ReportSummary {
  totalLent: number;       // taka
  totalReceived: number;   // taka
  outstanding: number;     // taka
  onTimeRate: number;      // 0..1
  counts: Record<LoanStatus, number>;
}

export interface MonthlySeriesPoint {
  month: string;        // YYYY-MM
  lent: number;         // taka
  received: number;     // taka
}

export interface TopBorrower {
  friendId: string;
  name: string;
  outstanding: number;  // taka
}

export type ReliabilityLabel =
  | "always_on_time"
  | "sometimes_late"
  | "often_late"
  | "insufficient_data";

export interface FriendReliability {
  friendId: string;
  name: string;
  loanCount: number;
  onTimeCount: number;
  onTimeRate: number; // 0..1
  label: ReliabilityLabel;
}

export interface UpcomingDueLoan {
  loanId: string;
  friendId: string;
  friendName: string;
  amount: number;      // taka
  remaining: number;   // taka
  dueDate: string;     // YYYY-MM-DD
  daysRemaining: number;
}

export interface ReportResult {
  summary: ReportSummary;
  monthly: MonthlySeriesPoint[];
  statusBreakdown: Record<LoanStatus, number>;
  topBorrowers: TopBorrower[];
  averageDaysToRepay: number | null;
  friendReliability: FriendReliability[];
  upcomingDueThisWeek: UpcomingDueLoan[];
}

/* ---- Computation ------------------------------------------------- */

const MIN_LOANS_FOR_LABEL = 2;
const ON_TIME_THRESHOLD = 0.8;
const OFTEN_LATE_THRESHOLD = 0.3;

/** A loan counts as on-time iff `paidAt` exists and
 *  `paidAt ≤ dueDate` in Asia/Dhaka. */
function isOnTime(row: ReportLoanRow): boolean {
  if (!row.paidAt) return false;
  const a = Date.UTC(
    row.paidAt.getUTCFullYear(),
    row.paidAt.getUTCMonth(),
    row.paidAt.getUTCDate(),
  );
  const b = Date.UTC(
    row.dueDate.getUTCFullYear(),
    row.dueDate.getUTCMonth(),
    row.dueDate.getUTCDate(),
  );
  return a <= b;
}

function paymentsForDerive(row: ReportLoanRow) {
  return row.payments.map((p) => ({
    id: p.date.toISOString(),
    amount: p.amount,
    date: p.date.toISOString().slice(0, 10),
    method: "Other" as const,
  }));
}

export function computeReport(
  loans: ReportLoanRow[],
  friends: ReportFriendRow[],
  range: ReportRange,
  today: Date,
): ReportResult {
  const friendById = new Map(friends.map((f) => [f.id, f]));

  // Filter to range, drop soft-deleted.
  const start = rangeStart(range, today);
  const live = loans.filter((l) => {
    if (l.deletedAt) return false;
    if (!start) return true;
    return l.dueDate >= start;
  });

  /* ---- summary ------------------------------------------------- */
  let totalLent = 0;
  let totalReceived = 0;
  let outstanding = 0;
  let onTimeLoans = 0;
  let paidLoans = 0;
  let sumDeltaDays = 0;
  const counts: Record<LoanStatus, number> = { Paid: 0, Pending: 0, Overdue: 0 };
  const monthlyMap = new Map<string, { lent: number; received: number }>();

  for (const l of live) {
    const pays = paymentsForDerive(l);
    const status = deriveStatus(
      { amount: l.amount, dueDate: formatDateOnly(l.dueDate) },
      pays,
      today,
    );
    counts[status]++;
    totalLent += l.amount;
    const paid = amountPaidPoisha(pays);
    const rem = remainingPoisha({ amount: l.amount }, pays);
    totalReceived += paid;
    if (status !== "Paid") outstanding += rem;

    // Monthly buckets — lent keyed by `givenDate`, received
    // keyed by the payment `date`.
    const month = monthKey(l.givenDate);
    const cell = monthlyMap.get(month) ?? { lent: 0, received: 0 };
    cell.lent += l.amount;
    monthlyMap.set(month, cell);
    for (const p of l.payments) {
      const pm = monthKey(p.date);
      const pc = monthlyMap.get(pm) ?? { lent: 0, received: 0 };
      pc.received += p.amount;
      monthlyMap.set(pm, pc);
    }

    if (l.paidAt) {
      paidLoans++;
      if (isOnTime(l)) onTimeLoans++;
      sumDeltaDays += daysBetween(l.dueDate, l.paidAt);
    }
  }

  // Zero-fill the months.
  const months = monthsForRange(range, today);
  const monthly: MonthlySeriesPoint[] = months.map((m) => {
    const cell = monthlyMap.get(m) ?? { lent: 0, received: 0 };
    return { month: m, lent: roundTaka(cell.lent), received: roundTaka(cell.received) };
  });

  const onTimeRate = paidLoans === 0 ? 1 : onTimeLoans / paidLoans;
  const averageDaysToRepay = paidLoans === 0 ? null : sumDeltaDays / paidLoans;

  /* ---- top borrowers ------------------------------------------- */
  const perFriendOutstanding = new Map<string, number>();
  for (const l of live) {
    const pays = paymentsForDerive(l);
    const rem = remainingPoisha({ amount: l.amount }, pays);
    if (rem > 0) {
      perFriendOutstanding.set(
        l.friendId,
        (perFriendOutstanding.get(l.friendId) ?? 0) + rem,
      );
    }
  }
  const topBorrowers: TopBorrower[] = Array.from(perFriendOutstanding.entries())
    .map(([friendId, outstandingPoisha]) => ({
      friendId,
      name: friendById.get(friendId)?.name ?? "(unknown)",
      outstanding: roundTaka(outstandingPoisha),
    }))
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 5);

  /* ---- friend reliability -------------------------------------- */
  const perFriendStats = new Map<string, { name: string; onTime: number; total: number }>();
  for (const l of live) {
    if (!l.paidAt) continue;
    const f = friendById.get(l.friendId);
    if (!f) continue;
    const stat = perFriendStats.get(l.friendId) ?? { name: f.name, onTime: 0, total: 0 };
    stat.total++;
    if (isOnTime(l)) stat.onTime++;
    perFriendStats.set(l.friendId, stat);
  }
  const friendReliability: FriendReliability[] = Array.from(perFriendStats.entries())
    .map(([friendId, stat]) => {
      const rate = stat.total === 0 ? 0 : stat.onTime / stat.total;
      let label: ReliabilityLabel;
      if (stat.total < MIN_LOANS_FOR_LABEL) label = "insufficient_data";
      else if (rate >= ON_TIME_THRESHOLD) label = "always_on_time";
      else if (rate <= OFTEN_LATE_THRESHOLD) label = "often_late";
      else label = "sometimes_late";
      return {
        friendId,
        name: stat.name,
        loanCount: stat.total,
        onTimeCount: stat.onTime,
        onTimeRate: rate,
        label,
      };
    })
    .sort((a, b) => b.loanCount - a.loanCount);

  /* ---- upcoming this week -------------------------------------- */
  const weekEnd = new Date(today);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  const upcomingDueThisWeek: UpcomingDueLoan[] = live
    .filter((l) => l.dueDate >= today && l.dueDate <= weekEnd && !l.paidAt)
    .map((l) => {
      const pays = paymentsForDerive(l);
      const rem = remainingPoisha({ amount: l.amount }, pays);
      return {
        loanId: l.id,
        friendId: l.friendId,
        friendName: friendById.get(l.friendId)?.name ?? "(unknown)",
        amount: roundTaka(l.amount),
        remaining: roundTaka(rem),
        dueDate: formatDateOnly(l.dueDate),
        daysRemaining: daysBetween(today, l.dueDate),
      };
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return {
    summary: {
      totalLent: roundTaka(totalLent),
      totalReceived: roundTaka(totalReceived),
      outstanding: roundTaka(outstanding),
      onTimeRate,
      counts,
    },
    monthly,
    statusBreakdown: counts,
    topBorrowers,
    averageDaysToRepay,
    friendReliability,
    upcomingDueThisWeek,
  };
}
