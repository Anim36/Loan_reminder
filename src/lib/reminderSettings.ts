// Reminder settings — defaults, normalisation, validation.
//
// Two responsibilities:
//
//   1. **Defaults.** A fully-populated `ReminderSettings` record
//      with the SMS / email templates seeded by the original
//      localStorage `reminderService.ts`. The API returns this
//      shape on `GET /api/reminders/settings` and merges
//      partially-supplied PUT bodies against the same record.
//
//   2. **Validation.** The PUT endpoint rejects:
//        * templates that contain unknown placeholders
//        * templates that exceed the channel's max length
//      Validation runs per-field, so a single bad template
//      doesn't reject the whole payload.
//
// The shape here is the same as the localStorage `SEED` in
// `src/services/reminderService.ts`. When B5 wires the
// frontend, that file can be deleted; the API is now the
// single source of truth.

import type { MessageLanguage, Tone } from "@/types/loan";

export type ChannelDefaults = {
  sms: boolean;
  email: boolean;
  threeDaysBefore: boolean;
  onDueDate: boolean;
  everyTwoDaysAfterOverdue: boolean;
};

export type ToneTemplates = {
  sms: string;
  emailSubject: string;
  emailBody: string;
};

export type LocalizedTemplates = Record<MessageLanguage, ToneTemplates>;
export type Templates = Record<Tone, LocalizedTemplates>;

export interface ReminderSettings {
  /** Schema version — bump on every shape change. */
  __v: 2;
  tone: Tone;
  templates: Templates;
  channels: ChannelDefaults;
  messageLanguage: MessageLanguage;
}

export const MAX_SMS_LENGTH = 600;
export const MAX_EMAIL_SUBJECT_LENGTH = 150;
export const MAX_EMAIL_BODY_LENGTH = 5_000;

/** The set of allowed placeholders. Anything else is rejected
 *  with a field error. */
export const ALLOWED_PLACEHOLDERS = [
  "{friend_name}",
  "{amount}",
  "{due_date}",
  "{my_name}",
] as const;
export type Placeholder = (typeof ALLOWED_PLACEHOLDERS)[number];

/** Regex for a placeholder. Used to find every placeholder
 *  occurrence in a template so we can check the set. */
const PLACEHOLDER_RE = /\{[a-z_]+\}/g;

/** Returns the list of placeholders in `template` that are not
 *  in `ALLOWED_PLACEHOLDERS`. Empty when the template is
 *  clean. */
export function unknownPlaceholders(template: string): string[] {
  const found = template.match(PLACEHOLDER_RE) ?? [];
  return found.filter((p) => !(ALLOWED_PLACEHOLDERS as readonly string[]).includes(p));
}

/* ---- Default templates ------------------------------------------- */

const FRIENDLY_SMS =
  "Hi {friend_name}, just a gentle reminder about the {amount} I lent you, due on {due_date}. Please let me know if you need more time. Thank you! — {my_name}";
const FRIENDLY_EMAIL_SUBJECT = "A reminder about your loan, {friend_name}";
const FRIENDLY_EMAIL_BODY = FRIENDLY_SMS;

const NEUTRAL_SMS =
  "Hello {friend_name}, this is a reminder that your loan of {amount} is due on {due_date}. Please let me know when you plan to repay. Thank you. — {my_name}";
const NEUTRAL_EMAIL_SUBJECT = FRIENDLY_EMAIL_SUBJECT;
const NEUTRAL_EMAIL_BODY = NEUTRAL_SMS;

const FIRM_SMS =
  "Hello {friend_name}, please arrange repayment of {amount} by {due_date}, as agreed. If this is not possible, please contact me so we can agree on a plan. Thank you. — {my_name}";
const FIRM_EMAIL_SUBJECT = FRIENDLY_EMAIL_SUBJECT;
const FIRM_EMAIL_BODY = FIRM_SMS;

/* Bangla translations. */

const FRIENDLY_SMS_BN =
  "আসসালামু আলাইকুম {friend_name}, {due_date} তারিখে ফেরত দেওয়ার শর্তে আমি আপনাকে {amount} ধার দিয়েছিলাম, সেই বিষয়ে একটি বিনীত অনুরোধ। প্রয়োজনে আরেকটু সময় লাগলে জানাবেন। ধন্যবাদ — {my_name}";
const FRIENDLY_EMAIL_SUBJECT_BN = "{friend_name}, আপনার ঋণ সম্পর্কে একটি অনুরোধ";
const FRIENDLY_EMAIL_BODY_BN = FRIENDLY_SMS_BN;

const NEUTRAL_SMS_BN =
  "প্রিয় {friend_name}, এটি একটি বিনীত অনুরোধ — {due_date} তারিখে আপনার {amount} ঋণ ফেরত দেওয়ার কথা ছিল। কখন পরিশোধ করতে পারবেন জানালে ভালো হয়। ধন্যবাদ — {my_name}";
const NEUTRAL_EMAIL_SUBJECT_BN = FRIENDLY_EMAIL_SUBJECT_BN;
const NEUTRAL_EMAIL_BODY_BN = NEUTRAL_SMS_BN;

const FIRM_SMS_BN =
  "প্রিয় {friend_name}, আমাদের চুক্তি অনুযায়ী {due_date} তারিখের মধ্যে {amount} পরিশোধ করার কথা ছিল। এই মুহূর্তে সম্ভব না হলে আমাকে জানান, যেন আমরা একটি পরিকল্পনায় একমত হতে পারি। ধন্যবাদ — {my_name}";
const FIRM_EMAIL_SUBJECT_BN = FRIENDLY_EMAIL_SUBJECT_BN;
const FIRM_EMAIL_BODY_BN = FIRM_SMS_BN;

const TONE_EN: Record<Tone, ToneTemplates> = {
  Friendly: { sms: FRIENDLY_SMS, emailSubject: FRIENDLY_EMAIL_SUBJECT, emailBody: FRIENDLY_EMAIL_BODY },
  Neutral:  { sms: NEUTRAL_SMS,  emailSubject: NEUTRAL_EMAIL_SUBJECT,  emailBody: NEUTRAL_EMAIL_BODY },
  Firm:     { sms: FIRM_SMS,     emailSubject: FIRM_EMAIL_SUBJECT,     emailBody: FIRM_EMAIL_BODY },
};

const TONE_BN: Record<Tone, ToneTemplates> = {
  Friendly: { sms: FRIENDLY_SMS_BN, emailSubject: FRIENDLY_EMAIL_SUBJECT_BN, emailBody: FRIENDLY_EMAIL_BODY_BN },
  Neutral:  { sms: NEUTRAL_SMS_BN,  emailSubject: NEUTRAL_EMAIL_SUBJECT_BN,  emailBody: NEUTRAL_EMAIL_BODY_BN },
  Firm:     { sms: FIRM_SMS_BN,     emailSubject: FIRM_EMAIL_SUBJECT_BN,     emailBody: FIRM_EMAIL_BODY_BN },
};

/* ---- Default timings -------------------------------------------- */

export type ReminderTiming = "3_days_before" | "on_due_date" | "every_2_days_after";
export const REMINDER_TIMINGS: readonly ReminderTiming[] = [
  "3_days_before",
  "on_due_date",
  "every_2_days_after",
] as const;

/** Mapping from the wire enum (`3_days_before` / `on_due_date` /
 *  `every_2_days_after`) to the DB column key
 *  (`threeDaysBefore` / `onDueDate` / `everyTwoDaysAfterOverdue`).
 *  The `defaultTimings` JSON is stored in the latter form. */
export const TIMING_TO_COLUMN: Record<ReminderTiming, keyof ChannelDefaults> = {
  "3_days_before": "threeDaysBefore",
  "on_due_date": "onDueDate",
  "every_2_days_after": "everyTwoDaysAfterOverdue",
};
/** Partial inverse of `TIMING_TO_COLUMN`. The `sms` and `email`
 *  channel booleans are not timings, so they're omitted. */
export const COLUMN_TO_TIMING: Partial<Record<keyof ChannelDefaults, ReminderTiming>> = {
  threeDaysBefore: "3_days_before",
  onDueDate: "on_due_date",
  everyTwoDaysAfterOverdue: "every_2_days_after",
};

/* ---- Defaults ---------------------------------------------------- */

export const DEFAULT_SETTINGS: ReminderSettings = {
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

/* ---- Merge / normalise ------------------------------------------- */

/** Decode the `defaultTimings` JSON blob from the DB into the
 *  wire shape (a list of enabled timing enum values). */
export function timingsFromDb(raw: unknown): ReminderTiming[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  const out: ReminderTiming[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (!v) continue;
    const timing = (COLUMN_TO_TIMING as Record<string, ReminderTiming>)[k];
    if (timing) out.push(timing);
  }
  return out;
}

/** Encode the wire timing list into the DB JSON shape. */
export function timingsToDb(
  list: ReminderTiming[],
): Record<keyof ChannelDefaults, boolean> {
  const out: Record<string, boolean> = {
    sms: true,
    email: true,
    threeDaysBefore: false,
    onDueDate: false,
    everyTwoDaysAfterOverdue: false,
  };
  for (const t of list) {
    const col = TIMING_TO_COLUMN[t];
    out[col] = true;
  }
  return out as Record<keyof ChannelDefaults, boolean>;
}

/** Decode the `templates` JSON blob. Accepts the canonical
 *  `{ tone: { lang: { sms, emailSubject, emailBody } } }` shape
 *  and falls back to defaults for any missing key. */
export function templatesFromDb(raw: unknown): Templates {
  const out: Templates = {
    Friendly: { en: { ...TONE_EN.Friendly }, bn: { ...TONE_BN.Friendly } },
    Neutral:  { en: { ...TONE_EN.Neutral },  bn: { ...TONE_BN.Neutral } },
    Firm:     { en: { ...TONE_EN.Firm },     bn: { ...TONE_BN.Firm } },
  };
  if (!raw || typeof raw !== "object") return out;
  for (const tone of ["Friendly", "Neutral", "Firm"] as Tone[]) {
    const tt = (raw as Record<string, unknown>)[tone];
    if (!tt || typeof tt !== "object") continue;
    for (const lang of ["en", "bn"] as MessageLanguage[]) {
      const cell = (tt as Record<string, unknown>)[lang];
      if (!cell || typeof cell !== "object") continue;
      const c = cell as Partial<ToneTemplates>;
      out[tone][lang] = {
        sms: typeof c.sms === "string" ? c.sms : out[tone][lang].sms,
        emailSubject:
          typeof c.emailSubject === "string"
            ? c.emailSubject
            : out[tone][lang].emailSubject,
        emailBody:
          typeof c.emailBody === "string" ? c.emailBody : out[tone][lang].emailBody,
      };
    }
  }
  return out;
}

/** Encode templates for storage. */
export function templatesToDb(t: Templates): Record<string, unknown> {
  return {
    Friendly: {
      en: { ...t.Friendly.en },
      bn: { ...t.Friendly.bn },
    },
    Neutral: {
      en: { ...t.Neutral.en },
      bn: { ...t.Neutral.bn },
    },
    Firm: {
      en: { ...t.Firm.en },
      bn: { ...t.Firm.bn },
    },
  };
}

/** Decode a full `ReminderSettings` row from the DB into the
 *  wire shape, applying defaults for any missing key. */
export function fromDb(row: {
  defaultTone: string;
  defaultTimings: unknown;
  smsEnabled: boolean;
  emailEnabled: boolean;
  messageLanguage: string;
  templates: unknown;
}): ReminderSettings {
  const tone: Tone =
    row.defaultTone === "Neutral" || row.defaultTone === "Firm"
      ? row.defaultTone
      : "Friendly";
  const messageLanguage: MessageLanguage =
    row.messageLanguage === "bn" ? "bn" : "en";

  // `timingsFromDb` only returns *enabled* timing keys; we
  // merge with the channel booleans so the full `channels`
  // object is always populated.
  const enabledTimings = timingsFromDb(row.defaultTimings);
  const channels: ChannelDefaults = {
    sms: row.smsEnabled,
    email: row.emailEnabled,
    threeDaysBefore: enabledTimings.includes("3_days_before"),
    onDueDate: enabledTimings.includes("on_due_date"),
    everyTwoDaysAfterOverdue: enabledTimings.includes("every_2_days_after"),
  };

  return {
    __v: 2,
    tone,
    templates: templatesFromDb(row.templates),
    channels,
    messageLanguage,
  };
}

/** Build the final settings record the API returns on GET.
 *  `userName` is the sender's name; the API doesn't use it but
 *  the renderer does. The record always includes every field,
 *  even when the DB row is missing them. */
export function ensureRecord(
  row: Parameters<typeof fromDb>[0] | null,
): ReminderSettings {
  if (!row) {
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as ReminderSettings;
  }
  return fromDb(row);
}

/* ---- Field validation ------------------------------------------- */

export interface ValidationError {
  field: string;
  message: string;
}

/** Validate the templates section of an incoming patch. The
 *  list of issues is empty when every template is well-formed.
 *
 *  Rules:
 *    * No unknown placeholders (anything not in ALLOWED_PLACEHOLDERS)
 *    * `sms` ≤ MAX_SMS_LENGTH
 *    * `emailSubject` ≤ MAX_EMAIL_SUBJECT_LENGTH
 *    * `emailBody` ≤ MAX_EMAIL_BODY_LENGTH
 */
export function validateTemplates(
  templates: Templates,
): ValidationError[] {
  const issues: ValidationError[] = [];
  for (const tone of ["Friendly", "Neutral", "Firm"] as Tone[]) {
    for (const lang of ["en", "bn"] as MessageLanguage[]) {
      const cell = templates[tone][lang];
      const base = `templates.${tone}.${lang}`;
      const unknown = unknownPlaceholders(cell.sms);
      if (unknown.length > 0) {
        issues.push({
          field: `${base}.sms`,
          message: `unknown_placeholder:${unknown.join(",")}`,
        });
      }
      if (cell.sms.length > MAX_SMS_LENGTH) {
        issues.push({ field: `${base}.sms`, message: "template_too_long" });
      }
      const subjUnknown = unknownPlaceholders(cell.emailSubject);
      if (subjUnknown.length > 0) {
        issues.push({
          field: `${base}.emailSubject`,
          message: `unknown_placeholder:${subjUnknown.join(",")}`,
        });
      }
      if (cell.emailSubject.length > MAX_EMAIL_SUBJECT_LENGTH) {
        issues.push({ field: `${base}.emailSubject`, message: "template_too_long" });
      }
      const bodyUnknown = unknownPlaceholders(cell.emailBody);
      if (bodyUnknown.length > 0) {
        issues.push({
          field: `${base}.emailBody`,
          message: `unknown_placeholder:${bodyUnknown.join(",")}`,
        });
      }
      if (cell.emailBody.length > MAX_EMAIL_BODY_LENGTH) {
        issues.push({ field: `${base}.emailBody`, message: "template_too_long" });
      }
    }
  }
  return issues;
}

/** Deep-merge a partial `patch` over `current`. Used for the
 *  PUT handler so callers can update one template cell at a
 *  time. */
export function mergePatch(
  current: ReminderSettings,
  patch: Partial<{
    defaultTone: Tone;
    defaultTimings: ReminderTiming[];
    smsEnabled: boolean;
    emailEnabled: boolean;
    messageLanguage: MessageLanguage;
    templates: Partial<{
      [T in Tone]: Partial<{
        [L in MessageLanguage]: Partial<ToneTemplates>;
      }>;
    }>;
  }>,
): ReminderSettings {
  const out: ReminderSettings = JSON.parse(JSON.stringify(current));
  if (patch.defaultTone) out.tone = patch.defaultTone;
  if (patch.messageLanguage) out.messageLanguage = patch.messageLanguage;
  if (patch.smsEnabled !== undefined) out.channels.sms = patch.smsEnabled;
  if (patch.emailEnabled !== undefined) out.channels.email = patch.emailEnabled;
  if (patch.defaultTimings) {
    out.channels.threeDaysBefore = patch.defaultTimings.includes("3_days_before");
    out.channels.onDueDate = patch.defaultTimings.includes("on_due_date");
    out.channels.everyTwoDaysAfterOverdue = patch.defaultTimings.includes(
      "every_2_days_after",
    );
  }
  if (patch.templates) {
    for (const tone of ["Friendly", "Neutral", "Firm"] as Tone[]) {
      const tt = patch.templates[tone];
      if (!tt) continue;
      for (const lang of ["en", "bn"] as MessageLanguage[]) {
        const cell = tt[lang];
        if (!cell) continue;
        out.templates[tone][lang] = { ...out.templates[tone][lang], ...cell };
      }
    }
  }
  return out;
}

/** Apply the `channels` booleans back to a `defaultTimings`
 *  list. The list includes only the enabled timings. */
export function timingsFromChannels(
  channels: ChannelDefaults,
): ReminderTiming[] {
  const out: ReminderTiming[] = [];
  if (channels.threeDaysBefore) out.push("3_days_before");
  if (channels.onDueDate) out.push("on_due_date");
  if (channels.everyTwoDaysAfterOverdue) out.push("every_2_days_after");
  return out;
}
