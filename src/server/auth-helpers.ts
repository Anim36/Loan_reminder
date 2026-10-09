// Server-side authentication helpers.
//
// `requireUser` is the single entry point every protected API route
// uses. It:
//   1. Calls Auth.js's `auth()` to read the session cookie.
//   2. Returns the user id and email when the user is signed in.
//   3. Otherwise returns a `NextResponse` with status 401 so the
//      caller can `return` it directly.
//
// We never trust a `userId` sent in the request body / query — the
// session is the only source of truth. If a route needs a different
// field (e.g. "is this user an admin?") it should look it up from
// the database using the session's id.

import { NextResponse } from "next/server";
import { auth } from "@/server/auth";

export interface RequiredUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  language: string;
  theme: string;
  banglaNumerals: boolean;
  tokenVersion: number;
}

export type RequireUserResult =
  | { ok: true; user: RequiredUser }
  | { ok: false; response: NextResponse };

export async function requireUser(): Promise<RequireUserResult> {
  const session = await auth();
  const u = session?.user;
  if (!u || !u.id) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "unauthorized", message: "auth.required" },
        { status: 401 },
      ),
    };
  }
  return {
    ok: true,
    user: {
      id: u.id,
      email: u.email ?? "",
      name: u.name ?? null,
      image: u.image ?? null,
      language: (u as { language?: string }).language ?? "en",
      theme: (u as { theme?: string }).theme ?? "light",
      banglaNumerals: Boolean((u as { banglaNumerals?: boolean }).banglaNumerals),
      tokenVersion: (u as { tokenVersion?: number }).tokenVersion ?? 0,
    },
  };
}
