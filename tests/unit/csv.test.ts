import { describe, it, expect } from "vitest";
import { escapeCell, csvRow, buildCsv } from "@/lib/csv";

describe("csv", () => {
  it("passes through plain values", () => {
    expect(escapeCell("hello")).toBe("hello");
    expect(escapeCell(42)).toBe("42");
    expect(escapeCell(0)).toBe("0");
  });

  it("emits an empty string for null / undefined", () => {
    expect(escapeCell(null)).toBe("");
    expect(escapeCell(undefined)).toBe("");
  });

  it("quotes values that contain commas", () => {
    expect(escapeCell("a, b")).toBe('"a, b"');
  });

  it("escapes embedded double quotes by doubling them", () => {
    expect(escapeCell('she said "hi"')).toBe('"she said ""hi"""');
  });

  it("quotes values that contain CR / LF", () => {
    expect(escapeCell("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCell("line1\r\nline2")).toBe('"line1\r\nline2"');
  });

  /* ---- formula injection -------------------------------------- */

  it("prefixes cells that start with = to neutralise formula injection", () => {
    expect(escapeCell("=cmd|'/c calc'!A1")).toBe("\"'=cmd|'/c calc'!A1\"");
  });

  it("prefixes cells that start with + - @", () => {
    expect(escapeCell("+1+1")).toBe("\"'+1+1\"");
    expect(escapeCell("-2")).toBe("\"'-2\"");
    expect(escapeCell("@sum(A1:A2)")).toBe("\"'@sum(A1:A2)\"");
  });

  it("prefixes cells that start with TAB or CR", () => {
    expect(escapeCell("\there")).toBe("\"'\there\"");
    expect(escapeCell("\rfoo")).toBe("\"'\rfoo\"");
  });

  it("does NOT prefix cells with leading whitespace + formula char", () => {
    // Excel triggers on the first non-space char; a leading
    // space is a defensive measure we don't take here. The
    // user can sanitize at the input layer.
    expect(escapeCell(" =cmd")).toBe(" =cmd");
  });

  it("csvRow joins cells with commas", () => {
    expect(csvRow(["a", "b", "c"])).toBe("a,b,c");
  });

  it("buildCsv joins rows with CRLF and adds a trailing newline", () => {
    const out = buildCsv([
      ["a", "b"],
      ["c", "d"],
    ]);
    expect(out).toBe("a,b\r\nc,d\r\n");
  });
});
