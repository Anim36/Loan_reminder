// Forgot password — POST /api/auth/forgot-password.
//
// Returns the same shape whether or not the email exists. The
// only side effect of a known address is an email with a
// single-use reset link valid for 30 minutes; we never store
// the raw token, only its SHA-256 hash, and we never log
// passwords, hashes or tokens in production.
//
// Body: `{ email: string }`. The handler accepts a malformed
// email silently and returns the same success response — this
// stops attackers from enumerating which addresses are on
// file.

import { NextResponse, type NextRequest } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { authRateLimiter, clientIpFromHeaders } from "@/server/rate-limit";
import { sendPasswordResetEmail } from "@/server/messaging/email";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

/** Success response — identical for every outcome. */
const successPayload = { ok: true as const };

/** 30 minutes in milliseconds. */
const TOKEN_TTL_MS = 30 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function buildResetUrl(token: string): string {
  // Prefer APP_URL (public origin) over AUTH_URL. Fall back to a
  // localhost default so the developer can still click the link
  // when the env is missing.
  const base =
    process.env.APP_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    "http://localhost:3000";
  // The reset page reads the token from `?token=…`.
  return `${base.replace(/\/+$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function POST(req: NextRequest) {
  const ip = clientIpFromHeaders(req.headers);
  let raw: unknown = {};
  try {
    raw = await req.json();
  } catch {
    // Same shape as success — the client doesn't need to know
    // the body was malformed.
    return NextResponse.json(successPayload, { status: 200 });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(successPayload, { status: 200 });
  }
  const { email } = parsed.data;

  // Per-IP rate limit (we don't include the email here so the
  // key is uniform regardless of which address the user types).
  const rl = authRateLimiter.consume(`forgot:${ip}`);
  if (!rl.ok) {
    // Same success response so the rate-limit doesn't reveal
    // anything about whether the address is on file.
    return NextResponse.json(successPayload, {
      status: 200,
      headers: {
        "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)),
      },
    });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (user) {
    // 32 random bytes → 64-hex string. Plenty of entropy for a
    // single-use 30-minute token.
    const token = randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    // We `deleteMany` any previous un-used tokens for the same
    // user so the table doesn't grow unbounded. The new row is
    // the only valid token until it expires.
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const resetUrl = buildResetUrl(token);
    // We deliberately do NOT await this in the hot path — the
    // success response is the same either way, and any email
    // error is already swallowed by `sendPasswordResetEmail`.
    // Awaiting keeps the function semantically clear (we want
    // the email queued before we tell the user we're done) but
    // failures don't propagate.
    await sendPasswordResetEmail(email, resetUrl);
  }

  return NextResponse.json(successPayload, { status: 200 });
}
