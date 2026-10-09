import { describe, it, expect } from "vitest";
import { normalisePhone, isValidPhone, formatPhone, maskPhone } from "@/lib/phone";

describe("phone", () => {
  it("normalises the common local form", () => {
    expect(normalisePhone("01712345678")).toBe("+8801712345678");
  });

  it("normalises without the leading zero (still valid)", () => {
    // A 10-digit number starting with 1[3-9] is valid; the
    // missing leading zero is tolerated.
    expect(normalisePhone("1712345678")).toBe("+8801712345678");
  });

  it("rejects numbers with too few digits", () => {
    expect(normalisePhone("171234567")).toBeNull();
  });

  it("normalises with the country code", () => {
    expect(normalisePhone("+8801712345678")).toBe("+8801712345678");
    expect(normalisePhone("8801712345678")).toBe("+8801712345678");
    expect(normalisePhone("008801712345678")).toBe("+8801712345678");
  });

  it("strips spaces, dashes, parentheses", () => {
    expect(normalisePhone("+880 1712-345 678")).toBe("+8801712345678");
    expect(normalisePhone("(880) 1712-345-678")).toBe("+8801712345678");
  });

  it("rejects numbers that don't start with 1[3-9]", () => {
    expect(normalisePhone("+880112345678")).toBeNull();
    expect(normalisePhone("+880212345678")).toBeNull();
    expect(normalisePhone("+880191234567")).toBeNull(); // 9 digits
    expect(normalisePhone("+88019123456789")).toBeNull(); // 11 digits
  });

  it("rejects non-BD numbers", () => {
    expect(normalisePhone("+14155550100")).toBeNull();
    expect(normalisePhone("+911234567890")).toBeNull();
  });

  it("isValidPhone delegates to normalisePhone", () => {
    expect(isValidPhone("01712345678")).toBe(true);
    expect(isValidPhone("garbage")).toBe(false);
  });

  it("formatPhone picks between local and E.164", () => {
    expect(formatPhone("+8801712345678", "e164")).toBe("+8801712345678");
    expect(formatPhone("+8801712345678", "local")).toBe("01712345678");
  });

  it("maskPhone redacts all but the last 2 digits", () => {
    expect(maskPhone("+8801712345678")).toBe("+8801XXX…XXX78");
    expect(maskPhone(null)).toBe("<none>");
    expect(maskPhone("not a phone")).toBe("<invalid>");
  });
});
