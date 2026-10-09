// Build the `Dictionary` interface in `src/lib/i18n/types.ts` from
// the actual keys present in `en.ts`. The generated file is checked
// in; this script just keeps the type definition in sync when
// dictionaries are added to or removed from.
//
// Run with: `npx tsx scripts/build-dictionary-types.mts`.

import { en } from "../src/lib/i18n/en.ts";
import { bn } from "../src/lib/i18n/bn.ts";
import * as fs from "node:fs";

function isFunction(v: unknown): v is (...a: unknown[]) => string {
  return typeof v === "function";
}

const enKeys = Object.keys(en).sort() as string[];
const bnKeys = Object.keys(bn).sort() as string[];

const enSet = new Set(enKeys);
const bnSet = new Set(bnKeys);
const missingInBn = enKeys.filter((k) => !bnSet.has(k));
const missingInEn = bnKeys.filter((k) => !enSet.has(k));
if (missingInBn.length || missingInEn.length) {
  console.error("Dictionaries are out of sync:");
  for (const k of missingInBn) console.error("  missing in bn:", k);
  for (const k of missingInEn) console.error("  missing in en:", k);
  process.exit(1);
}

function inferFnType(fn: (...a: unknown[]) => string): string {
  // Use `unknown` for every parameter so callers can pass numbers
  // (count) or strings (already-formatted money, dates, names)
  // without the type system complaining. The function bodies coerce
  // with template literals.
  //
  // Read the parameter list as the segment before the first `=>`
  // so we don't accidentally pick up parens from the function body
  // (e.g. `something.toUpperCase()`). We preserve the original
  // parameter names (instead of synthesising `arg0`/`arg1`/…) so the
  // dictionary's function expression stays compatible with the
  // generated type — the variable the body uses is the one we
  // declare.
  const src = fn.toString();
  const arrowIdx = src.indexOf("=>");
  const head = arrowIdx === -1 ? src : src.slice(0, arrowIdx);
  const paren = head.match(/\(([^)]*)\)/);
  if (paren) {
    const inside = paren[1].trim();
    if (!inside) return "() => string";
    if (inside.startsWith("{")) {
      return `(_args: Record<string, unknown>) => string`;
    }
    if (inside.startsWith("[")) {
      return `(_args: unknown[]) => string`;
    }
    const parts = inside
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return "() => string";
    return `(${parts.map((p) => `${p}: unknown`).join(", ")}) => string`;
  }
  // Single bare parameter (`m => …`). Node's `toString` drops the
  // parens when the function is declared without them in source.
  const bare = head.match(/^\s*[\(]?\s*([A-Za-z_$][\w$]*)/);
  if (bare) {
    return `(${bare[1]}: unknown) => string`;
  }
  return "() => string";
}

const lines: string[] = [];
lines.push("// Auto-generated Dictionary interface. Edit the dictionaries,");
lines.push("// then re-run scripts/build-dictionary-types.mts.");
lines.push("");
lines.push('export type Lang = "en" | "bn";');
lines.push("");
lines.push("export interface Dictionary {");

const banner = (s: string): void => {
  lines.push("");
  lines.push(`  // ── ${s} ${"─".repeat(Math.max(0, 64 - s.length))}`);
};

const grouped = new Map<string, string[]>();
for (const k of enKeys) {
  const top = k.split(".")[0];
  const arr = grouped.get(top) ?? [];
  arr.push(k);
  grouped.set(top, arr);
}

for (const g of Array.from(grouped.keys()).sort()) {
  banner(g);
  for (const k of grouped.get(g)!) {
    const v = en[k] as unknown;
    const isFn = isFunction(v);
    const type = isFn ? inferFnType(v) : "string";
    lines.push(`  "${k}": ${type};`);
  }
}

lines.push("}");
lines.push("");

fs.writeFileSync("src/lib/i18n/types.ts", lines.join("\n"), "utf8");
console.log("Wrote src/lib/i18n/types.ts with", enKeys.length, "keys.");
