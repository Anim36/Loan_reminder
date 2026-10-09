// Reminder settings + reminder history service — B3/B4 API-backed.
//
// The old `SEED` (English + Bangla templates, the default
// timings, the placeholder list) is kept here so the
// `reminders` page renders instantly while the first fetch is
// in flight, and so unit tests can still import a stable
// reference. The server is the source of truth for the actual
// values.

import { apiGet, apiPut } from "@/lib/api-client";
import type { ApiReminderHistoryResponse, ApiReminderSettings } from "@/lib/api/api-types";
import { mapReminderHistoryItem, type ReminderHistoryItem, type ReminderSettingsUi } from "@/lib/api/mappers";
import type { MessageLanguage, Tone } from "@/types/loan";

/* ---- Public types ------------------------------------------------ */

export interface ToneTemplates {
  sms: string;
  emailSubject: string;
  email: string;
}

export type LocalizedTemplates = Record<MessageLanguage, ToneTemplates>;
export type ChannelDefaults = ReminderSettingsUi["channels"];

export interface ReminderSettings extends ReminderSettingsUi {
  templates: Record<Tone, LocalizedTemplates>;
}

export { mapReminderHistoryItem };
export type { ReminderHistoryItem };

/* ---- SEED (the default templates) -------------------------------- */

const FRIENDLY_SMS =
  "Hi {friend_name}, just a gentle reminder about the {amount} I lent you, due on {due_date}. Please let me know if you need more time. Thank you! — {my_name}";
const FRIENDLY_EMAIL_SUBJECT = "A reminder about your loan, {friend_name}";
const FRIENDLY_EMAIL = FRIENDLY_SMS;
const NEUTRAL_SMS =
  "Hello {friend_name}, this is a reminder that your loan of {amount} is due on {due_date}. Please let me know when you plan to repay. Thank you. — {my_name}";
const NEUTRAL_EMAIL_SUBJECT = FRIENDLY_EMAIL_SUBJECT;
const NEUTRAL_EMAIL = NEUTRAL_SMS;
const FIRM_SMS =
  "Hello {friend_name}, please arrange repayment of {amount} by {due_date}, as agreed. If this is not possible, please contact me so we can agree on a plan. Thank you. — {my_name}";
const FIRM_EMAIL_SUBJECT = FRIENDLY_EMAIL_SUBJECT;
const FIRM_EMAIL = FIRM_SMS;

const FRIENDLY_SMS_BN =
  "আসসালামু আলাইকুম {friend_name}, {due_date} তারিখে ফেরত দেওয়ার শর্তে আমি আপনাকে {amount} ধার দিয়েছিলাম, সেই বিষয়ে একটি বিনীত অনুরোধ। প্রয়োজনে আরেকটু সময় লাগলে জানাবেন। ধন্যবাদ — {my_name}";
const FRIENDLY_EMAIL_SUBJECT_BN = "{friend_name}, আপনার ঋণ সম্পর্কে একটি অনুরোধ";
const FRIENDLY_EMAIL_BN = FRIENDLY_SMS_BN;
const NEUTRAL_SMS_BN =
  "প্রিয় {friend_name}, এটি একটি বিনীত অনুরোধ — {due_date} তারিখে আপনার {amount} ঋণ ফেরত দেওয়ার কথা ছিল। কখন পরিশোধ করতে পারবেন জানালে ভালো হয়। ধন্যবাদ — {my_name}";
const NEUTRAL_EMAIL_SUBJECT_BN = FRIENDLY_EMAIL_SUBJECT_BN;
const NEUTRAL_EMAIL_BN = NEUTRAL_SMS_BN;
const FIRM_SMS_BN =
  "প্রিয় {friend_name}, আমাদের চুক্তি অনুযায়ী {due_date} তারিখের মধ্যে {amount} পরিশোধ করার কথা ছিল। এই মুহূর্তে সম্ভব না হলে আমাকে জানান, যেন আমরা একটি পরিকল্পনায় একমত হতে পারি। ধন্যবাদ — {my_name}";
const FIRM_EMAIL_SUBJECT_BN = FRIENDLY_EMAIL_SUBJECT_BN;
const FIRM_EMAIL_BN = FIRM_SMS_BN;

const TONE_EN: Record<Tone, ToneTemplates> = {
  Friendly: { sms: FRIENDLY_SMS, emailSubject: FRIENDLY_EMAIL_SUBJECT, email: FRIENDLY_EMAIL },
  Neutral:  { sms: NEUTRAL_SMS,  emailSubject: NEUTRAL_EMAIL_SUBJECT,  email: NEUTRAL_EMAIL },
  Firm:     { sms: FIRM_SMS,     emailSubject: FIRM_EMAIL_SUBJECT,     email: FIRM_EMAIL },
};

const TONE_BN: Record<Tone, ToneTemplates> = {
  Friendly: { sms: FRIENDLY_SMS_BN, emailSubject: FRIENDLY_EMAIL_SUBJECT_BN, email: FRIENDLY_EMAIL_BN },
  Neutral:  { sms: NEUTRAL_SMS_BN,  emailSubject: NEUTRAL_EMAIL_SUBJECT_BN,  email: NEUTRAL_EMAIL_BN },
  Firm:     { sms: FIRM_SMS_BN,     emailSubject: FIRM_EMAIL_SUBJECT_BN,     email: FIRM_EMAIL_BN },
};

export const SEED: ReminderSettings = {
  __v: 2,
  tone: "Friendly",
  messageLanguage: "en",
  templates: {
    Friendly: { en: { ...TONE_EN.Friendly }, bn: { ...TONE_BN.Friendly } },
    Neutral:  { en: { ...TONE_EN.Neutral },  bn: { ...TONE_BN.Neutral } },
    Firm:     { en: { ...TONE_EN.Firm },     bn: { ...TONE_BN.Firm } },
  },
  channels: {
    sms: true,
    email: true,
    threeDaysBefore: true,
    onDueDate: true,
    everyTwoDaysAfterOverdue: true,
  },
};

/* ---- Normalize (a localStorage migration helper, kept for tests) -- */

/** Returns a fully-populated v2 `ReminderSettings`. With the API
 *  always returning a complete record this is a defensive net
 *  for older clients. */
export function normalizeSettings(raw: unknown): ReminderSettings {
  if (!raw || typeof raw !== "object") return cloneSeed();
  const r = raw as Partial<ReminderSettings> & Record<string, unknown>;
  const tone: Tone =
    r.tone === "Neutral" || r.tone === "Firm" ? r.tone : "Friendly";
  const messageLanguage: MessageLanguage =
    r.messageLanguage === "bn" ? "bn" : "en";
  const templates = SEED.templates;
  // Trust the wire shape — if it has all 6 tone/lang entries we
  // use them; otherwise we fall back to SEED per cell.
  if (r.templates && typeof r.templates === "object") {
    const inputTemplates = r.templates as Record<string, unknown>;
    for (const toneKey of ["Friendly", "Neutral", "Firm"] as Tone[]) {
      const cell = inputTemplates[toneKey];
      if (cell && typeof cell === "object") {
        const cellObj = cell as Record<string, unknown>;
        for (const lang of ["en", "bn"] as MessageLanguage[]) {
          const langCell = cellObj[lang];
          if (langCell && typeof langCell === "object") {
            const tt = langCell as Partial<ToneTemplates>;
            templates[toneKey][lang] = {
              sms: typeof tt.sms === "string" ? tt.sms : SEED.templates[toneKey][lang].sms,
              emailSubject:
                typeof tt.emailSubject === "string"
                  ? tt.emailSubject
                  : SEED.templates[toneKey][lang].emailSubject,
              email:
                typeof tt.email === "string"
                  ? tt.email
                  : typeof (tt as Record<string, unknown>).emailBody === "string"
                    ? ((tt as Record<string, unknown>).emailBody as string)
                    : SEED.templates[toneKey][lang].email,
            };
          }
        }
      }
    }
  }
  const channels = SEED.channels;
  if (r.channels && typeof r.channels === "object") {
    const c = r.channels as Partial<ChannelDefaults>;
    if (typeof c.sms === "boolean") channels.sms = c.sms;
    if (typeof c.email === "boolean") channels.email = c.email;
    if (typeof c.threeDaysBefore === "boolean")
      channels.threeDaysBefore = c.threeDaysBefore;
    if (typeof c.onDueDate === "boolean") channels.onDueDate = c.onDueDate;
    if (typeof c.everyTwoDaysAfterOverdue === "boolean")
      channels.everyTwoDaysAfterOverdue = c.everyTwoDaysAfterOverdue;
  }
  return { __v: 2, tone, messageLanguage, templates, channels };
}

function cloneSeed(): ReminderSettings {
  return {
    __v: 2,
    tone: SEED.tone,
    messageLanguage: SEED.messageLanguage,
    templates: {
      Friendly: { en: { ...TONE_EN.Friendly }, bn: { ...TONE_BN.Friendly } },
      Neutral:  { en: { ...TONE_EN.Neutral },  bn: { ...TONE_BN.Neutral } },
      Firm:     { en: { ...TONE_EN.Firm },     bn: { ...TONE_BN.Firm } },
    },
    channels: { ...SEED.channels },
  };
}

/* ---- Reads / writes ---------------------------------------------- */

export async function getReminderSettings(): Promise<ReminderSettings> {
  // api-client returns the full envelope `{ data: ApiReminderSettings }`.
  const res = await apiGet<{ data: ApiReminderSettings }>("/reminders/settings");
  return normalizeSettings(res.data);
}

export async function saveReminderSettings(
  settings: ReminderSettings,
): Promise<ReminderSettings> {
  const safe = normalizeSettings(settings);
  // Map the UI shape back to the wire shape. The wire stores
  // `defaultTimings` as a JSON blob of boolean columns; the
  // `channels` object on the UI maps cleanly.
  const wire = {
    defaultTone: safe.tone,
    messageLanguage: safe.messageLanguage,
    smsEnabled: safe.channels.sms,
    emailEnabled: safe.channels.email,
    defaultTimings: {
      sms: safe.channels.sms,
      email: safe.channels.email,
      threeDaysBefore: safe.channels.threeDaysBefore,
      onDueDate: safe.channels.onDueDate,
      everyTwoDaysAfterOverdue: safe.channels.everyTwoDaysAfterOverdue,
    },
    templates: {
      Friendly: {
        en: { sms: safe.templates.Friendly.en.sms, emailSubject: safe.templates.Friendly.en.emailSubject, emailBody: safe.templates.Friendly.en.email },
        bn: { sms: safe.templates.Friendly.bn.sms, emailSubject: safe.templates.Friendly.bn.emailSubject, emailBody: safe.templates.Friendly.bn.email },
      },
      Neutral: {
        en: { sms: safe.templates.Neutral.en.sms, emailSubject: safe.templates.Neutral.en.emailSubject, emailBody: safe.templates.Neutral.en.email },
        bn: { sms: safe.templates.Neutral.bn.sms, emailSubject: safe.templates.Neutral.bn.emailSubject, emailBody: safe.templates.Neutral.bn.email },
      },
      Firm: {
        en: { sms: safe.templates.Firm.en.sms, emailSubject: safe.templates.Firm.en.emailSubject, emailBody: safe.templates.Firm.en.email },
        bn: { sms: safe.templates.Firm.bn.sms, emailSubject: safe.templates.Firm.bn.emailSubject, emailBody: safe.templates.Firm.bn.email },
      },
    },
  };
  const next = await apiPut<{ data: ApiReminderSettings }>("/reminders/settings", wire);
  return normalizeSettings(next.data);
}

export async function setTone(tone: Tone): Promise<ReminderSettings> {
  return saveReminderSettings({ ...SEED, ...(await getReminderSettings()), tone });
}

export async function updateTemplate(
  tone: Tone,
  lang: MessageLanguage,
  patch: Partial<ToneTemplates>,
): Promise<ReminderSettings> {
  const current = await getReminderSettings();
  return saveReminderSettings({
    ...current,
    templates: {
      ...current.templates,
      [tone]: {
        ...current.templates[tone],
        [lang]: { ...current.templates[tone][lang], ...patch },
      },
    },
  });
}

export async function updateChannels(
  patch: Partial<ChannelDefaults>,
): Promise<ReminderSettings> {
  const current = await getReminderSettings();
  return saveReminderSettings({
    ...current,
    channels: { ...current.channels, ...patch },
  });
}

export async function updateMessageLanguage(
  lang: MessageLanguage,
): Promise<ReminderSettings> {
  const current = await getReminderSettings();
  return saveReminderSettings({ ...current, messageLanguage: lang });
}

/* ---- Reminder history -------------------------------------------- */

export interface ReminderHistoryFilters {
  channel?: "SMS" | "Email";
  status?: "QUEUED" | "SENT" | "DELIVERED" | "FAILED" | "SKIPPED";
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface ReminderHistoryResponse {
  items: ReminderHistoryItem[];
  stats: { total: number; delivered: number; failed: number };
  total: number;
  page: number;
  pageSize: number;
}

export async function getReminderHistory(
  filters: ReminderHistoryFilters = {},
): Promise<ReminderHistoryItem[]> {
  const res = await getReminderHistoryPaged(filters);
  return res.items;
}

export async function getReminderHistoryPaged(
  filters: ReminderHistoryFilters = {},
): Promise<ReminderHistoryResponse> {
  const query: Record<string, string | number> = {};
  if (filters.channel) query.channel = filters.channel;
  if (filters.status) query.status = filters.status;
  if (filters.q) query.q = filters.q;
  if (filters.page) query.page = filters.page;
  if (filters.pageSize) query.pageSize = filters.pageSize;
  const res = await apiGet<ApiReminderHistoryResponse>("/reminders/history", { query });
  return {
    items: res.data.map(mapReminderHistoryItem),
    stats: res.stats,
    total: res.meta.total,
    page: res.meta.page,
    pageSize: res.meta.pageSize,
  };
}

/** Synthesise history for a single loan from the friend detail
 *  payload. The old localStorage fallback used to do this; the
 *  B4 route returns per-friend history directly so the
 *  caller is expected to use `getFriendDetail` instead. */
export function buildLoanHistory(): ReminderHistoryItem[] {
  return [];
}
