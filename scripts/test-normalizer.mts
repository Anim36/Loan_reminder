// Quick smoke test for the reminder settings normalizer. We mock
// `window`/`localStorage` so we can exercise the migration paths
// against the real `reminderService` code. Run with: `npx tsx
// scripts/test-reminder-normalizer.mts` from the project root.

import assert from "node:assert/strict";

// Stub the globals that the service touches at module load.
const store = new Map<string, string>();
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};
(globalThis as any).CustomEvent = class { constructor(public type: string) {} };

// Make sure the service is loaded in API-off mode.
process.env.NEXT_PUBLIC_API_URL = "";

const { normalizeSettings, SEED } = await import("../src/services/reminderService.ts");

// --- Test 1: v1 flat shape (sms + emailSubject + emailBody) ----
{
  const v1 = {
    tone: "Friendly",
    templates: {
      Friendly: { sms: "OLD1", emailSubject: "OLD1S", emailBody: "OLD1E" },
      Neutral: { sms: "OLD2", emailSubject: "OLD2S", emailBody: "OLD2E" },
      Firm: { sms: "OLD3", emailSubject: "OLD3S", emailBody: "OLD3E" },
    },
    channels: { sms: true, email: false, threeDaysBefore: true, onDueDate: true, everyTwoDaysAfterOverdue: false },
  };
  const out = normalizeSettings(v1);
  assert.equal(out.tone, "Friendly");
  assert.equal(out.templates.Friendly.en.sms, "OLD1");
  assert.equal(out.templates.Friendly.en.emailSubject, "OLD1S");
  assert.equal(out.templates.Friendly.en.email, "OLD1E");
  assert.equal(out.templates.Friendly.bn.sms, SEED.templates.Friendly.bn.sms);
  assert.equal(out.templates.Neutral.en.sms, "OLD2");
  assert.equal(out.templates.Firm.bn.email, SEED.templates.Firm.bn.email);
  assert.equal(out.channels.sms, true);
  assert.equal(out.channels.email, false);
  assert.equal(out.channels.everyTwoDaysAfterOverdue, false);
  assert.equal(out.messageLanguage, "en");
  console.log("OK  v1 flat shape migrates to v2 with Bangla filled from seed");
}

// --- Test 2: v2 already-correct shape --------------------------
{
  const v2 = {
    __v: 2,
    tone: "Neutral",
    messageLanguage: "bn",
    templates: {
      Friendly: { en: { sms: "F1", emailSubject: "F1S", email: "F1E" }, bn: { sms: "F1B", emailSubject: "F1BS", email: "F1BE" } },
      Neutral: { en: { sms: "N1", emailSubject: "N1S", email: "N1E" }, bn: { sms: "N1B", emailSubject: "N1BS", email: "N1BE" } },
      Firm: { en: { sms: "FM1", emailSubject: "FM1S", email: "FM1E" }, bn: { sms: "FM1B", emailSubject: "FM1BS", email: "FM1BE" } },
    },
    channels: { sms: true, email: true, threeDaysBefore: false, onDueDate: true, everyTwoDaysAfterOverdue: true },
  };
  const out = normalizeSettings(v2);
  assert.equal(out.tone, "Neutral");
  assert.equal(out.messageLanguage, "bn");
  assert.equal(out.templates.Friendly.en.sms, "F1");
  assert.equal(out.templates.Friendly.bn.sms, "F1B");
  assert.equal(out.templates.Firm.bn.email, "FM1BE");
  assert.equal(out.channels.threeDaysBefore, false);
  console.log("OK  v2 record round-trips unchanged");
}

// --- Test 3: empty / null / non-object -------------------------
{
  assert.deepEqual(normalizeSettings(null).tone, "Friendly");
  assert.equal(normalizeSettings(undefined).tone, "Friendly");
  assert.equal(normalizeSettings(42).tone, "Friendly");
  assert.equal(normalizeSettings("hi").tone, "Friendly");
  assert.equal(normalizeSettings({}).tone, "Friendly");
  assert.equal(normalizeSettings({ templates: { Friendly: null } }).templates.Friendly.bn.sms, SEED.templates.Friendly.bn.sms);
  console.log("OK  empty/null/non-object falls back to seed");
}

// --- Test 4: missing tone, missing language, missing channels --
{
  const partial = { tone: "Firm" };
  const out = normalizeSettings(partial);
  assert.equal(out.tone, "Firm");
  assert.equal(out.messageLanguage, "en");
  assert.equal(out.templates.Friendly.en.sms, SEED.templates.Friendly.en.sms);
  assert.equal(out.channels.sms, true);
  assert.equal(out.channels.email, true);
  console.log("OK  partial record (no templates, no channels) gets seed defaults");
}

// --- Test 5: corrupted per-tone template -----------------------
{
  const broken = {
    tone: "Firm",
    templates: {
      Friendly: { en: { sms: 42, email: undefined, emailSubject: null } },
      Neutral: "not an object",
      Firm: null,
    },
  };
  const out = normalizeSettings(broken);
  assert.equal(out.templates.Friendly.en.sms, SEED.templates.Friendly.en.sms);
  assert.equal(out.templates.Neutral.en.sms, SEED.templates.Neutral.en.sms);
  assert.equal(out.templates.Firm.bn.sms, SEED.templates.Firm.bn.sms);
  console.log("OK  corrupted per-tone templates get seed defaults");
}

console.log("\nAll tests passed.");
