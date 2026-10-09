// /api/settings/preferences — get + update the user's UI and
// notification preferences.
//
// Fields:
//   language          "en" | "bn"
//   theme             "light" | "dark" | "system"
//   banglaNumerals    boolean
//   emailOnPaid       boolean
//   emailOnOverdue    boolean
//   weeklySummary     boolean
//
// See `/api/settings/profile/route.ts` for the split between
// the three settings routes (profile, preferences, password).

import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { apiHandler } from "@/server/api";

export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    language: z.union([z.literal("en"), z.literal("bn")]).optional(),
    theme: z
      .union([
        z.literal("light"),
        z.literal("dark"),
        z.literal("system"),
      ])
      .optional(),
    banglaNumerals: z.boolean().optional(),
    emailOnPaid: z.boolean().optional(),
    emailOnOverdue: z.boolean().optional(),
    weeklySummary: z.boolean().optional(),
  })
  .strict()
  .refine(
    (b) =>
      b.language !== undefined ||
      b.theme !== undefined ||
      b.banglaNumerals !== undefined ||
      b.emailOnPaid !== undefined ||
      b.emailOnOverdue !== undefined ||
      b.weeklySummary !== undefined,
    { message: "empty_patch", path: ["_root"] },
  );

export interface PreferencesDto {
  language: "en" | "bn";
  theme: "light" | "dark" | "system";
  banglaNumerals: boolean;
  notifications: {
    emailOnPaid: boolean;
    emailOnOverdue: boolean;
    weeklySummary: boolean;
  };
}

export async function GET(req: NextRequest) {
  return apiHandler(req, {
    handler: async ({ user }) => {
      const row = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          language: true,
          theme: true,
          banglaNumerals: true,
          emailOnPaid: true,
          emailOnOverdue: true,
          weeklySummary: true,
        },
      });
      if (!row) {
        const { apiErrors } = await import("@/server/api");
        throw apiErrors.unauthorized("unauthorized", "unauthorized");
      }
      return toDto(row);
    },
  });
}

export async function PATCH(req: NextRequest) {
  return apiHandler(req, {
    body: patchSchema,
    handler: async ({ user, body }) => {
      const data: Record<string, unknown> = {};
      if (body.language !== undefined) data.language = body.language;
      if (body.theme !== undefined) data.theme = body.theme;
      if (body.banglaNumerals !== undefined) data.banglaNumerals = body.banglaNumerals;
      if (body.emailOnPaid !== undefined) data.emailOnPaid = body.emailOnPaid;
      if (body.emailOnOverdue !== undefined) data.emailOnOverdue = body.emailOnOverdue;
      if (body.weeklySummary !== undefined) data.weeklySummary = body.weeklySummary;

      const row = await prisma.user.update({
        where: { id: user.id },
        data,
        select: {
          language: true,
          theme: true,
          banglaNumerals: true,
          emailOnPaid: true,
          emailOnOverdue: true,
          weeklySummary: true,
        },
      });
      return toDto(row);
    },
  });
}

function toDto(row: {
  language: "en" | "bn";
  theme: "light" | "dark" | "system";
  banglaNumerals: boolean;
  emailOnPaid: boolean;
  emailOnOverdue: boolean;
  weeklySummary: boolean;
}): PreferencesDto {
  return {
    language: row.language,
    theme: row.theme,
    banglaNumerals: row.banglaNumerals,
    notifications: {
      emailOnPaid: row.emailOnPaid,
      emailOnOverdue: row.emailOnOverdue,
      weeklySummary: row.weeklySummary,
    },
  };
}
