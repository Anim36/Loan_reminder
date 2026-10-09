import { describe, it, expect } from "vitest";
import {
  formatDateOnly,
  parseDateOnly,
  todayInDhaka,
  daysBetween,
  DHAKA_TZ,
} from "@/lib/dates";

describe("dates", () => {
  it("formatDateOnly renders YYYY-MM-DD in the given zone", () => {
    const utc = new Date(Date.UTC(2026, 9, 4, 18, 30, 0)); // 2026-10-05 00:30 in Dhaka
    expect(formatDateOnly(utc, DHAKA_TZ)).toBe("2026-10-05");
    expect(formatDateOnly(utc, "UTC")).toBe("2026-10-04");
  });

  it("parseDateOnly accepts valid YYYY-MM-DD strings", () => {
    const d = parseDateOnly("2026-10-04");
    expect(d).not.toBeNull();
    expect(d!.toISOString()).toBe("2026-10-04T00:00:00.000Z");
  });

  it("parseDateOnly rejects invalid strings", () => {
    expect(parseDateOnly("")).toBeNull();
    expect(parseDateOnly("2026/10/04")).toBeNull();
    expect(parseDateOnly("garbage")).toBeNull();
    expect(parseDateOnly("2026-13-01")).toBeNull();
    expect(parseDateOnly("2026-02-31")).toBeNull();
  });

  it("todayInDhaka is the calendar day in Asia/Dhaka", () => {
    // 2026-10-04 22:00 UTC == 2026-10-05 04:00 in Dhaka.
    const fake = new Date(Date.UTC(2026, 9, 4, 22, 0, 0));
    const t = todayInDhaka(fake);
    expect(t.toISOString()).toBe("2026-10-05T00:00:00.000Z");

    // And the inverse — late evening in Dhaka is the next day UTC.
    const late = new Date(Date.UTC(2026, 9, 4, 19, 0, 0));
    expect(todayInDhaka(late).toISOString()).toBe("2026-10-05T00:00:00.000Z");
  });

  it("daysBetween counts whole days regardless of time", () => {
    const a = parseDateOnly("2026-10-01")!;
    const b = parseDateOnly("2026-10-08")!;
    expect(daysBetween(a, b)).toBe(7);
    expect(daysBetween(b, a)).toBe(-7);
  });
});
