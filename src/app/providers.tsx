"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast-provider";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n";

/**
 * Client-only wrapper around next-themes + LanguageProvider + ToastProvider.
 * Pages and layouts stay server components; only this file opts into the
 * client boundary.
 *
 * `initialLang` is read from the language cookie by the server layout
 * (`app/layout.tsx`) and passed down. The server-rendered HTML matches
 * the language the user selected, so the first paint is already
 * Bangla (no flash of English). The client provider re-checks
 * localStorage on mount and re-renders if they have drifted.
 */
export function Providers({
  children,
  initialLang = DEFAULT_LANG,
}: {
  children: ReactNode;
  initialLang?: Lang;
}) {
  return (
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
  );
}
