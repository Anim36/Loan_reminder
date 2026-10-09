// /api/reminders/settings — get + put the user's reminder
// preferences.
//
// The `ReminderSettings` row is created lazily on first read
// (the Auth.js signup flow also creates one, but a row from
// the legacy JWT-only flow may not exist yet).
//
// The wire shape matches what the localStorage
// `reminderService.ts` used to return:
//   { __v, tone, templates, channels, messageLanguage }
//
// The PUT body is a partial of the same shape; cells not in
// the body are left alone. Templates are validated for
// allowed placeholders and max lengths — see
// `src/lib/reminderSettings.ts`.

import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { apiHandler, apiErrors } from "@/server/api";
import {
  ensureRecord,
  mergePatch,
  timingsFromChannels,
  timingsToDb,
  templatesToDb,
  validateTemplates,
  type ReminderSettings,
  type ReminderTiming,
  type ToneTemplates,
} from "@/lib/reminderSettings";
import type { MessageLanguage, Tone } from "@/types/loan";

export const dynamic = "force-dynamic";

const toneSchema = z.union([
  z.literal("Friendly"),
  z.literal("Neutral"),
  z.literal("Firm"),
]);

const languageSchema = z.union([z.literal("en"), z.literal("bn")]);

const timingSchema = z.union([
  z.literal("3_days_before"),
  z.literal("on_due_date"),
  z.literal("every_2_days_after"),
]);

const toneTemplatesSchema = z.object({
  sms: z.string().min(0).max(10_000),
  emailSubject: z.string().min(0).max(10_000),
  emailBody: z.string().min(0).max(20_000),
});

const templatesSchema = z
  .object({
    Friendly: z
      .object({ en: toneTemplatesSchema, bn: toneTemplatesSchema })
      .partial()
      .optional(),
    Neutral: z
      .object({ en: toneTemplatesSchema, bn: toneTemplatesSchema })
      .partial()
      .optional(),
    Firm: z
      .object({ en: toneTemplatesSchema, bn: toneTemplatesSchema })
      .partial()
      .optional(),
  })
  .strict()
  .optional();

const putSchema = z
  .object({
    defaultTone: toneSchema.optional(),
    defaultTimings: z.array(timingSchema).min(0).max(8).optional(),
    smsEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    messageLanguage: languageSchema.optional(),
    templates: templatesSchema,
  })
  .strict()
  .refine(
    (b) =>
      b.defaultTone !== undefined ||
      b.defaultTimings !== undefined ||
      b.smsEnabled !== undefined ||
      b.emailEnabled !== undefined ||
      b.messageLanguage !== undefined ||
      b.templates !== undefined,
    { message: "empty_patch", path: ["_root"] },
  );

/* ---- helpers --------------------------------------------------- */

async function loadOrCreateRow(userId: string): Promise<{
  defaultTone: string;
  defaultTimings: unknown;
  smsEnabled: boolean;
  emailEnabled: boolean;
  messageLanguage: string;
  templates: unknown;
}> {
  const existing = await prisma.reminderSettings.findUnique({
    where: { userId },
    select: {
      defaultTone: true,
      defaultTimings: true,
      smsEnabled: true,
      emailEnabled: true,
      messageLanguage: true,
      templates: true,
    },
  });
  if (existing) return existing;
  return prisma.reminderSettings.create({
    data: { userId },
    select: {
      defaultTone: true,
      defaultTimings: true,
      smsEnabled: true,
      emailEnabled: true,
      messageLanguage: true,
      templates: true,
    },
  });
}

/* ---- GET -------------------------------------------------------- */

export async function GET(req: NextRequest) {
  return apiHandler(req, {
    handler: async ({ user }) => {
      const row = await loadOrCreateRow(user.id);
      return ensureRecord(row);
    },
  });
}

/* ---- PUT -------------------------------------------------------- */

export async function PUT(req: NextRequest) {
  return apiHandler(req, {
    body: putSchema,
    handler: async ({ user, body }) => {
      const current = await loadOrCreateRow(user.id);
      const currentRecord = ensureRecord(current);

      const patch: Parameters<typeof mergePatch>[1] = {};
      if (body.defaultTone !== undefined) {
        patch.defaultTone = body.defaultTone as Tone;
      }
      if (body.messageLanguage !== undefined) {
        patch.messageLanguage = body.messageLanguage as MessageLanguage;
      }
      if (body.smsEnabled !== undefined) patch.smsEnabled = body.smsEnabled;
      if (body.emailEnabled !== undefined) patch.emailEnabled = body.emailEnabled;
      if (body.defaultTimings !== undefined) {
        patch.defaultTimings = body.defaultTimings as ReminderTiming[];
      }
      if (body.templates !== undefined) {
        // Zod already validates per-cell shape; cast through
        // unknown so we keep the types narrow.
        patch.templates = body.templates as Partial<{
          [T in Tone]: Partial<{
            [L in MessageLanguage]: Partial<ToneTemplates>;
          }>;
        }>;
      }

      const next: ReminderSettings = mergePatch(currentRecord, patch);

      // Validate AFTER merge so we catch templates that were
      // already wrong (e.g. a row written by an older client).
      const issues = validateTemplates(next.templates);
      if (issues.length > 0) {
        const fields: Record<string, string[]> = {};
        for (const i of issues) {
          (fields[i.field] ??= []).push(i.message);
        }
        throw apiErrors.unprocessable("validation_error", "validation_error", fields);
      }

      // Persist. The `defaultTimings` JSON is rebuilt from the
      // channel booleans so the storage shape stays canonical.
      await prisma.reminderSettings.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          defaultTone: next.tone,
          defaultTimings: timingsToDb(timingsFromChannels(next.channels)) as object,
          smsEnabled: next.channels.sms,
          emailEnabled: next.channels.email,
          messageLanguage: next.messageLanguage,
          templates: templatesToDb(next.templates) as object,
        },
        update: {
          defaultTone: next.tone,
          defaultTimings: timingsToDb(timingsFromChannels(next.channels)) as object,
          smsEnabled: next.channels.sms,
          emailEnabled: next.channels.email,
          messageLanguage: next.messageLanguage,
          templates: templatesToDb(next.templates) as object,
        },
      });

      return next;
    },
  });
}
