// Integration test: seed localStorage with the legacy v1 shape,
// read via the public `getReminderSettings()` function (the same
// path the hook uses), and verify the returned record is fully
// populated and the per-tone, per-language templates are reachable
// in both English and Bangla.
//
// Run: npx tsx scripts/verify-crash-fix.mts

import assert from "node:assert/strict";

(globalThis as any).window = {
  localStorage: {
    store: new Map<string, string>(),
    getItem(k: string) { return this.store.get(k) ?? null; },
    setItem(k: string, v: string) { this.store.set(k, v); },
    removeItem(k: string) { this.store.delete(k); },
    clear() { this.store.clear(); },
  },
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};
(globalThis as any).CustomEvent = class { constructor(public type: string) {} };
process.env.NEXT_PUBLIC_API_URL = "";

const store = (globalThis as any).window.localStorage;

/* ---- Case 1: legacy v1 with `emailBody` (pre-Bangla) ---- */
store.setItem(
  "loan-reminder:settings:v2",
  JSON.stringify({
    tone: "Friendly",
    templates: {
      Friendly: { sms: "F-EN", emailSubject: "F-S", emailBody: "F-E" },
      Neutral: { sms: "N-EN", emailSubject: "N-S", email: "N-E" },
      Firm: { sms: "FM-EN", emailSubject: "FM-S", emailBody: "FM-E" },
    },
    channels: { sms: true, email: false, threeDaysBefore: true, onDueDate: true, everyTwoDaysAfterOverdue: false },
  }),
);

const { getReminderSettings, SEED } = await import("../src/services/reminderService.ts");
const out = await getReminderSettings();
assert.equal(out.__v, 2);
assert.equal(out.tone, "Friendly");
assert.equal(out.messageLanguage, "en");
assert.equal(out.templates.Friendly.en.sms, "F-EN");
assert.equal(out.templates.Friendly.en.email, "F-E");
assert.equal(out.templates.Friendly.bn.sms, SEED.templates.Friendly.bn.sms);
assert.equal(out.templates.Neutral.en.email, "N-E");
assert.equal(out.templates.Firm.bn.sms, SEED.templates.Firm.bn.sms);
assert.equal(out.channels.everyTwoDaysAfterOverdue, false);
assert.equal(out.channels.email, false);
console.log("OK  legacy v1 shape → fully populated v2, English preserved, Bangla seeded");

/* ---- Case 2: empty localStorage ---- */
store.clear();
const empty = await getReminderSettings();
assert.equal(empty.tone, "Friendly");
assert.equal(empty.templates.Friendly.en.sms, SEED.templates.Friendly.en.sms);
assert.equal(empty.templates.Friendly.bn.sms, SEED.templates.Friendly.bn.sms);
assert.equal(empty.channels.sms, true);
console.log("OK  empty localStorage → seed defaults");

/* ---- Case 3: corrupted JSON ---- */
store.setItem("loan-reminder:settings:v2", "{not valid json");
const corrupt = await getReminderSettings();
assert.equal(corrupt.tone, "Friendly");
assert.equal(corrupt.templates.Friendly.bn.sms, SEED.templates.Friendly.bn.sms);
console.log("OK  corrupted JSON → safe fallback to seed (no throw)");

/* ---- Case 4: legacy v1 with no `messageLanguage` ---- */
store.setItem(
  "loan-reminder:settings:v2",
  JSON.stringify({
    tone: "Firm",
    templates: {
      Friendly: { sms: "X1", emailSubject: "X1S", email: "X1E" },
      Neutral: { sms: "X2", emailSubject: "X2S", email: "X2E" },
      Firm: { sms: "X3", emailSubject: "X3S", email: "X3E" },
    },
    channels: { sms: true, email: true, threeDaysBefore: true, onDueDate: true, everyTwoDaysAfterOverdue: true },
  }),
);
const noLang = await getReminderSettings();
assert.equal(noLang.messageLanguage, "en");
assert.equal(noLang.tone, "Firm");
console.log("OK  legacy v1 without messageLanguage → defaults to 'en'");

/* ---- Case 5: write-back to :v2 key with the migrated shape ---- */
// Re-read after Case 4; the normalizer should have written the v2
// record back to the storage key.
const rewritten = store.getItem("loan-reminder:settings:v2");
assert.ok(rewritten, "expected :v2 key to be present after migration");
const parsed = JSON.parse(rewritten!);
assert.equal(parsed.__v, 2);
assert.equal(parsed.tone, "Firm");
assert.ok(parsed.templates.Friendly.en);
assert.ok(parsed.templates.Friendly.bn);
console.log("OK  migrated record is written back to :v2 with __v: 2");

/* ---- Case 6: re-read returns the same (migrated) record ---- */
const again = await getReminderSettings();
assert.equal(again.tone, "Firm");
assert.equal(again.templates.Friendly.bn.sms, SEED.templates.Friendly.bn.sms);
console.log("OK  re-read returns the same migrated record");

console.log("\nAll crash-fix verification tests passed.");
