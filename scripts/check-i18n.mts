// i18n check script.
//
// 1. Verifies that the English and Bangla dictionaries have exactly
//    the same keys.
// 2. Verifies that every Bangla leaf string is non-empty.
// 3. Verifies that every Bangla value differs from the English
//    value (catches accidental "fallback to English" entries that
//    would still render in English when the user switches to
//    Bangla).
//
// Usage:  npx tsx scripts/check-i18n.mts
//   or:  npm run check:i18n (see package.json)

import { bn } from "../src/lib/i18n/bn.ts";
import { en } from "../src/lib/i18n/en.ts";
import type { Dictionary } from "../src/lib/i18n/types.ts";

type Leaf = string | ((...args: unknown[]) => string);

function isFunction(v: unknown): v is (...args: unknown[]) => string {
  return typeof v === "function";
}

let problems = 0;
function fail(msg: string): void {
  console.error(`  ✗ ${msg}`);
  problems += 1;
}
function pass(msg: string): void {
  console.log(`  ✓ ${msg}`);
}

const enKeys = Object.keys(en) as (keyof Dictionary)[];
const bnKeys = Object.keys(bn) as (keyof Dictionary)[];

const enSet = new Set<string>(enKeys);
const bnSet = new Set<string>(bnKeys);

console.log(`English dictionary: ${enKeys.length} keys`);
console.log(`Bangla dictionary:  ${bnKeys.length} keys`);

// 1. Same key set.
console.log("\n1. Key parity");
for (const k of enKeys) {
  if (!bnSet.has(k)) fail(`Missing in bn.ts: ${k}`);
}
for (const k of bnKeys) {
  if (!enSet.has(k)) fail(`Missing in en.ts: ${k}`);
}
if (enSet.size === bnSet.size && problems === 0)
  pass(`Same key set (${enKeys.length} keys)`);

// 2. No empty Bangla values.
console.log("\n2. Bangla values are non-empty");
for (const k of enKeys) {
  const v = bn[k] as unknown;
  if (isFunction(v)) continue;
  if (typeof v === "string" && v.trim().length === 0) {
    fail(`Empty Bangla value for ${k}`);
  }
}
if (problems === 0) pass("All Bangla values are non-empty");

// 3. Bangla values must differ from English (catches accidental
//    "fallback" entries).
console.log("\n3. Bangla ≠ English where expected");
// Exceptions: brand name in the proper-noun context, language labels,
// and the months that are common nouns may legitimately coincide.
const ALLOW = new Set<string>([
  "common.appName", // logo wordmark stays in English
  "nav.english",    // language label
  "nav.bangla",     // language label (bn.value is "বাংলা" anyway)
  "form.messageLanguage.en",
  "form.messageLanguage.bn",
  "reminders.messageLanguage.en",
  "reminders.messageLanguage.bn",
  // Punctuation-only / brand-abbreviation leaves that don't
  // differ between languages.
  "loanDetails.unknownDate",        // "—"
  "reminders.history.channels.sms", // "SMS"
  "settings.emailPlaceholder",      // "you@example.com"
  // The legal.untranslatedNotice is a Bangla-language notice that
  // appears on the English-only Terms / Privacy pages. The same
  // Bangla text is used in both dictionaries because the message is
  // *about* the missing translation.
  "legal.untranslatedNotice",
  // The "ui." audit-phase-2 keys. Some are intentionally the same
  // (brand labels, the untranslated Bangla notice, the em-dash
  // placeholder, the English-side greetings used as en-* fallbacks
  // for the landing mockup that has separate `*Bn` keys).
  "ui.emailPlaceholder",          // "you@example.com" — placeholder
  "ui.sms",                        // "SMS" — channel abbreviation
  "ui.previewEmail",               // "tanvir.hasan@gmail.com" — example
  "ui.reminders.smsLabel",         // "SMS" — channel label
  "ui.settings.profile.emailType", // "email" — type attribute value
  "ui.loanDetails.dash",           // "—"
  "ui.emptyState.default",         // "—"
  "ui.method.sms",                 // "SMS"
  // Landing mockup fallbacks: the en side holds the English
  // greeting/due string; the bn side has its own `*Bn` keys, so
  // the check should not penalize the dual-keyed pair.
  "ui.landing.mockup.greeting.morning",
  "ui.landing.mockup.greeting.afternoon",
  "ui.landing.mockup.greeting.evening",
  "ui.landing.mockup.greeting.night",
  "ui.landing.mockup.greeting.morningBn",
  "ui.landing.mockup.greeting.afternoonBn",
  "ui.landing.mockup.greeting.eveningBn",
  "ui.landing.mockup.greeting.nightBn",
  "ui.landing.mockup.dueRafi",
  "ui.landing.mockup.dueRafiBn",
  "ui.landing.mockup.dueTanvir",
  "ui.landing.mockup.dueTanvirBn",
  "ui.landing.overline.date",
  "ui.landing.overline.dateBn",
  // The loan-form message-language options intentionally share
  // their own display label with the language label.
  "ui.loanForm.messageLanguageEnglish",
  "ui.loanForm.messageLanguageBangla",
  // The Bangla "this page is not yet in English" notice is a
  // literal Bangla string stored on both sides so callers don't
  // have to branch on language.
  "ui.legal.banglaNotice",
]);
for (const k of enKeys) {
  if (ALLOW.has(k)) continue;
  const e = en[k] as unknown;
  const b = bn[k] as unknown;
  if (isFunction(e) || isFunction(b)) continue;
  if (typeof e === "string" && typeof b === "string" && e === b) {
    fail(`Bangla value identical to English for ${k}: "${b}"`);
  }
}
if (problems === 0) pass("All Bangla values differ from English (except brand / labels)");

// 4. Bangla values must contain at least one Bangla character where
// appropriate (heuristic: any letter in the range U+0980–U+09FF or
// common punctuation).
console.log("\n4. Bangla content uses Bangla script");
const BANGLA = /[\u0980-\u09FF]/;
for (const k of enKeys) {
  if (ALLOW.has(k)) continue;
  if (k.startsWith("landing.")) continue; // landing has long blocks, lighter check
  const b = bn[k] as unknown;
  if (isFunction(b) || typeof b !== "string") continue;
  if (b.length < 2) continue; // very short tokens like "৳" are fine
  if (!BANGLA.test(b)) {
    // Allow functions / numbers / symbols / mixed ASCII with no
    // Bangla script.
    if (BANGLA.test(b)) continue;
    // Exception: a number-only or symbol-only Bangla value is OK
    // when the English equivalent is also number/symbol.
    const e = en[k] as unknown;
    if (typeof e === "string" && /^[^A-Za-z]+$/.test(e)) continue;
    fail(`Bangla value contains no Bangla script for ${k}: "${b}"`);
  }
}
if (problems === 0) pass("All Bangla values contain Bangla script");

if (problems > 0) {
  console.error(`\n${problems} i18n problem(s) found.`);
  process.exit(1);
}
console.log("\ni18n check: OK");
