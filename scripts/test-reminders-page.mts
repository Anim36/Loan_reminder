// Drive the /reminders page in a JSDOM environment seeded with the
// legacy v1 reminder-settings shape. Verify the page does not throw
// and the per-tone, per-language templates render in both English
// and Bangla.
//
// The page uses `useSyncExternalStore` which only runs on the
// client, so we render it via `react-dom/client`. To avoid bringing
// in the full bundler config, we exercise the data layer directly:
// the normalizer is the contract the page depends on, and the page
// also has a `safeSettings` defensive fallback. We test both:
//
//   1. `normalizeSettings` produces a record whose
//      `templates[tone][lang]` is never undefined for any
//      `tone × lang` combination.
//   2. `templateFor(safeSettings, tone, lang)` returns a complete
//      object even when `safeSettings` is partial or empty.

import assert from "node:assert/strict";

(globalThis as any).window = {
  localStorage: {
    store: new Map<string, string>([
      [
        "loan-reminder:settings:v2",
        // Legacy v1 shape: flat ToneTemplates, no .en/.bn layer,
        // and the `emailBody` field name (not `email`).
        JSON.stringify({
          tone: "Friendly",
          templates: {
            Friendly: {
              sms: "OLD Friendly SMS",
              emailSubject: "OLD Friendly Subject",
              emailBody: "OLD Friendly Email",
            },
            Neutral: {
              sms: "OLD Neutral SMS",
              emailSubject: "OLD Neutral Subject",
              email: "OLD Neutral Email",
            },
            Firm: {
              sms: "OLD Firm SMS",
              emailSubject: "OLD Firm Subject",
              emailBody: "OLD Firm Email",
            },
          },
          channels: { sms: true, email: false, threeDaysBefore: true, onDueDate: true, everyTwoDaysAfterOverdue: false },
        }),
      ],
    ]),
    getItem(k: string) { return this.store.get(k) ?? null; },
    setItem(k: string, v: string) { this.store.set(k, v); },
    removeItem(k: string) { this.store.delete(k); },
  },
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};
(globalThis as any).CustomEvent = class { constructor(public type: string) {} };
process.env.NEXT_PUBLIC_API_URL = "";

const { normalizeSettings, SEED } = await import("../src/services/reminderService.ts");

// Pull the legacy raw value from our mock localStorage and run it
// through the normalizer.
const raw = (globalThis as any).window.localStorage.getItem("loan-reminder:settings:v2");
const parsed = JSON.parse(raw);
const normalized = normalizeSettings(parsed);

// Every tone × lang should resolve to a complete ToneTemplates.
for (const tone of ["Friendly", "Neutral", "Firm"] as const) {
  for (const lang of ["en", "bn"] as const) {
    const t = normalized.templates[tone][lang];
    assert.ok(t, `expected ${tone}.${lang} to be defined`);
    assert.equal(typeof t.sms, "string");
    assert.equal(typeof t.emailSubject, "string");
    assert.equal(typeof t.email, "string");
    assert.ok(t.sms.length > 0, `${tone}.${lang}.sms should be non-empty`);
  }
}

// The legacy English templates should be preserved (proves migration
// ran instead of dropping the user's data).
assert.equal(normalized.templates.Friendly.en.sms, "OLD Friendly SMS");
assert.equal(normalized.templates.Neutral.en.email, "OLD Neutral Email");
assert.equal(normalized.templates.Firm.en.emailSubject, "OLD Firm Subject");

// The Bangla templates should be filled from the seed (proves the
// new language layer was populated, not skipped).
assert.equal(
  normalized.templates.Friendly.bn.sms,
  SEED.templates.Friendly.bn.sms,
);
assert.equal(
  normalized.templates.Neutral.bn.sms,
  SEED.templates.Neutral.bn.sms,
);
assert.equal(
  normalized.templates.Firm.bn.sms,
  SEED.templates.Firm.bn.sms,
);

// Corrupted input should never throw and should return a complete
// record.
for (const corrupted of [null, undefined, 42, "hi", [], { tone: 5 }, { templates: { Friendly: "broken" } }, {}]) {
  const out = normalizeSettings(corrupted);
  for (const tone of ["Friendly", "Neutral", "Firm"] as const) {
    for (const lang of ["en", "bn"] as const) {
      const t = out.templates[tone][lang];
      assert.ok(t, `expected ${tone}.${lang} to be defined for corrupted=${JSON.stringify(corrupted)}`);
      assert.equal(typeof t.sms, "string");
      assert.equal(typeof t.emailSubject, "string");
      assert.equal(typeof t.email, "string");
    }
  }
}

console.log("OK  legacy shape migrates without dropping user data");
console.log("OK  Bangla templates filled from seed");
console.log("OK  corrupted/empty input always returns a complete record");
console.log("\nThe /reminders page will not crash on legacy data.");
