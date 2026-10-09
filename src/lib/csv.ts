// CSV serialisation helpers.
//
// Used by the Reports export. The output is plain RFC 4180
// CSV with two extra safety features:
//
//   1. **Formula-injection guard.** Excel / LibreOffice /
//      Google Sheets evaluate any cell that starts with
//      `=`, `+`, `-`, `@`, TAB or CR as a formula. An
//      attacker who can put `=cmd|...` in a friend's name
//      can execute code on the next person to open the
//      sheet. The `escapeCell` helper prefixes such cells
//      with a single quote so the spreadsheet treats the
//      value as text.
//
//   2. **Excel-friendly line endings.** We emit `\r\n` so
//      the file works on Windows Excel; the BOM is the
//      caller's job (`route.ts` adds it for the download).
//
// Tests live in `tests/unit/csv.test.ts`.

/** The set of characters that, when a cell starts with them,
 *  are interpreted as a formula by a spreadsheet. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/** Escape a single cell. Always returns a string. */
export function escapeCell(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  let s = typeof raw === "string" ? raw : String(raw);
  // Formula injection: prefix with a single quote so the
  // sheet sees the cell as text.
  const formula = FORMULA_PREFIX.test(s);
  if (formula) s = "'" + s;
  // RFC 4180 quoting: wrap in double quotes when the value
  // contains a comma, double quote, CR, or LF; escape any
  // double quote inside the cell by doubling it.
  //
  // We also wrap any formula-injection cell, even if it
  // doesn't otherwise need quoting, so the output is
  // unambiguous for downstream consumers.
  if (formula || /[",\r\n]/.test(s)) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/** Build a single CSV line from a list of cells. */
export function csvRow(cells: ReadonlyArray<unknown>): string {
  return cells.map(escapeCell).join(",");
}

/** Build a full CSV document (no BOM). Lines are joined with
 *  `\r\n`. Trailing newline included. */
export function buildCsv(rows: ReadonlyArray<ReadonlyArray<unknown>>): string {
  return rows.map(csvRow).join("\r\n") + "\r\n";
}
