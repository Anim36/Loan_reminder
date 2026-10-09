"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import type { Session } from "next-auth";
import { ToastProvider } from "@/components/ui/toast-provider";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n";

/**
 * Client-only wrapper around React-Query, next-themes, Auth.js's
 * `SessionProvider`, the i18n `LanguageProvider` and the toast
 * `ToastProvider`. Pages and layouts stay server components; only
 * this file opts into the client boundary.
 *
 * Provider order (outermost → innermost):
 *   SessionProvider      — every consumer below (e.g. navbar) can
 *                          call `useSession` without crashing.
 *   QueryClientProvider  — the data layer for the B3/B4 API.
 *   ThemeProvider        — next-themes.
 *   LanguageProvider     — i18n.
 *   ToastProvider        — toasts.
 *
 * `initialLang` is read from the language cookie by the server
 * layout (`app/layout.tsx`) and passed down so the first paint is
 * already in the user's selected language.
 *
 * `session` is the `auth()` result from the server. The first
 * paint includes the right user (no flash of "Sign in") and the
 * initial `useSession` fetch is skipped for already-signed-in
 * users.
 *
 * Query defaults:
 *   - `staleTime: 30s`     — list pages don't refetch on every
 *                            focus. The bell's unread count has
 *                            its own 30s polling below.
 *   - `retry: 1`           — one retry on transient network errors.
 *   - `refetchOnWindowFocus: false` — focus churn is what made
 *                            the old `useSyncExternalStore` loops
 *                            visible. React Query only refetches
 *                            when something explicitly invalidates.
 */
export function Providers({
  children,
  initialLang = DEFAULT_LANG,
  session,
}: {
  children: ReactNode;
  initialLang?: Lang;
  /** The session as resolved by `auth()` on the server. `null`
   *  for signed-out visitors. */
  session: Session | null;
}) {
  // `useState` ensures the QueryClient is created once per
  // provider mount (one per page in the app router), never per
  // render. Sharing a single instance across the whole tree is
  // what makes React Query's cache work.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
            retryDelay: (attempt) =>
              Math.min(1_000 * 2 ** attempt, 5_000),
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <SessionProvider
      refetchInterval={5 * 60}
      refetchOnWindowFocus={false}
      session={session}
    >
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    </SessionProvider>
  );
}
