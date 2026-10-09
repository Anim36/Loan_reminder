import { describe, it, expect } from "vitest";
import { deriveStatus, remainingPoisha, amountPaidPoisha } from "@/lib/loanStatus";

const T = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const DUE_FUTURE = T(2026, 10, 11);
const DUE_TODAY = T(2026, 10, 4);
const DUE_PAST = T(2026, 9, 30);

const TODAY_DATE = new Date(Date.UTC(2026, 9, 4));

const noPay: { id: string; amount: number; date: string; method: "Other" }[] = [];

describe("loanStatus", () => {
  it("Paid when remaining is 0", () => {
    const paid = [{ id: "p1", amount: 1000_00, date: "2026-10-01", method: "Other" as const }];
    expect(deriveStatus({ amount: 1000_00, dueDate: DUE_FUTURE }, paid, TODAY_DATE)).toBe("Paid");
  });

  it("Pending when due in the future", () => {
    expect(deriveStatus({ amount: 1000_00, dueDate: DUE_FUTURE }, noPay, TODAY_DATE)).toBe("Pending");
  });

  it("Pending when due *today* (boundary, not overdue yet)", () => {
    expect(deriveStatus({ amount: 1000_00, dueDate: DUE_TODAY }, noPay, TODAY_DATE)).toBe("Pending");
  });

  it("Overdue when due date has passed", () => {
    expect(deriveStatus({ amount: 1000_00, dueDate: DUE_PAST }, noPay, TODAY_DATE)).toBe("Overdue");
  });

  it("remainingPoisha floors at 0", () => {
    const big = [{ id: "p1", amount: 5_000_00, date: "2026-10-01", method: "Other" as const }];
    expect(remainingPoisha({ amount: 1_000_00 }, big)).toBe(0);
  });

  it("amountPaidPoisha sums correctly", () => {
    const ps = [
      { id: "p1", amount: 100_00, date: "2026-10-01", method: "Other" as const },
      { id: "p2", amount: 250_00, date: "2026-10-02", method: "Other" as const },
    ];
    expect(amountPaidPoisha(ps)).toBe(350_00);
  });
});
