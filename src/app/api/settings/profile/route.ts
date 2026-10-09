// /api/settings/profile — get + update the user's profile.
//
// Ownership split
// ---------------
//   * `/api/auth/me` (PATCH) — the legacy route. Backs the
//     current Settings page; covers name, phone, language,
//     theme, banglaNumerals in one partial patch. B5 will
//     eventually delete it once the UI is rewired to
//     `/api/settings/profile` + `/api/settings/preferences`.
//   * `/api/settings/profile` (GET, PATCH) — name, phone,
//     image. The image column already exists on the User
//     model (Auth.js stores OAuth avatars there); we just
//     expose a PATCH path so the prototype's "edit profile"
//     flow can write to it.
//
//   * `/api/settings/preferences` (GET, PATCH) — language,
//     theme, banglaNumerals, and the three notification
//     toggles.
//
// The two new routes return the B5-shape so the wiring in B5
// is a straight swap, not a migration. The legacy
// `/api/auth/me` PATCH keeps its `{ ok, user }` envelope.

import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { apiHandler } from "@/server/api";
import { normalisePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

const phoneSchema = z
  .union([
    z.literal(""), // "" means "clear the field"
    z.string().trim().min(1).max(40),
  ])
  .optional();

const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    phone: phoneSchema,
    image: z
      .union([z.literal(""), z.string().trim().url().max(2_000)])
      .optional(),
  })
  .strict()
  .refine(
    (b) => b.name !== undefined || b.phone !== undefined || b.image !== undefined,
    { message: "empty_patch", path: ["_root"] },
  );

export async function GET(req: NextRequest) {
  return apiHandler(req, {
    handler: async ({ user }) => {
      const row = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          image: true,
        },
      });
      if (!row) {
        // The session is valid but the user was deleted. Force
        // a sign-out on the client.
        const { apiErrors } = await import("@/server/api");
        throw apiErrors.unauthorized("unauthorized", "unauthorized");
      }
      return {
        id: row.id,
        email: row.email,
        name: row.name,
        phone: row.phone, // already E.164 in the DB
        image: row.image,
      };
    },
  });
}

export async function PATCH(req: NextRequest) {
  return apiHandler(req, {
    body: patchSchema,
    handler: async ({ user, body }) => {
      const data: Record<string, string | null> = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.phone !== undefined) {
        if (body.phone === "") {
          data.phone = null;
        } else {
          const e164 = normalisePhone(body.phone);
          if (!e164) {
            // Throw via the wrapper's known-error path.
            const { apiErrors } = await import("@/server/api");
            throw apiErrors.unprocessable("phone_invalid", "phone_invalid");
          }
          data.phone = e164;
        }
      }
      if (body.image !== undefined) {
        data.image = body.image === "" ? null : body.image;
      }

      const row = await prisma.user.update({
        where: { id: user.id },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          image: true,
        },
      });
      return {
        id: row.id,
        email: row.email,
        name: row.name,
        phone: row.phone,
        image: row.image,
      };
    },
  });
}
