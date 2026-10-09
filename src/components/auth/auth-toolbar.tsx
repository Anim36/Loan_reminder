"use client";

// Floating theme/language toolbar shown on the auth pages. Lives in
// the top-right so the user can switch language and theme without
// leaving the form.

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useT } from "@/lib/i18n/LanguageProvider";

export function AuthToolbar() {
  const { t } = useT();
  return (
    <div
      className="fixed right-3 top-3 z-30 flex items-center gap-2 sm:right-6 sm:top-6"
      role="toolbar"
      aria-label={t["auth.brandHome"]}
    >
      <ThemeToggle />
      <LanguageSwitcher variant="dropdown" />
    </div>
  );
}
