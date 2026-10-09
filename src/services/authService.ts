// Authentication service — Auth.js (NextAuth v5) backed.
//
// The previous implementation kept a `localStorage` token and a
// fake `AuthUser` object. The new implementation routes
// everything through:
//
//   * `signIn`   → POST /api/auth/callback/credentials (Auth.js)
//   * `signUp`   → POST /api/auth/signup (this repo)
//   * `signOut`  → POST /api/auth/signout (Auth.js)
//   * `forgotPassword` → POST /api/auth/forgot-password
//   * `resetPassword`  → POST /api/auth/reset-password
//
// The session itself lives in an httpOnly cookie. The client only
// needs to know `useSession()` from `next-auth/react` to read
// the user; the helpers below exist so the call sites don't
// change shape.

"use client";

import {
  getSession,
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
} from "next-auth/react";

/* ---- Sign in -------------------------------------------------------- */

export class AuthError extends Error {
  /** Auth.js error code, e.g. `CredentialsSignin`, or our
   *  server-side string (`rate_limited`, `invalid_request`). */
  code: string;
  /** HTTP status when the error came from our own API. */
  status?: number;
  /** Retry-after milliseconds for a `rate_limited` response. */
  retryAfterMs?: number;
  constructor(
    code: string,
    message: string,
    opts?: { status?: number; retryAfterMs?: number },
  ) {
    super(message);
    this.code = code;
    this.status = opts?.status;
    this.retryAfterMs = opts?.retryAfterMs;
    this.name = "AuthError";
  }
}

/** Translate a `Response` from our auth API into an `AuthError`
 *  or `null` (success). */
async function asError(res: Response): Promise<AuthError | null> {
  if (res.ok) return null;
  let body: { error?: string; retryAfterMs?: number } = {};
  try {
    body = (await res.json()) as { error?: string; retryAfterMs?: number };
  } catch {
    // Body wasn't JSON.
  }
  const code = body.error || `http_${res.status}`;
  const message = humaniseError(code);
  return new AuthError(code, message, {
    status: res.status,
    retryAfterMs: body.retryAfterMs,
  });
}

function humaniseError(code: string): string {
  // Codes are stable strings; the dictionary resolves them at
  // render time. We keep this fallback so a caller that
  // doesn't have a dictionary can still show *something*.
  switch (code) {
    case "rate_limited":
      return "Too many attempts. Please try again later.";
    case "email_invalid":
      return "Please enter a valid email address.";
    case "password_too_short":
      return "Use at least 8 characters.";
    case "name_too_short":
      return "Please enter your name.";
    case "invalid_token":
      return "This reset link is invalid or has expired.";
    case "incorrect_password":
      return "Incorrect current password.";
    case "no_password_set":
      return "Your account doesn't have a password set. Use Google to sign in.";
    case "CredentialsSignin":
      return "Incorrect email or password.";
    default:
      return "Something went wrong. Please try again.";
  }
}

/** Sign in with email + password. Throws `AuthError` on
 *  failure so the caller's catch block can read the code. */
export async function signIn(input: {
  email: string;
  password: string;
}): Promise<void> {
  const res = await nextAuthSignIn("credentials", {
    email: input.email,
    password: input.password,
    redirect: false,
  });
  if (!res || res.error) {
    throw new AuthError(
      res?.error ?? "CredentialsSignin",
      humaniseError(res?.error ?? "CredentialsSignin"),
      { status: res?.status },
    );
  }
}

/* ---- Sign up -------------------------------------------------------- */

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<void> {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const err = await asError(res);
  if (err) throw err;
  // The signup route also calls `signIn` server-side, so the
  // cookie is already set by the time we get here. The caller's
  // `router.refresh()` is what makes `useSession()` see the
  // change.
}

/* ---- Sign out ------------------------------------------------------- */

export async function signOut(opts?: { callbackUrl?: string }): Promise<void> {
  await nextAuthSignOut({ redirect: false, callbackUrl: opts?.callbackUrl });
}

/* ---- Forgot / reset password ---------------------------------------- */

export async function forgotPassword(input: {
  email: string;
}): Promise<{ email: string }> {
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await asError(res);
    if (err) throw err;
  }
  // The server always returns the same success payload, so we
  // just echo the email the user typed.
  return { email: input.email };
}

export async function resetPassword(input: {
  token: string;
  newPassword: string;
}): Promise<void> {
  const res = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const err = await asError(res);
  if (err) throw err;
}

/* ---- Change / delete password (Settings) --------------------------- */

export async function changePassword(input: {
  current: string;
  next: string;
}): Promise<void> {
  const res = await fetch("/api/settings/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      currentPassword: input.current,
      newPassword: input.next,
    }),
  });
  const err = await asError(res);
  if (err) throw err;
}

export async function deleteAccount(): Promise<void> {
  const res = await fetch("/api/settings/delete-account", {
    method: "POST",
  });
  const err = await asError(res);
  if (err) throw err;
}

/* ---- Update the signed-in user (Settings → server) ------------------ */

/** Fields the user is allowed to change about themselves via the
 *  Settings page. Email isn't here on purpose — it needs a
 *  verification round-trip we haven't built yet. */
export interface ProfileUpdate {
  name?: string;
  phone?: string | null;
  language?: "en" | "bn";
  theme?: "light" | "dark" | "system";
  banglaNumerals?: boolean;
}

export interface MeResponse {
  id: string;
  email: string;
  name: string;
  image: string | null;
  language: string;
  theme: string;
  banglaNumerals: boolean;
}

/** PATCH /api/auth/me with a partial profile update. Resolves with
 *  the server's view of the row so callers can update their local
 *  cache without a refetch. Throws `AuthError` on any non-2xx
 *  response. */
export async function updateProfile(
  patch: ProfileUpdate,
): Promise<MeResponse> {
  const res = await fetch("/api/auth/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const err = await asError(res);
    if (err) throw err;
    throw new AuthError("server_error", "Could not update profile.");
  }
  const body = (await res.json()) as { ok: true; user: MeResponse };
  // The JWT carries a copy of these fields; the `jwt` callback
  // re-reads the row on the next request. We proactively call
  // `getSession()` to force the SessionProvider to refetch so
  // the navbar / drawer / etc. re-render with the new name
  // without waiting for the next refetch tick.
  try {
    await getSession();
  } catch {
    // A failed session refresh is non-fatal — the user still
    // sees their new profile in the next refetch.
  }
  return body.user;
}
