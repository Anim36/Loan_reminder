// Reminder settings + reminder-history storage layer.
//
// When `NEXT_PUBLIC_API_URL` is set the functions below hit the
// `/settings` endpoint of the backend. When it's empty they fall back to a
// `localStorage`-backed store that matches the API contract, so the
// prototype keeps working without a server.
//
// All exports are `async` so the call sites never branch on which
// backend is configured. SSR-safe: nothing here touches `window` at
// module scope; the storage helpers check `hasWindow()` themselves.
//
// Storage versioning
// ------------------
// Stored data may have been written by an older release under a
// different shape:
//
//   v0 / unversioned — templates[tone] = { sms, emailSubject, emailBody }
//                      (no `.en` / `.bn` language layer)
//   v1               — same flat shape, but `email` instead of `emailBody`
//   v2 (current)     — templates[tone] = { en: ToneTemplates,
//                                         bn: ToneTemplates }
//                      + `__v: 2` and a `messageLanguage` field.
//
// `normalizeSettings` accepts any of these and returns a fully-populated
// v2 record, deep-merged with `SEED`. The migrated result is written
// back to localStorage so the next read is a no-op. Corrupt or
// non-object JSON falls back to `SEED` without throwing.

import type { MessageLanguage, Tone } from "@/types/loan";
import type { Loan, ReminderChannel } from "@/types";
import {
  API_ENABLED,
  apiGet,
  apiPatch,
  apiPut,
  ApiError,
} from "@/lib/api";
import { getLoans } from "./loanService";
import { hasWindow, readAndNormalize, safeJsonParse } from "./storage";

/** A single tone's SMS and Email templates for a single language. */
export interface ToneTemplates {
  sms: string;
  emailSubject: string;
  email: string;
}

/** Templates for one tone, indexed by language. The English set is
 *  always populated; the Bangla set is seeded and fully editable. */
export type LocalizedTemplates = Record<MessageLanguage, ToneTemplates>;

export interface ChannelDefaults {
  sms: boolean;
  email: boolean;
  threeDaysBefore: boolean;
  onDueDate: boolean;
  everyTwoDaysAfterOverdue: boolean;
}

export interface ReminderSettings {
  /** Schema version — bump on every shape change. */
  __v: 2;
  tone: Tone;
  templates: Record<Tone, LocalizedTemplates>;
  channels: ChannelDefaults;
  messageLanguage: MessageLanguage;
}

const STORAGE_VERSION = 2;
const STORAGE_KEY = "loan-reminder:settings:v2";
const CHANGE_EVENT = "reminder:change";

/* ---- English templates (read from the Figma spec) ----------------- */

export const FRIENDLY_SMS =
  "Hi {friend_name}, just a gentle reminder about the {amount} I lent you, due on {due_date}. Please let me know if you need more time. Thank you! — {my_name}";

export const FRIENDLY_EMAIL_SUBJECT =
  "A reminder about your loan, {friend_name}";

export const FRIENDLY_EMAIL = FRIENDLY_SMS;

export const NEUTRAL_SMS =
  "Hello {friend_name}, this is a reminder that your loan of {amount} is due on {due_date}. Please let me know when you plan to repay. Thank you. — {my_name}";

export const NEUTRAL_EMAIL_SUBJECT = FRIENDLY_EMAIL_SUBJECT;

export const NEUTRAL_EMAIL = NEUTRAL_SMS;

export const FIRM_SMS =
  "Hello {friend_name}, please arrange repayment of {amount} by {due_date}, as agreed. If this is not possible, please contact me so we can agree on a plan. Thank you. — {my_name}";

export const FIRM_EMAIL_SUBJECT = FRIENDLY_EMAIL_SUBJECT;

export const FIRM_EMAIL = FIRM_SMS;

/* ---- Bangla templates ---------------------------------------------
 * Translations of the English set. Bangla SMS uses 70-char segments
 * (Unicode). Tone is preserved across languages. */

const FRIENDLY_SMS_BN =
  "আসসালামু আলাইকুম {friend_name}, {due_date} তারিখে ফেরত দেওয়ার শর্তে আমি আপনাকে {amount} ধার দিয়েছিলাম, সেই বিষয়ে একটি বিনীত অনুরোধ। প্রয়োজনে আরেকটু সময় লাগলে জানাবেন। ধন্যবাদ — {my_name}";

const FRIENDLY_EMAIL_SUBJECT_BN =
  "{friend_name}, আপনার ঋণ সম্পর্কে একটি অনুরোধ";

const FRIENDLY_EMAIL_BN = FRIENDLY_SMS_BN;

const NEUTRAL_SMS_BN =
  "প্রিয় {friend_name}, এটি একটি বিনীত অনুরোধ — {due_date} তারিখে আপনার {amount} ঋণ ফেরত দেওয়ার কথা ছিল। কখন পরিশোধ করতে পারবেন জানালে ভালো হয়। ধন্যবাদ — {my_name}";

const NEUTRAL_EMAIL_SUBJECT_BN = FRIENDLY_EMAIL_SUBJECT_BN;

const NEUTRAL_EMAIL_BN = NEUTRAL_SMS_BN;

const FIRM_SMS_BN =
  "প্রিয় {friend_name}, আমাদের চুক্তি অনুযায়ী {due_date} তারিখের মধ্যে {amount} পরিশোধ করার কথা ছিল। এই মুহূর্তে সম্ভব না হলে আমাকে জানান, যেন আমরা একটি পরিকল্পনায় একমত হতে পারি। ধন্যবাদ — {my_name}";

const FIRM_EMAIL_SUBJECT_BN = FRIENDLY_EMAIL_SUBJECT_BN;

const FIRM_EMAIL_BN = FIRM_SMS_BN;

/* ---- Default templates -------------------------------------------- */

const TONE_EN: Record<Tone, ToneTemplates> = {
  Friendly: {
    sms: FRIENDLY_SMS,
    emailSubject: FRIENDLY_EMAIL_SUBJECT,
    email: FRIENDLY_EMAIL,
  },
  Neutral: {
    sms: NEUTRAL_SMS,
    emailSubject: NEUTRAL_EMAIL_SUBJECT,
    email: NEUTRAL_EMAIL,
  },
  Firm: {
    sms: FIRM_SMS,
    emailSubject: FIRM_EMAIL_SUBJECT,
    email: FIRM_EMAIL,
  },
};

const TONE_BN: Record<Tone, ToneTemplates> = {
  Friendly: {
    sms: FRIENDLY_SMS_BN,
    emailSubject: FRIENDLY_EMAIL_SUBJECT_BN,
    email: FRIENDLY_EMAIL_BN,
  },
  Neutral: {
    sms: NEUTRAL_SMS_BN,
    emailSubject: NEUTRAL_EMAIL_SUBJECT_BN,
    email: NEUTRAL_EMAIL_BN,
  },
  Firm: {
    sms: FIRM_SMS_BN,
    emailSubject: FIRM_EMAIL_SUBJECT_BN,
    email: FIRM_EMAIL_BN,
  },
};

export const SEED: ReminderSettings = {
  __v: STORAGE_VERSION,
  tone: "Friendly",
  messageLanguage: "en",
  templates: {
    Friendly: { en: TONE_EN.Friendly, bn: TONE_BN.Friendly },
    Neutral: { en: TONE_EN.Neutral, bn: TONE_BN.Neutral },
    Firm: { en: TONE_EN.Firm, bn: TONE_BN.Firm },
  },
  channels: {
    sms: true,
    email: true,
    threeDaysBefore: true,
    onDueDate: true,
    everyTwoDaysAfterOverdue: true,
  },
};

/* ---- Normalization ------------------------------------------------- */

function isTone(v: unknown): v is Tone {
  return v === "Friendly" || v === "Neutral" || v === "Firm";
}

function isMessageLanguage(v: unknown): v is MessageLanguage {
  return v === "en" || v === "bn";
}

function isString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

/** Normalize a single ToneTemplates object — never throws, always
 *  returns a complete ToneTemplates. */
function normalizeToneTemplates(input: unknown, fallback: ToneTemplates): ToneTemplates {
  if (!input || typeof input !== "object") return { ...fallback };
  const t = input as Partial<Record<keyof ToneTemplates, unknown>>;
  // Pre-v2 used `emailBody`; accept it as `email` for backward compat.
  const legacy = (t as Record<string, unknown>).emailBody;
  const email =
    (isString(t.email) ? t.email : null) ??
    (isString(legacy) ? legacy : null);
  return {
    sms: isString(t.sms) ? t.sms : fallback.sms,
    emailSubject: isString(t.emailSubject) ? t.emailSubject : fallback.emailSubject,
    email: email ?? fallback.email,
  };
}

/** Returns true when the two template records are deeply equal. */
function templatesEqual(
  a: Record<Tone, LocalizedTemplates>,
  b: Record<Tone, LocalizedTemplates>,
): boolean {
  for (const tone of ["Friendly", "Neutral", "Firm"] as Tone[]) {
    for (const lang of ["en", "bn"] as MessageLanguage[]) {
      const x = a[tone][lang];
      const y = b[tone][lang];
      if (
        x.sms !== y.sms ||
        x.emailSubject !== y.emailSubject ||
        x.email !== y.email
      ) {
        return false;
      }
    }
  }
  return true;
}

function channelsEqual(a: ChannelDefaults, b: ChannelDefaults): boolean {
  return (
    a.sms === b.sms &&
    a.email === b.email &&
    a.threeDaysBefore === b.threeDaysBefore &&
    a.onDueDate === b.onDueDate &&
    a.everyTwoDaysAfterOverdue === b.everyTwoDaysAfterOverdue
  );
}

/** True when the input looks like a v2 record (has per-language
 *  layers for the templates). */
function looksLikeV2Templates(input: unknown): boolean {
  if (!input || typeof input !== "object") return false;
  const obj = input as Record<string, unknown>;
  // The simplest signal: at least one of `en` / `bn` is present.
  return "en" in obj || "bn" in obj;
}

/**
 * Normalize any historical shape of reminder settings into the current
 * v2 record. Always returns a complete, ready-to-render object — never
 * `null`. Falls back to `SEED` for any unrecognized or corrupt data.
 *
 * Recognized shapes:
 *  - v2 (current): { __v: 2, tone, messageLanguage, templates: { tone: { en, bn } }, channels }
 *  - v1 / v0:      { tone, templates: { tone: { sms, emailSubject, email | emailBody } }, channels }
 *  - empty/partial: anything else
 */
export function normalizeSettings(raw: unknown): ReminderSettings {
  if (!raw || typeof raw !== "object") return cloneSeed();

  const r = raw as Partial<ReminderSettings> & Record<string, unknown>;

  // Active tone — fall back to "Friendly" so the first tone the user
  // sees isn't blank.
  const tone: Tone = isTone(r.tone) ? r.tone : "Friendly";

  // Message language — pre-Bangla records are always "en".
  const messageLanguage: MessageLanguage = isMessageLanguage(r.messageLanguage)
    ? r.messageLanguage
    : "en";

  // Templates — handle the v2 (per-language) shape and the v1/v0
  // (flat ToneTemplates) shape.
  const raw_templates = (r.templates ?? {}) as Partial<Record<Tone, unknown>>;
  const templates: Record<Tone, LocalizedTemplates> = {
    Friendly: { en: TONE_EN.Friendly, bn: TONE_BN.Friendly },
    Neutral: { en: TONE_EN.Neutral, bn: TONE_BN.Neutral },
    Firm: { en: TONE_EN.Firm, bn: TONE_BN.Firm },
  };
  for (const toneKey of ["Friendly", "Neutral", "Firm"] as Tone[]) {
    const tt = raw_templates[toneKey];
    if (!tt || typeof tt !== "object") continue;

    if (looksLikeV2Templates(tt)) {
      const obj = tt as Partial<Record<MessageLanguage, unknown>>;
      templates[toneKey] = {
        en: normalizeToneTemplates(obj.en, TONE_EN[toneKey]),
        bn: normalizeToneTemplates(obj.bn, TONE_BN[toneKey]),
      };
    } else {
      // v1 / v0 flat shape — promote into `.en`, fill `.bn` from seed.
      const flat = normalizeToneTemplates(tt, TONE_EN[toneKey]);
      templates[toneKey] = {
        en: flat,
        bn: { ...TONE_BN[toneKey] },
      };
    }
  }

  // Channels — every field defaults to true so legacy "everyone opted
  // in by default" records stay equivalent.
  const c = (r.channels ?? {}) as Partial<Record<keyof ChannelDefaults, unknown>>;
  const channels: ChannelDefaults = {
    sms: isBoolean(c.sms) ? c.sms : true,
    email: isBoolean(c.email) ? c.email : true,
    threeDaysBefore: isBoolean(c.threeDaysBefore) ? c.threeDaysBefore : true,
    onDueDate: isBoolean(c.onDueDate) ? c.onDueDate : true,
    everyTwoDaysAfterOverdue: isBoolean(c.everyTwoDaysAfterOverdue)
      ? c.everyTwoDaysAfterOverdue
      : true,
  };

  return {
    __v: STORAGE_VERSION,
    tone,
    templates,
    channels,
    messageLanguage,
  };
}

function cloneSeed(): ReminderSettings {
  return {
    __v: STORAGE_VERSION,
    tone: SEED.tone,
    messageLanguage: SEED.messageLanguage,
    templates: {
      Friendly: { en: { ...TONE_EN.Friendly }, bn: { ...TONE_BN.Friendly } },
      Neutral: { en: { ...TONE_EN.Neutral }, bn: { ...TONE_BN.Neutral } },
      Firm: { en: { ...TONE_EN.Firm }, bn: { ...TONE_BN.Firm } },
    },
    channels: { ...SEED.channels },
  };
}

/* ---- Read / write -------------------------------------------------- */

function readAll(): ReminderSettings {
  if (!hasWindow()) return cloneSeed();
  const normalized = readAndNormalize<ReminderSettings>(
    STORAGE_KEY,
    (raw) => normalizeSettings(raw),
    (a, b) => {
      // `a` is the parsed JSON, `b` is the normalized record. They're
      // equal only when the data was already in v2 form.
      if (!b) return false;
      if (a === b) return true;
      // Compare a minimal fingerprint so we don't write back when
      // nothing needed to change.
      const aObj = a as Partial<ReminderSettings>;
      if (aObj.__v !== b.__v) return false;
      if (aObj.tone !== b.tone) return false;
      if (aObj.messageLanguage !== b.messageLanguage) return false;
      const aT = aObj.templates as Record<Tone, LocalizedTemplates> | undefined;
      if (!aT) return false;
      if (!templatesEqual(aT, b.templates)) return false;
      if (!aObj.channels || !channelsEqual(aObj.channels, b.channels)) return false;
      return true;
    },
  );
  return normalized ?? cloneSeed();
}

function writeAll(settings: ReminderSettings): void {
  if (!hasWindow()) return;
  // Always stamp the version on write so the next read is a no-op.
  const stamped: ReminderSettings = { ...settings, __v: STORAGE_VERSION };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
  } catch {
    // ignore — storage may be unavailable in private mode
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/* ---- Public API ----------------------------------------------------- */

/** Returns the current reminder settings (SSR-safe). */
export async function getReminderSettings(): Promise<ReminderSettings> {
  if (API_ENABLED) {
    try {
      return await apiGet<ReminderSettings>("/settings");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return cloneSeed();
      throw err;
    }
  }
  return readAll();
}

/** Persists the full settings object. */
export async function saveReminderSettings(
  settings: ReminderSettings,
): Promise<ReminderSettings> {
  // Defensive — re-normalize whatever the caller hands in so partial
  // or malformed saves never land in storage.
  const safe = normalizeSettings(settings);
  if (API_ENABLED) return apiPut<ReminderSettings>("/settings", safe);
  writeAll(safe);
  return safe;
}

/** Updates only the active tone. */
export async function setTone(tone: Tone): Promise<ReminderSettings> {
  if (API_ENABLED) return apiPatch<ReminderSettings>("/settings/tone", { tone });
  const next: ReminderSettings = { ...readAll(), tone, __v: STORAGE_VERSION };
  writeAll(next);
  return next;
}

/** Updates a single template for the given tone and language. */
export async function updateTemplate(
  tone: Tone,
  lang: MessageLanguage,
  patch: Partial<ToneTemplates>,
): Promise<ReminderSettings> {
  if (API_ENABLED) {
    return apiPatch<ReminderSettings>(
      `/settings/templates/${encodeURIComponent(tone)}/${encodeURIComponent(lang)}`,
      patch,
    );
  }
  const current = readAll();
  const next: ReminderSettings = {
    ...current,
    __v: STORAGE_VERSION,
    templates: {
      ...current.templates,
      [tone]: {
        ...current.templates[tone],
        [lang]: { ...current.templates[tone][lang], ...patch },
      },
    },
  };
  writeAll(next);
  return next;
}

/** Updates the default channel / timing preferences. */
export async function updateChannels(
  patch: Partial<ChannelDefaults>,
): Promise<ReminderSettings> {
  if (API_ENABLED) {
    return apiPatch<ReminderSettings>("/settings/channels", patch);
  }
  const current = readAll();
  const next: ReminderSettings = {
    ...current,
    __v: STORAGE_VERSION,
    channels: { ...current.channels, ...patch },
  };
  writeAll(next);
  return next;
}

/** Updates the default message language. Per-loan overrides live on the
 *  loan itself and are not affected. */
export async function updateMessageLanguage(
  lang: MessageLanguage,
): Promise<ReminderSettings> {
  if (API_ENABLED) {
    return apiPatch<ReminderSettings>("/settings/message-language", {
      messageLanguage: lang,
    });
  }
  const next: ReminderSettings = {
    ...readAll(),
    messageLanguage: lang,
    __v: STORAGE_VERSION,
  };
  writeAll(next);
  return next;
}

/* ---- Reminder history ---------------------------------------------- */

export interface ReminderHistoryItem {
  id: string;
  loanId: string;
  channel: ReminderChannel;
  sentAt: string;
  tone: Tone;
  status: "Delivered" | "Failed";
}

/** Synthetic history for one loan. For every channel the loan
 *  consented to, a single "Delivered" row dated to the loan's due
 *  date is emitted. The history page groups and sorts these. */
export function buildLoanHistory(loan: Loan): ReminderHistoryItem[] {
  const out: ReminderHistoryItem[] = [];
  if (loan.reminders.sms) {
    out.push({
      id: `${loan.id}-r-sms`,
      loanId: loan.id,
      channel: "SMS",
      sentAt: `${loan.dueDate}T10:00:00.000Z`,
      tone: loan.tone,
      status: "Delivered",
    });
  }
  if (loan.reminders.email) {
    out.push({
      id: `${loan.id}-r-email`,
      loanId: loan.id,
      channel: "Email",
      sentAt: `${loan.dueDate}T10:00:00.000Z`,
      tone: loan.tone,
      status: "Delivered",
    });
  }
  return out;
}

/** Returns the history for one loan. */
export async function getLoanReminderHistory(
  loanId: string,
): Promise<ReminderHistoryItem[]> {
  if (API_ENABLED) {
    return apiGet<ReminderHistoryItem[]>(
      `/loans/${encodeURIComponent(loanId)}/reminders`,
    );
  }
  const loans = await getLoans();
  const loan = loans.find((l) => l.id === loanId);
  if (!loan) return [];
  return buildLoanHistory(loan);
}

/** Aggregated reminder history across every loan, sorted by date desc. */
export async function getReminderHistory(): Promise<ReminderHistoryItem[]> {
  if (API_ENABLED) {
    return apiGet<ReminderHistoryItem[]>("/reminders");
  }
  const loans = await getLoans();
  const out: ReminderHistoryItem[] = [];
  for (const loan of loans) out.push(...buildLoanHistory(loan));
  out.sort((a, b) => (a.sentAt > b.sentAt ? -1 : a.sentAt < b.sentAt ? 1 : 0));
  return out;
}

// Re-export `safeJsonParse` so tests can verify a payload is well-formed
// before passing it to a service.
export { safeJsonParse };
