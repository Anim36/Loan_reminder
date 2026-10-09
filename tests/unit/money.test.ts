import { describe, it, expect } from "vitest";
import { takaToPoisha, poishaToTaka, roundTaka, POISHA_PER_TAKA } from "@/lib/money";

describe("money", () => {
  it("converts whole taka to poisha", () => {
    expect(takaToPoisha(1)).toBe(POISHA_PER_TAKA);
    expect(takaToPoisha(5000)).toBe(500_000);
  });

  it("rounds taka to nearest poisha (half-up)", () => {
    expect(takaToPoisha(0.005)).toBe(1);
    expect(takaToPoisha(12.5)).toBe(1250);
  });

  it("returns 0 for non-finite input", () => {
    expect(takaToPoisha(Number.NaN)).toBe(0);
    expect(takaToPoisha(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("converts poisha back to taka", () => {
    expect(poishaToTaka(100)).toBe(1);
    expect(poishaToTaka(500_000)).toBe(5000);
  });

  it("roundTaka strips floating point noise", () => {
    // 12345 poisha = 123.45 taka exactly; roundTaka should
    // return 123.45, not 123.45000000000001.
    expect(roundTaka(12345)).toBe(123.45);
    // 33 poisha = 0.33 taka.
    expect(roundTaka(33)).toBe(0.33);
  });
});
