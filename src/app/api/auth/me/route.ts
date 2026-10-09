// Update the signed-in user — PATCH /api/auth/me.
//
// Accepts a partial patch of the fields a logged-in user is allowed
// to change themselves:
//
//   * `name`           string  — display name. 2-80 chars.
//   * `phone`          string? — E.164-style Bangladeshi mobile
//                                 number. Optional.
//   * `language`       "en" | "bn"
//   * `theme`          "light" | "dark" | "system"
//   * `banglaNumerals` boolean
//
// All fields are optional. The route only writes the keys that
// are present in the body, so callers can patch a single value
// without re-sending the whole record. An empty body is a 400.
//
// The response is `{ ok: true, user: { ...safe fields... } }`. The
// `safe` shape mirrors the `RequiredUser` interface in
// `auth-helpers.ts` so the client can read the result without
// re-fetching the session.
//
// Email is intentionally NOT patchable here — changing the
// primary email needs a verification round-trip; until that
// exists, we keep the field server-side only.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireUser } from "@/server/auth-helpers";

export const dynamic = "force-dynamic";

const languageSchema = z.union([z.literal("en"), z.literal("bn")]);
const themeSchema = z.union([
  z.literal("light"),
  z.literal("dark"),
  z.literal("system"),
]);

// `phone` matches the Settings form regex: BD local 11 digits
// starting with 1[3-9], no country code. We accept an empty
// string as "clear the field".
const bdPhoneRegex = /^1[3-9]\d{8}$/;

const patchSchema = z
  .object({
    name: z.string().trim().min(2, "name_too_short").max(80, "name_too_long"),
    phone: z
      .union([
        z.literal(""),
        z.string().trim().regex(bdPhoneRegex, "phone_invalid"),
      ])
      .optional(),
    language: languageSchema.optional(),
    theme: themeSchema.optional(),
    banglaNumerals: z.boolean().optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.name !== undefined ||
      v.phone !== undefined ||
      v.language !== undefined ||
      v.theme !== undefined ||
      v.banglaNumerals !== undefined,
    { message: "empty_patch" },
  );

export async function PATCH(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let raw: unknown = {};
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: first?.message ?? "invalid_request" },
      { status: 400 },
    );
  }

  // Build the `data` object Prisma will use. Only the keys the
  // caller actually sent end up in the patch — passing `undefined`
  // for a key is a no-op.
  const data: {
    name?: string;
    phone?: string | null;
    language?: "en" | "bn";
    theme?: "light" | "dark" | "system";
    banglaNumerals?: boolean;
  } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.phone !== undefined) {
    // Empty string clears the field. The Prisma column is
    // nullable; the form is also free to send `""` to mean
    // "remove the phone number".
    data.phone = parsed.data.phone === "" ? null : parsed.data.phone;
  }
  if (parsed.data.language !== undefined) {
    data.language = parsed.data.language;
  }
  if (parsed.data.theme !== undefined) {
    data.theme = parsed.data.theme;
  }
  if (parsed.data.banglaNumerals !== undefined) {
    data.banglaNumerals = parsed.data.banglaNumerals;
  }

  const row = await prisma.user.update({
    where: { id: auth.user.id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      language: true,
      theme: true,
      banglaNumerals: true,
    },
  });

  // The `jwt` callback re-reads the row on the next request, so
  // the new values flow into the session without us touching the
  // cookie here. We return the same shape `requireUser` uses so
  // the client can update its local cache in one place.
  return NextResponse.json({
    ok: true,
    user: {
      id: row.id,
      email: row.email,
      name: row.name,
      image: row.image,
      language: row.language,
      theme: row.theme,
      banglaNumerals: row.banglaNumerals,
    },
  });
}
