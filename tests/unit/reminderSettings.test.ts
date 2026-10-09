import { describe, it, expect } from "vitest";
import {
  unknownPlaceholders,
  validateTemplates,
  mergePatch,
  timingsFromChannels,
  timingsToDb,
  templatesFromDb,
  templatesToDb,
  ensureRecord,
  DEFAULT_SETTINGS,
  ALLOWED_PLACEHOLDERS,
} from "@/lib/reminderSettings";

describe("reminderSettings — placeholders", () => {
  it("returns no unknown placeholders for a clean template", () => {
    const t = "Hi {friend_name}, the {amount} is due on {due_date}. — {my_name}";
    expect(unknownPlaceholders(t)).toEqual([]);
  });

  it("flags a single unknown placeholder", () => {
    expect(unknownPlaceholders("Hi {friend_name}, your {secret} is safe.")).toEqual([
      "{secret}",
    ]);
  });

  it("flags multiple unknown placeholders", () => {
    const issues = unknownPlaceholders("{a} {b} {c}");
    expect(issues.sort()).toEqual(["{a}", "{b}", "{c}"].sort());
  });

  it("recognises the full set of allowed placeholders", () => {
    const t = ALLOWED_PLACEHOLDERS.join(" ");
    expect(unknownPlaceholders(t)).toEqual([]);
  });
});

describe("reminderSettings — validateTemplates", () => {
  it("passes the default templates", () => {
    expect(validateTemplates(DEFAULT_SETTINGS.templates)).toEqual([]);
  });

  it("flags a too-long SMS", () => {
    const long = "x".repeat(601);
    const t = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.templates));
    t.Friendly.en.sms = long;
    const issues = validateTemplates(t);
    expect(issues.find((i) => i.field === "templates.Friendly.en.sms" && i.message === "template_too_long")).toBeDefined();
  });

  it("flags an unknown placeholder per-cell", () => {
    const t = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.templates));
    t.Neutral.bn.emailSubject = "Hi {evil_placeholder}";
    const issues = validateTemplates(t);
    const issue = issues.find((i) => i.field === "templates.Neutral.bn.emailSubject");
    expect(issue).toBeDefined();
    expect(issue?.message.startsWith("unknown_placeholder:")).toBe(true);
  });
});

describe("reminderSettings — mergePatch", () => {
  it("returns the current record when the patch is empty", () => {
    const next = mergePatch(DEFAULT_SETTINGS, {});
    expect(next).toEqual(DEFAULT_SETTINGS);
  });

  it("updates the tone", () => {
    const next = mergePatch(DEFAULT_SETTINGS, { defaultTone: "Firm" });
    expect(next.tone).toBe("Firm");
    expect(next.templates).toEqual(DEFAULT_SETTINGS.templates);
  });

  it("merges a single template cell", () => {
    const next = mergePatch(DEFAULT_SETTINGS, {
      templates: { Friendly: { en: { sms: "short new sms" } } },
    });
    expect(next.templates.Friendly.en.sms).toBe("short new sms");
    // Untouched cells keep the original text.
    expect(next.templates.Friendly.en.emailBody).toBe(
      DEFAULT_SETTINGS.templates.Friendly.en.emailBody,
    );
    expect(next.templates.Neutral.en.sms).toBe(
      DEFAULT_SETTINGS.templates.Neutral.en.sms,
    );
  });

  it("translates channel booleans to the timings list", () => {
    const next = mergePatch(DEFAULT_SETTINGS, {
      defaultTimings: ["on_due_date"],
    });
    expect(next.channels.onDueDate).toBe(true);
    expect(next.channels.threeDaysBefore).toBe(false);
    expect(next.channels.everyTwoDaysAfterOverdue).toBe(false);
  });
});

describe("reminderSettings — timings round-trip", () => {
  it("timingsToDb + timingsFromDb is a no-op", () => {
    const list = ["3_days_before", "on_due_date"] as const;
    const db = timingsToDb([...list]);
    const back = timingsFromChannels({
      sms: true,
      email: true,
      threeDaysBefore: db.threeDaysBefore,
      onDueDate: db.onDueDate,
      everyTwoDaysAfterOverdue: db.everyTwoDaysAfterOverdue,
    });
    expect(back.sort()).toEqual([...list].sort());
  });
});

describe("reminderSettings — templates round-trip", () => {
  it("templatesToDb + templatesFromDb is a no-op", () => {
    const t = DEFAULT_SETTINGS.templates;
    const db = templatesToDb(t);
    const back = templatesFromDb(db);
    expect(back).toEqual(t);
  });

  it("templatesFromDb tolerates a missing row", () => {
    const back = templatesFromDb(null);
    expect(back.Friendly.en.sms).toBe(DEFAULT_SETTINGS.templates.Friendly.en.sms);
  });
});

describe("reminderSettings — ensureRecord", () => {
  it("returns the default record when the row is null", () => {
    const rec = ensureRecord(null);
    expect(rec).toEqual(DEFAULT_SETTINGS);
  });

  it("merges a partial row from the DB", () => {
    const rec = ensureRecord({
      defaultTone: "Firm",
      defaultTimings: { threeDaysBefore: true, onDueDate: false, everyTwoDaysAfterOverdue: true },
      smsEnabled: false,
      emailEnabled: true,
      messageLanguage: "bn",
      templates: {},
    });
    expect(rec.tone).toBe("Firm");
    expect(rec.messageLanguage).toBe("bn");
    expect(rec.channels.sms).toBe(false);
    expect(rec.channels.threeDaysBefore).toBe(true);
    // Defaults still populated.
    expect(rec.templates.Friendly.en.sms).toBe(
      DEFAULT_SETTINGS.templates.Friendly.en.sms,
    );
  });
});
