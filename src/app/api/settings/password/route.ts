// Settings — change password — POST /api/settings/password.
//
// Body: `{ currentPassword: string, newPassword: string }`.
//
// Verifies the current password, hashes the new one with
// bcrypt (cost 12), writes the user, and bumps `tokenVersion`
// so every other device is signed out.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { requireUser } from "@/server/auth-helpers";

export const dynamic = "force-dynamic";

const schema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let raw: unknown = {};
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_request" },
      { status: 400 },
    );
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_request" },
      { status: 400 },
    );
  }

  const { currentPassword, newPassword } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { passwordHash: true },
  });
  if (!user || !user.passwordHash) {
    return NextResponse.json(
      { ok: false, error: "no_password_set" },
      { status: 400 },
    );
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "incorrect_password" },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      passwordHash,
      tokenVersion: { increment: 1 },
    },
  });

  return NextResponse.json({ ok: true });
}
