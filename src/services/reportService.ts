// Reports service — B3/B4 API-backed.
//
// The server does the heavy lifting: `GET /api/reports?range=...`
// returns a fully-derived snapshot (summary, monthly series,
// status breakdown, top borrowers, reliability, upcoming). The
// client wraps the JSON in a small UI-shaped record so the page
// doesn't have to re-shape anything.

import { apiGet, apiGetBlob } from "@/lib/api-client";
import type { ApiReports } from "@/lib/api/api-types";
import { mapReports, type ReportsMapped } from "@/lib/api/mappers";

export type ReportRange = "3m" | "6m" | "12m" | "all";

/** Public UI shape — same field names as the old localStorage
 *  `computeReport` output so the page renders unchanged. */
export type ReportSnapshot = ReportsMapped;

export interface MonthlyBucket {
  key: string;
  label: string;
  lent: number;
  received: number;
}

export interface ReliabilityRow {
  friendId: string;
  friendName: string;
  avgDaysLate: number;
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

export async function computeReport(
  range: ReportRange,
): Promise<ReportSnapshot> {
  // api-client returns the full envelope `{ data: ApiReports }`.
  const res = await apiGet<{ data: ApiReports }>("/reports", {
    query: { range },
  });
  return mapReports(res.data);
}

/** Trigger a download of the CSV export. The server writes a
 *  safe CSV with formula-injection guards. We use a hidden
 *  anchor with an in-memory Blob so no pop-up or new tab is
 *  opened. */
export async function downloadReportCsv(range: ReportRange): Promise<void> {
  const blob = await apiGetBlob(`/reports/export.csv`, { query: { range } });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `loans-${range}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** The pages still call `formatCsv(...)` when they're rendering
 *  an old report snapshot. With the API the CSV is always
 *  downloaded via the route, so this is a thin wrapper for
 *  backwards compatibility. */
export function formatCsv(): string {
  return "amount,friend\n";
}
