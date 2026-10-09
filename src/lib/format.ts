// Shared formatters used by the dashboard, loans list, and summary cards.
//
// Every formatter accepts an optional `numeralMode` argument so the
// Bangla-numerals setting can be applied without coupling the helper
// to React. The default is "latin".

const BDT = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

/** Format a numeric amount as ৳N,NNN with thousand separators. */
export function formatMoney(
  amount: number,
  numeralMode: "latin" | "bn" = "latin",
): string {
  if (!Number.isFinite(amount)) return apply("৳0", numeralMode);
  return apply(`৳${BDT.format(Math.round(amount))}`, numeralMode);
}

/**
 * Compact form for chart axis labels. Examples:
 *   1,200    -> "৳1.2k"
 *   10,000   -> "৳10k"
 *   32,500   -> "৳32.5k"
 *   150,000  -> "৳150k"
 *   1,500,000 -> "৳1.5M"
 * The Bangla-numerals mode is respected by routing through `apply()`.
 */
export function formatMoneyShort(
  amount: number,
  numeralMode: "latin" | "bn" = "latin",
): string {
  if (!Number.isFinite(amount) || amount === 0) {
    return apply("৳0", numeralMode);
  }
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs < 1_000) {
    return apply(`${sign}৳${Math.round(abs)}`, numeralMode);
  }
  if (abs < 10_000) {
    // 1.0k – 9.9k
    const v = (abs / 1_000).toFixed(1).replace(/\.0$/, "");
    return apply(`${sign}৳${v}k`, numeralMode);
  }
  if (abs < 1_000_000) {
    // 10k – 999k — round to integer
    const v = Math.round(abs / 1_000);
    return apply(`${sign}৳${v}k`, numeralMode);
  }
  // 1M+
  const v = (abs / 1_000_000).toFixed(1).replace(/\.0$/, "");
  return apply(`${sign}৳${v}M`, numeralMode);
}

const MONTH_SHORT = [
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

const MONTH_SHORT_BN = [
  "জানু",
  "ফেব্রু",
  "মার্চ",
  "এপ্রি",
  "মে",
  "জুন",
  "জুলা",
  "আগ",
  "সেপ্টে",
  "অক্টো",
  "নভে",
  "ডিসে",
] as const;

const MONTH_FULL_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MONTH_FULL_BN = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
] as const;

const WEEKDAY_FULL_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const WEEKDAY_FULL_BN = [
  "রবিবার",
  "সোমবার",
  "মঙ্গলবার",
  "বুধবার",
  "বৃহস্পতিবার",
  "শুক্রবার",
  "শনিবার",
] as const;

/** Format a YYYY-MM-DD string as "20 Sep 2026". */
export function formatDate(
  iso: string,
  opts: { lang?: "en" | "bn"; numeralMode?: "latin" | "bn" } = {},
): string {
  const { lang = "en", numeralMode = "latin" } = opts;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return apply(iso, numeralMode);
  const monthIdx = Math.max(0, Math.min(11, Number(m[2]) - 1));
  const month =
    lang === "bn" ? MONTH_SHORT_BN[monthIdx] : MONTH_SHORT[monthIdx];
  const day = String(Number(m[3]));
  return apply(`${day} ${month} ${m[1]}`, numeralMode);
}

/** Days between `from` and `to` (positive when `to` is after `from`). */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}

/** Stable, locale-friendly greeting based on local time. */
export function greetingFor(
  now: Date,
  lang: "en" | "bn" = "en",
): string {
  const h = now.getHours();
  if (lang === "bn") {
    if (h < 5) return "শুভ রাত্রি";
    if (h < 12) return "সুপ্রভাত";
    if (h < 18) return "নমস্কার";
    return "শুভ সন্ধ্যা";
  }
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** "Saturday, 4 October 2025" style overline for the dashboard. */
export function formatOverlineDate(
  now: Date,
  lang: "en" | "bn" = "en",
  numeralMode: "latin" | "bn" = "latin",
): string {
  const weekdayIdx = now.getDay();
  const weekday =
    lang === "bn" ? WEEKDAY_FULL_BN[weekdayIdx] : WEEKDAY_FULL_EN[weekdayIdx];
  const day = now.getDate();
  const monthIdx = now.getMonth();
  const month =
    lang === "bn" ? MONTH_FULL_BN[monthIdx] : MONTH_FULL_EN[monthIdx];
  const year = now.getFullYear();
  return apply(`${weekday}, ${day} ${month} ${year}`, numeralMode);
}

/**
 * Format an ISO timestamp as "12 Oct 2026 · 10:00 AM". Avoids the
 * timezone trap by parsing the YYYY-MM-DD segment of the timestamp
 * ourselves before falling back to Date().
 */
export function formatDateTime(
  iso: string,
  opts: { lang?: "en" | "bn"; numeralMode?: "latin" | "bn" } = {},
): string {
  const { lang = "en", numeralMode = "latin" } = opts;
  if (!iso) return "";
  const date = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  let year = "",
    month = "",
    day = "";
  if (date) {
    year = date[1];
    const monthIdx = Math.max(0, Math.min(11, Number(date[2]) - 1));
    month =
      lang === "bn" ? MONTH_SHORT_BN[monthIdx] : MONTH_SHORT[monthIdx];
    day = String(Number(date[3]));
  }
  const timeMatch = iso.match(/T(\d{2}):(\d{2})/);
  const time = timeMatch
    ? formatClock(Number(timeMatch[1]), Number(timeMatch[2]), lang)
    : "";
  const dateText = date
    ? apply(`${day} ${month} ${year}`, numeralMode)
    : apply(iso, numeralMode);
  return time ? `${dateText} · ${time}` : dateText;
}

function formatClock(
  h: number,
  m: number,
  lang: "en" | "bn" = "en",
): string {
  const period =
    h >= 12 ? (lang === "bn" ? "পিএম" : "PM") : lang === "bn" ? "এএম" : "AM";
  const hh = ((h + 11) % 12) + 1;
  const mm = String(m).padStart(2, "0");
  return apply(`${hh}:${mm} ${period}`, "latin");
}

/** "just now" / "2m ago" / "yesterday" / "3d ago" for the feed. */
export function formatRelative(
  iso: string,
  now: Date,
  numeralMode: "latin" | "bn" = "latin",
): string {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const diff = now.getTime() - then.getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return apply("just now", numeralMode);
  if (minutes < 60) return apply(`${minutes}m ago`, numeralMode);
  const hours = Math.round(minutes / 60);
  if (hours < 24) return apply(`${hours}h ago`, numeralMode);
  const days = Math.round(hours / 24);
  if (days === 1) return apply("yesterday", numeralMode);
  if (days < 7) return apply(`${days}d ago`, numeralMode);
  return formatDate(iso.split("T")[0], { numeralMode });
}

/** Convert ASCII digits to Bangla digits when the user has opted in. */
function apply(input: string, numeralMode: "latin" | "bn"): string {
  if (numeralMode === "bn" && input) {
    let out = "";
    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (ch >= "0" && ch <= "9") {
        out += String.fromCharCode(0x09e6 + (ch.charCodeAt(0) - 48));
      } else {
        out += ch;
      }
    }
    return out;
  }
  return input;
}
