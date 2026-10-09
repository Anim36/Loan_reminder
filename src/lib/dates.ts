// Date helpers used by the API layer.
//
// Convention: business dates (dateGiven, dueDate, paymentDate) are
// date-only fields stored as `DateTime @db.Date` in Postgres. Prisma
// returns them as JS `Date` instances pinned to UTC midnight
// (`YYYY-MM-DDT00:00:00.000Z`). The API contract surfaces them as
// `"YYYY-MM-DD"` strings; `parseDateOnly` and `formatDateOnly`
// bridge the two.
//
// "Today" in the application sense is **Asia/Dhaka**, not server
// UTC. `todayInDhaka()` returns a `Date` whose UTC components are
// the Dhaka calendar day. That way the date-only equality
// `dueDate < today` works in SQL and in JS without TZ drift.

/** Asia/Dhaka — no DST, fixed +06:00 from UTC. */
export const DHAKA_TZ = "Asia/Dhaka";

/** IANA tz string accepted by `Intl.DateTimeFormat`. */
export type TimeZone = typeof DHAKA_TZ | string;

/** Format a Date as YYYY-MM-DD using the supplied timezone. */
export function formatDateOnly(d: Date, tz: TimeZone = DHAKA_TZ): string {
  // Intl gives us the year/month/day in the target zone. We
  // zero-pad manually because `formatToParts` returns strings.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Parse a YYYY-MM-DD string. Returns `null` on any deviation so
 *  callers can map to a 422. */
export function parseDateOnly(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  // The Date is constructed at UTC midnight so the date-only
  // comparison `dueDate < today` works in JS without TZ drift.
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    // Catches things like 2026-02-31 which JS silently rolls over.
    return null;
  }
  return date;
}

/** "Today" in Asia/Dhaka, as a Date pinned to UTC midnight. */
export function todayInDhaka(now: Date = new Date()): Date {
  const ymd = formatDateOnly(now, DHAKA_TZ);
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Number of whole days from `from` to `to` (date-only, Asia/Dhaka).
 *  Positive when `to` is after `from`. */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / 86_400_000);
}

/** Coerce a value to a `Date` or `null`. Accepts:
 *   - `Date` (returned as-is)
 *   - ISO-8601 string (parsed)
 *   - `null` / `undefined` (returns null)
 *  Used by DTO mappers that receive a Prisma `Date | null`. */
export function toDateOrNull(v: Date | string | null | undefined): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
