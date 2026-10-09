"use client";

// `useSessionUser` — thin wrapper around next-auth's `SessionContext`
// that returns just the fields the app needs and a stable `status`
// string the rest of the UI can read without branching on three
// different booleans.
//
// Why we don't call `useSession` directly
// --------------------------------------
// `next-auth/react`'s `useSession` throws "[next-auth]: `useSession`
// must be wrapped in a <SessionProvider />" whenever the context
// value is undefined. That throw is a render-time error — it can't
// be caught from the call site. We want the marketing landing page
// and the (auth) routes to be able to read the session *if there
// is one* without crashing when there isn't.
//
// The fix is to read the same `SessionContext` object ourselves.
// `useContext` returns the default (undefined) when no provider is
// in the tree, so we can return a graceful
// `{ status: "unauthenticated", user: null }` for those cases.

import { useContext, useMemo } from "react";
import { SessionContext } from "next-auth/react";

import type {
  SessionUser,
  UseSessionUserResult,
} from "./session-user-types";

// Re-export the types so callers can `import { SessionUser } from
// "@/hooks/use-session-user"` if they prefer a single module.
export type { SessionUser, UseSessionUserResult, SessionStatus } from "./session-user-types";

/** Read the active next-auth session, normalised. Never throws.
 *  Returns `{ status: "unauthenticated", user: null }` when no
 *  `<SessionProvider>` is mounted above the caller. */
export function useSessionUser(): UseSessionUserResult {
  const ctx = useContext(SessionContext);
  return useMemo<UseSessionUserResult>(() => {
    // No provider in the tree (landing page, (auth) routes).
    if (!ctx) {
      return { status: "unauthenticated", user: null };
    }
    const { data, status: rawStatus } = ctx;
    if (rawStatus === "loading" || !data?.user) {
      return {
        status: rawStatus === "loading" ? "loading" : "unauthenticated",
        user: null,
      };
    }
    const u = data.user as {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      language?: string;
      theme?: string;
      banglaNumerals?: boolean;
    };
    const name = u.name ?? "—";
    const email = u.email ?? "";
    const user: SessionUser = {
      id: u.id ?? "",
      name,
      email,
      image: u.image ?? null,
      language: u.language ?? "en",
      theme: u.theme ?? "light",
      banglaNumerals: Boolean(u.banglaNumerals),
      initial: name.trim().charAt(0).toUpperCase() || "•",
    };
    return { status: "authenticated", user };
  }, [ctx]);
}
