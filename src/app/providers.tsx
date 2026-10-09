"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import type { Session } from "next-auth";
import { ToastProvider } from "@/components/ui/toast-provider";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n";

/**
 * Client-only wrapper around next-themes, Auth.js's
 * `SessionProvider`, the i18n `LanguageProvider` and the toast
 * `ToastProvider`. Pages and layouts stay server components; only
 * this file opts into the client boundary.
 *
 * Why `SessionProvider` is the outermost wrapper
 * ----------------------------------------------
 * `next-auth/react`'s `useSession` throws if the context is
 * missing. The marketing landing page and the (auth) routes render
 * inside `Providers` too, and the navbar/ProfileMenu live on every
 * (app) page. Keeping `SessionProvider` at the top means every
 * consumer (including the ones that may render on the landing
 * page in future) can read the context without crashing.
 *
 * `initialLang` is read from the language cookie by the server layout
 * (`app/layout.tsx`) and passed down. The server-rendered HTML matches
 * the language the user selected, so the first paint is already
 * Bangla (no flash of English). The client provider re-checks
 * localStorage on mount and re-renders if they have drifted.
 *
 * `session`
 * ---------
 * The root layout calls `auth()` server-side and passes the result
 * in. That makes the first paint include the right user (no flash
 * of "Sign in") and skips the initial `useSession` fetch on the
 * client for users who are already signed in.
 *
 * Refetch tuning
 * --------------
 * `refetchOnWindowFocus={false}` — polling on every focus change
 * fired a `useSession` update for every tab switch, which then
 * re-rendered `ProfileMenu`/`TopBar` even when the session
 * hadn't changed. Five minutes is a good compromise: "log out
 * everywhere" takes effect within five minutes without a manual
 * refresh, and there's no per-focus churn.
 */
export function Providers({
  children,
  initialLang = DEFAULT_LANG,
  session,
}: {
  children: ReactNode;
  initialLang?: Lang;
  /** The session as resolved by `auth()` on the server. `null` for
   *  signed-out visitors. */
  session: Session | null;
}) {
  return (
    <SessionProvider
      // 5 minutes — see "Refetch tuning" above.
      refetchInterval={5 * 60}
      refetchOnWindowFocus={false}
      session={session}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        themes={["light", "dark"]}
        disableTransitionOnChange
      >
        <LanguageProvider initialLang={initialLang}>
          <ToastProvider>{children}</ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
