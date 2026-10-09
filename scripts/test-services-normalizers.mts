// Smoke test for the user-settings, notifications, and loans
// normalizers. Same mock setup as the reminder test.

import assert from "node:assert/strict";

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
process.env.NEXT_PUBLIC_API_URL = "";

/* ---- UserSettings -------------------------------------------------- */
{
  const { normalizeSettings: n } = await import("../src/services/settingsService.ts");
  // v0 (pre-banglaNumerals) record
  const v0 = {
    displayName: "Ayesha",
    phone: "1712345678",
    email: "ayesha@example.com",
    theme: "light",
    notifications: { emailOnPaid: false, emailOnOverdue: true },
  };
  const out = n(v0);
  assert.equal(out.banglaNumerals, false);
  assert.equal(out.notifications.weeklySummary, false);
  assert.equal(out.notifications.emailOnPaid, false);
  assert.equal(out.notifications.emailOnOverdue, true);
  assert.equal(out.__v, 2);

  // corrupted
  const corrupted = n({ displayName: "", email: "x" });
  assert.equal(corrupted.displayName, "Ayesha");
  assert.equal(corrupted.email, "x");
  assert.equal(corrupted.theme, "light");

  // null
  const empty = n(null);
  assert.equal(empty.displayName, "Ayesha");
  console.log("OK  UserSettings normalizer: v0 + corrupted + null");
}

/* ---- Notifications ------------------------------------------------- */
{
  const { normalizeNotification } = await import("../src/services/notificationService.ts");
  // Legacy record missing `kind`, `href`, `unread`
  const legacy = { id: "x", createdAt: "2024-01-01T00:00:00.000Z", title: "T" };
  const out = normalizeNotification(legacy, 0);
  assert.equal(out.id, "x");
  assert.equal(out.kind, "loan-created");
  assert.equal(out.href, "/dashboard");
  assert.equal(out.unread, true);
  assert.equal(out.title, "T");
  // Corrupt (non-object)
  const corrupt = normalizeNotification(null, 1);
  assert.equal(typeof corrupt.id, "string");
  assert.equal(corrupt.kind, "loan-created");
  console.log("OK  Notification normalizer: legacy + corrupt");
}

/* ---- Loans --------------------------------------------------------- */
{
  const { normalizeLoan } = await import("../src/services/loanService.ts");
  // v1 (no payments, no rescheduleHistory, no messageLanguage)
  const v1 = {
    id: "loan-x",
    friend: { id: "f1", name: "Tanvir" },
    amount: 1000,
    dateGiven: "2024-01-01",
    dueDate: "2024-02-01",
    tone: "Friendly",
    reminders: { sms: true, email: false },
    consent: false,
    status: "Pending",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
  const out = normalizeLoan(v1 as any);
  assert.equal(out.id, "loan-x");
  assert.equal(out.amount, 1000);
  assert.equal(out.payments.length, 0);
  assert.equal(out.rescheduleHistory.length, 0);
  assert.equal(out.messageLanguage, undefined);
  // Undefined reminders (legacy)
  const noRem = { ...v1, reminders: undefined } as any;
  const out2 = normalizeLoan(noRem);
  assert.equal(out2.reminders.sms, true);
  assert.equal(out2.reminders.email, false);
  console.log("OK  Loan normalizer: v1 shape + undefined reminders");
}

console.log("\nAll services' normalizers pass.");
