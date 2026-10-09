// Reset password — POST /api/auth/reset-password.
//
// Body: `{ token: string, newPassword: string }`.
//
// Validates the single-use token (matches the SHA-256 hash
// stored in `PasswordResetToken`, is un-used, hasn't expired),
// hashes the new password with bcrypt (cost 12), writes the
// user, marks the token used, and bumps `tokenVersion` on the
// user so every other session for this account is invalidated
// by Auth.js's stale-token guard.
//
// On success we also sign the user in so they don't have to
// re-enter the email.

import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { authRateLimiter, clientIpFromHeaders } from "@/server/rate-limit";
import { signIn } from "@/server/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().trim().min(20).max(200),
  newPassword: z.string().min(8).max(200),
});

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(req: NextRequest) {
  const ip = clientIpFromHeaders(req.headers);
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_request" },
      { status: 400 },
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_request" },
      { status: 400 },
    );
  }
  const { token, newPassword } = parsed.data;

  // Per-IP rate limit so an attacker can't grind through tokens.
  const rl = authRateLimiter.consume(`reset:${ip}`);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", retryAfterMs: rl.retryAfterMs },
      { status: 429 },
    );
  }

  const tokenHash = hashToken(token);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true, tokenVersion: true } } },
  });

  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { ok: false, error: "invalid_token" },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Mark the token used and rotate the password in a single
  // transaction. Bumping `tokenVersion` invalidates every other
  // JWT in the wild.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);

  // Sign the user in. The library reads the email / password and
  // sets the same httpOnly cookie the normal login uses.
  try {
    await signIn("credentials", {
      email: row.user.email,
      password: newPassword,
      redirect: false,
    });
  } catch (err) {
    // We just set the password, so the only failure mode is a
    // network blip. Don't fail the request — the user can
    // re-login at /login.
    console.error("[reset-password] auto sign-in failed", err);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
