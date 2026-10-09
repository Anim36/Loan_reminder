import { describe, it, expect } from "vitest";
import {
  computeReport,
  monthKey,
  monthKeysInRange,
  monthsForRange,
  rangeStart,
  type ReportLoanRow,
  type ReportFriendRow,
} from "@/lib/reports";

const T = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(Date.UTC(y, m - 1, d, h, min));
const TODAY = T(2026, 10, 4);
const FRIENDS: ReportFriendRow[] = [
  { id: "f-alice", name: "Alice" },
  { id: "f-bob", name: "Bob" },
];

function mkLoan(args: {
  id: string;
  friendId: string;
  amount: number;
  givenDate: Date;
  dueDate: Date;
  paidAt?: Date | null;
  deletedAt?: Date | null;
  payments?: Array<{ amount: number; date: Date; createdAt: Date }>;
}): ReportLoanRow {
  return {
    id: args.id,
    friendId: args.friendId,
    amount: args.amount,
    givenDate: args.givenDate,
    dueDate: args.dueDate,
    paidAt: args.paidAt ?? null,
    deletedAt: args.deletedAt ?? null,
    payments: args.payments ?? [],
  };
}

describe("reports — range helpers", () => {
  it("rangeStart: 3m snaps to the 1st of three months ago", () => {
    const start = rangeStart("3m", TODAY)!;
    expect(start.getUTCMonth()).toBe(TODAY.getUTCMonth() - 2);
    expect(start.getUTCDate()).toBe(1);
  });

  it("rangeStart: 12m spans 12 months including the current one", () => {
    const start = rangeStart("12m", TODAY)!;
    expect(start.getUTCFullYear()).toBe(TODAY.getUTCFullYear() - 1);
    const months = monthsForRange("12m", TODAY);
    expect(months.length).toBe(12);
    expect(months[0]).toBe("2025-11");
    expect(months[11]).toBe("2026-10");
  });

  it("rangeStart: all returns null", () => {
    expect(rangeStart("all", TODAY)).toBeNull();
  });

  it("monthKey uses Asia/Dhaka", () => {
    // 2026-10-04 18:00 UTC = 2026-10-05 00:00 in Dhaka
    expect(monthKey(T(2026, 10, 4, 18, 0))).toBe("2026-10");
  });

  it("monthKeysInRange covers inclusive range", () => {
    expect(monthKeysInRange("2026-01", "2026-03")).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
  });

  it("monthKeysInRange rolls over the year boundary", () => {
    expect(monthKeysInRange("2025-11", "2026-02")).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });
});

describe("reports — summary", () => {
  it("computes totalLent, totalReceived, outstanding and counts", () => {
    const loans: ReportLoanRow[] = [
      mkLoan({
        id: "l1",
        friendId: "f-alice",
        amount: 1000_00,
        givenDate: T(2026, 9, 1),
        dueDate: T(2026, 11, 1), // Pending
      }),
      mkLoan({
        id: "l2",
        friendId: "f-bob",
        amount: 500_00,
        givenDate: T(2026, 8, 1),
        dueDate: T(2026, 9, 1), // Overdue
      }),
      mkLoan({
        id: "l3",
        friendId: "f-alice",
        amount: 300_00,
        givenDate: T(2026, 8, 1),
        dueDate: T(2026, 8, 31),
        paidAt: T(2026, 9, 2),
        payments: [{ amount: 300_00, date: T(2026, 9, 2), createdAt: T(2026, 9, 2) }],
      }),
    ];
    const r = computeReport(loans, FRIENDS, "12m", TODAY);
    expect(r.summary.totalLent).toBe(1800);
    expect(r.summary.totalReceived).toBe(300);
    expect(r.summary.outstanding).toBe(1000 + 500); // 1500
    expect(r.summary.counts).toEqual({ Paid: 1, Pending: 1, Overdue: 1 });
  });

  it("excludes soft-deleted loans", () => {
    const loans: ReportLoanRow[] = [
      mkLoan({
        id: "live",
        friendId: "f-alice",
        amount: 100_00,
        givenDate: T(2026, 8, 1),
        dueDate: T(2026, 11, 1),
      }),
      mkLoan({
        id: "dead",
        friendId: "f-alice",
        amount: 1_000_000_00,
        givenDate: T(2026, 8, 1),
        dueDate: T(2026, 11, 1),
        deletedAt: T(2026, 9, 1),
      }),
    ];
    const r = computeReport(loans, FRIENDS, "12m", TODAY);
    expect(r.summary.totalLent).toBe(100);
  });

  it("on-time rate counts paid loans by paidAt <= dueDate", () => {
    const loans: ReportLoanRow[] = [
      mkLoan({
        id: "l1",
        friendId: "f-alice",
        amount: 100_00,
        givenDate: T(2026, 8, 1),
        dueDate: T(2026, 8, 15),
        paidAt: T(2026, 8, 14), // on time
        payments: [{ amount: 100_00, date: T(2026, 8, 14), createdAt: T(2026, 8, 14) }],
      }),
      mkLoan({
        id: "l2",
        friendId: "f-bob",
        amount: 100_00,
        givenDate: T(2026, 8, 1),
        dueDate: T(2026, 8, 15),
        paidAt: T(2026, 8, 20), // late
        payments: [{ amount: 100_00, date: T(2026, 8, 20), createdAt: T(2026, 8, 20) }],
      }),
      mkLoan({
        id: "l3",
        friendId: "f-alice",
        amount: 100_00,
        givenDate: T(2026, 8, 1),
        dueDate: T(2026, 8, 15),
        paidAt: T(2026, 8, 15), // exactly on the due date = on time
        payments: [{ amount: 100_00, date: T(2026, 8, 15), createdAt: T(2026, 8, 15) }],
      }),
    ];
    const r = computeReport(loans, FRIENDS, "12m", TODAY);
    expect(r.summary.onTimeRate).toBeCloseTo(2 / 3);
  });

  it("on-time rate returns 1 (vacuous truth) when no paid loans", () => {
    const loans: ReportLoanRow[] = [
      mkLoan({
        id: "l1",
        friendId: "f-alice",
        amount: 100_00,
        givenDate: T(2026, 9, 1),
        dueDate: T(2026, 11, 1),
      }),
    ];
    const r = computeReport(loans, FRIENDS, "12m", TODAY);
    expect(r.summary.onTimeRate).toBe(1);
  });

  it("averageDaysToRepay: mean of (paidAt - dueDate) in days", () => {
    const loans: ReportLoanRow[] = [
      mkLoan({
        id: "l1",
        friendId: "f-alice",
        amount: 100_00,
        givenDate: T(2026, 8, 1),
        dueDate: T(2026, 8, 10),
        paidAt: T(2026, 8, 12), // +2
        payments: [{ amount: 100_00, date: T(2026, 8, 12), createdAt: T(2026, 8, 12) }],
      }),
      mkLoan({
        id: "l2",
        friendId: "f-bob",
        amount: 100_00,
        givenDate: T(2026, 8, 1),
        dueDate: T(2026, 8, 20),
        paidAt: T(2026, 8, 18), // -2
        payments: [{ amount: 100_00, date: T(2026, 8, 18), createdAt: T(2026, 8, 18) }],
      }),
    ];
    const r = computeReport(loans, FRIENDS, "12m", TODAY);
    expect(r.averageDaysToRepay).toBe(0);
  });
});

describe("reports — monthly series", () => {
  it("zero-fills months with no data", () => {
    const loans: ReportLoanRow[] = [
      mkLoan({
        id: "l1",
        friendId: "f-alice",
        amount: 100_00,
        givenDate: T(2026, 8, 5),
        dueDate: T(2026, 9, 5),
      }),
    ];
    const r = computeReport(loans, FRIENDS, "3m", TODAY);
    // 3m with today=2026-10 → months 2026-08, 2026-09, 2026-10
    expect(r.monthly).toEqual([
      { month: "2026-08", lent: 100, received: 0 },
      { month: "2026-09", lent: 0, received: 0 },
      { month: "2026-10", lent: 0, received: 0 },
    ]);
  });

  it("buckets across month boundaries in Asia/Dhaka", () => {
    // 2026-09-30 22:00 UTC = 2026-10-01 04:00 in Dhaka.
    // A loan given on this date should land in the October bucket.
    const loans: ReportLoanRow[] = [
      mkLoan({
        id: "l1",
        friendId: "f-alice",
        amount: 250_00,
        givenDate: T(2026, 9, 30, 22, 0),
        dueDate: T(2026, 11, 1),
      }),
    ];
    const r = computeReport(loans, FRIENDS, "3m", TODAY);
    // 3m → 2026-08, 2026-09, 2026-10. Loan in October.
    const oct = r.monthly.find((p) => p.month === "2026-10");
    expect(oct?.lent).toBe(250);
    const sep = r.monthly.find((p) => p.month === "2026-09");
    expect(sep?.lent).toBe(0);
  });

  it("received amounts bucket by the payment date, not the loan date", () => {
    const loans: ReportLoanRow[] = [
      mkLoan({
        id: "l1",
        friendId: "f-alice",
        amount: 100_00,
        givenDate: T(2026, 7, 1),
        dueDate: T(2026, 8, 15),
        paidAt: T(2026, 9, 1),
        payments: [{ amount: 100_00, date: T(2026, 9, 1), createdAt: T(2026, 9, 1) }],
      }),
    ];
    const r = computeReport(loans, FRIENDS, "12m", TODAY);
    const sep = r.monthly.find((p) => p.month === "2026-09");
    expect(sep?.received).toBe(100);
  });
});

describe("reports — top borrowers", () => {
  it("orders by outstanding (sum of remaining on non-Paid loans) desc", () => {
    const loans: ReportLoanRow[] = [
      mkLoan({
        id: "l1",
        friendId: "f-alice",
        amount: 100_00,
        givenDate: T(2026, 9, 1),
        dueDate: T(2026, 11, 1),
      }),
      mkLoan({
        id: "l2",
        friendId: "f-bob",
        amount: 800_00,
        givenDate: T(2026, 9, 1),
        dueDate: T(2026, 11, 1),
      }),
    ];
    const r = computeReport(loans, FRIENDS, "12m", TODAY);
    expect(r.topBorrowers[0]).toEqual({ friendId: "f-bob", name: "Bob", outstanding: 800 });
    expect(r.topBorrowers[1]).toEqual({ friendId: "f-alice", name: "Alice", outstanding: 100 });
  });

  it("caps at 5", () => {
    const loans: ReportLoanRow[] = [];
    const friends: ReportFriendRow[] = Array.from({ length: 10 }, (_, i) => ({
      id: `f-${i}`,
      name: `Friend ${i}`,
    }));
    for (let i = 0; i < 10; i++) {
      loans.push(
        mkLoan({
          id: `l${i}`,
          friendId: `f-${i}`,
          amount: (i + 1) * 100_00,
          givenDate: T(2026, 9, 1),
          dueDate: T(2026, 11, 1),
        }),
      );
    }
    const r = computeReport(loans, friends, "12m", TODAY);
    expect(r.topBorrowers.length).toBe(5);
    expect(r.topBorrowers[0].outstanding).toBe(1000);
  });
});

describe("reports — friend reliability", () => {
  it("labels 'always_on_time' at 80% with 2+ loans", () => {
    const loans: ReportLoanRow[] = [
      mkLoan({
        id: "l1",
        friendId: "f-alice",
        amount: 100_00,
        givenDate: T(2026, 8, 1),
        dueDate: T(2026, 8, 10),
        paidAt: T(2026, 8, 10),
        payments: [{ amount: 100_00, date: T(2026, 8, 10), createdAt: T(2026, 8, 10) }],
      }),
      mkLoan({
        id: "l2",
        friendId: "f-alice",
        amount: 100_00,
        givenDate: T(2026, 8, 15),
        dueDate: T(2026, 8, 25),
        paidAt: T(2026, 8, 25),
        payments: [{ amount: 100_00, date: T(2026, 8, 25), createdAt: T(2026, 8, 25) }],
      }),
    ];
    const r = computeReport(loans, FRIENDS, "12m", TODAY);
    const alice = r.friendReliability.find((f) => f.friendId === "f-alice");
    expect(alice?.label).toBe("always_on_time");
  });

  it("labels 'often_late' at <= 30% with 2+ loans", () => {
    const loans: ReportLoanRow[] = [
      mkLoan({
        id: "l1",
        friendId: "f-bob",
        amount: 100_00,
        givenDate: T(2026, 8, 1),
        dueDate: T(2026, 8, 10),
        paidAt: T(2026, 9, 5), // very late
        payments: [{ amount: 100_00, date: T(2026, 9, 5), createdAt: T(2026, 9, 5) }],
      }),
      mkLoan({
        id: "l2",
        friendId: "f-bob",
        amount: 100_00,
        givenDate: T(2026, 8, 15),
        dueDate: T(2026, 8, 25),
        paidAt: T(2026, 9, 5),
        payments: [{ amount: 100_00, date: T(2026, 9, 5), createdAt: T(2026, 9, 5) }],
      }),
    ];
    const r = computeReport(loans, FRIENDS, "12m", TODAY);
    const bob = r.friendReliability.find((f) => f.friendId === "f-bob");
    expect(bob?.label).toBe("often_late");
  });

  it("labels 'sometimes_late' in the middle band", () => {
    const loans: ReportLoanRow[] = [
      mkLoan({
        id: "l1",
        friendId: "f-bob",
        amount: 100_00,
        givenDate: T(2026, 8, 1),
        dueDate: T(2026, 8, 10),
        paidAt: T(2026, 8, 9), // on time
        payments: [{ amount: 100_00, date: T(2026, 8, 9), createdAt: T(2026, 8, 9) }],
      }),
      mkLoan({
        id: "l2",
        friendId: "f-bob",
        amount: 100_00,
        givenDate: T(2026, 8, 15),
        dueDate: T(2026, 8, 25),
        paidAt: T(2026, 9, 5), // late
        payments: [{ amount: 100_00, date: T(2026, 9, 5), createdAt: T(2026, 9, 5) }],
      }),
    ];
    const r = computeReport(loans, FRIENDS, "12m", TODAY);
    const bob = r.friendReliability.find((f) => f.friendId === "f-bob");
    expect(bob?.label).toBe("sometimes_late");
  });

  it("labels 'insufficient_data' with 0 or 1 paid loans", () => {
    const loans: ReportLoanRow[] = [
      mkLoan({
        id: "l1",
        friendId: "f-alice",
        amount: 100_00,
        givenDate: T(2026, 8, 1),
        dueDate: T(2026, 8, 10),
        paidAt: T(2026, 8, 9),
        payments: [{ amount: 100_00, date: T(2026, 8, 9), createdAt: T(2026, 8, 9) }],
      }),
    ];
    const r = computeReport(loans, FRIENDS, "12m", TODAY);
    const alice = r.friendReliability.find((f) => f.friendId === "f-alice");
    expect(alice?.label).toBe("insufficient_data");
  });
});

describe("reports — upcoming due this week", () => {
  it("includes loans due in [today, today+7] and excludes Paid", () => {
    const loans: ReportLoanRow[] = [
      mkLoan({
        id: "l1",
        friendId: "f-alice",
        amount: 100_00,
        givenDate: T(2026, 9, 1),
        dueDate: T(2026, 10, 5), // tomorrow
      }),
      mkLoan({
        id: "l2",
        friendId: "f-bob",
        amount: 100_00,
        givenDate: T(2026, 9, 1),
        dueDate: T(2026, 10, 11), // today + 7 — included
      }),
      mkLoan({
        id: "l3",
        friendId: "f-bob",
        amount: 100_00,
        givenDate: T(2026, 9, 1),
        dueDate: T(2026, 10, 12), // today + 8 — excluded
      }),
      mkLoan({
        id: "l4",
        friendId: "f-bob",
        amount: 100_00,
        givenDate: T(2026, 9, 1),
        dueDate: T(2026, 10, 4), // today
        paidAt: T(2026, 10, 4), // paid
        payments: [{ amount: 100_00, date: T(2026, 10, 4), createdAt: T(2026, 10, 4) }],
      }),
    ];
    const r = computeReport(loans, FRIENDS, "12m", TODAY);
    expect(r.upcomingDueThisWeek.map((u) => u.loanId).sort()).toEqual(["l1", "l2"]);
  });
});
