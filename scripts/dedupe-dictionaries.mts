// Dedup the en.ts / bn.ts dictionaries: keep the FIRST occurrence of
// each key, remove subsequent ones. The original dictionaries had
// the original set of keys; my second pass added overlapping keys.
// After dedup the files should still type-check.
//
// Run: npx tsx scripts/dedupe-dictionaries.mts

import * as fs from "node:fs";

function dedupe(path: string): void {
  const raw = fs.readFileSync(path, "utf8");
  const seen = new Set<string>();
  const out: string[] = [];
  // Match "key": value at the start of a line, possibly indented.
  // The key can be a quoted string with letters, digits, dots, dashes.
  const re = /^(\s*)"([a-zA-Z][a-zA-Z0-9._-]*)":/;
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(re);
    if (m) {
      const key = m[2];
      if (seen.has(key)) {
        // Skip this line. The line is the *whole* property including
        // its trailing comma.
        continue;
      }
      seen.add(key);
    }
    out.push(line);
  }
  fs.writeFileSync(path, out.join("\n"), "utf8");
  console.log(`${path}: removed duplicates, kept ${seen.size} keys.`);
}

dedupe("src/lib/i18n/en.ts");
dedupe("src/lib/i18n/bn.ts");
