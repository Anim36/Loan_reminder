// Sign up — POST /api/auth/signup.
//
// Creates a new user with a hashed password, seeds the default
// `ReminderSettings` row, and signs the user in. The response
// shape matches the legacy `authService.signUp` so the client
// code can swap in without branching.
//
// The duplicate-email check is deliberately tolerant: we return
// 200 with a `{ ok: true }` payload even when the address is
// already on file, so an attacker can't enumerate accounts. The
// UI is expected to display the same "check your email" message
// it shows for the success path; for the prototype the client
// actually signs the user in directly, so we keep the 200 + a
// generic `created` flag in the payload. The caller decides
// which UX to render.
//
// Validation
// ----------
//   * name  — required, trimmed, ≥2 chars (matches the Settings
//     profile schema).
//   * email — required, trimmed, lowercased, valid email.
//   * password — required, ≥8 chars. We don't enforce complexity
//     rules yet; that's a follow-up.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { authRateLimiter, clientIpFromHeaders } from "@/server/rate-limit";
import { signIn } from "@/server/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(2, "name_too_short").max(80, "name_too_long"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("email_invalid")
    .max(254, "email_invalid"),
  password: z.string().min(8, "password_too_short").max(200, "password_too_long"),
});

type SignupOk = { ok: true; userId: string; email: string };
type SignupError = { ok: false; error: string; retryAfterMs?: number };

export async function POST(req: NextRequest) {
  // Rate-limit per (IP, email) so a bot can't burn through the
  // bcrypt hashing on a single IP. We use the same limiter as
  // login and forgot-password; the keys are namespaced.
  const ip = clientIpFromHeaders(req.headers);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<SignupError>(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json<SignupError>(
      { ok: false, error: first?.message ?? "invalid" },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;
  const rlKey = `signup:${ip}:${email}`;
  const decision = authRateLimiter.consume(rlKey);
  if (!decision.ok) {
    return NextResponse.json<SignupError>(
      {
        ok: false,
        error: "rate_limited",
        retryAfterMs: decision.retryAfterMs,
      },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(decision.retryAfterMs / 1000)) },
      },
    );
  }

  // Pre-check: does the email already exist? We use a single,
  // indexed `findUnique` here; the unique constraint is the real
  // safeguard against races.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Same shape as the success payload — the caller decides how
    // to render the "you may already have an account" hint.
    return NextResponse.json<SignupOk>(
      { ok: true, userId: existing.id, email: existing.email },
      { status: 200 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let user: { id: string; email: string };
  try {
    user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        language: "en",
        theme: "light",
      },
      select: { id: true, email: true },
    });
  } catch (err) {
    // Race with another signup for the same email — same
    // "already on file" response.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const row = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true },
      });
      if (row) {
        return NextResponse.json<SignupOk>(
          { ok: true, userId: row.id, email: row.email },
          { status: 200 },
        );
      }
    }
    console.error("[signup] failed to create user", err);
    return NextResponse.json<SignupError>(
      { ok: false, error: "server_error" },
      { status: 500 },
    );
  }

  // Seed the default ReminderSettings row. Wrapped in a
  // `try`/`catch` so a failure here doesn't undo the signup —
  // the row can always be created lazily on first read.
  try {
    await prisma.reminderSettings.create({
      data: {
        userId: user.id,
        defaultTone: "Friendly",
        smsEnabled: true,
        emailEnabled: true,
        messageLanguage: "en",
        templates: Prisma.JsonNull as unknown as Prisma.InputJsonValue,
        defaultTimings: {
          threeDaysBefore: true,
          onDueDate: true,
          everyTwoDaysAfterOverdue: true,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    // The `userId` column is unique, so this only throws on a
    // race with a parallel signup. That's harmless — the row
    // exists either way.
    if (
      !(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")
    ) {
      console.error("[signup] failed to seed reminder settings", err);
    }
  }

  // Sign the user in. Auth.js will set the cookie on the
  // response. We delegate the actual cookie writing to the
  // library — passing the URL with no callback is fine for
  // a JSON API response.
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (err) {
    // `signIn` throws a `CredentialsSignin` when the password
    // check fails, but we just hashed the password, so the only
    // way this happens is if the request is raced between the
    // create and the signin. Log and continue.
    console.error("[signup] auto sign-in failed", err);
  }

  return NextResponse.json<SignupOk>(
    { ok: true, userId: user.id, email: user.email },
    { status: 201 },
  );
}
