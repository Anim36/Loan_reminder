// Google OAuth availability — GET /api/auth/google-enabled.
//
// Returns `{ enabled: boolean }`. The login and signup pages call
// this once on mount to decide whether to render the
// "Continue with Google" button. We use a tiny endpoint instead
// of `NEXT_PUBLIC_AUTH_GOOGLE_*` so we never have to leak the
// real env-var name to the client bundle (the secret stays on
// the server).
//
// The response is cached for the lifetime of the dev server /
// function instance; the value never changes between requests.

import { NextResponse } from "next/server";
import { googleEnabled } from "@/server/auth";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ enabled: googleEnabled });
}
