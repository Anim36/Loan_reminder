"use client";

/**
 * Figma reference: app shell (Dashboard 10:3868 / Dark dashboard 10:4654).
 * Sun/Moon icon button that flips between light and dark themes via
 * next-themes. The persisted key is `loan-reminder:theme` so the inline
 * pre-paint script in `app/layout.tsx` can re-apply the choice before
 * React mounts and avoid a flash of the wrong theme.
 */

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useT } from "@/lib/i18n/LanguageProvider";

const STORAGE_KEY = "loan-reminder:theme";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useT();
  // `resolvedTheme` is only meaningful on the client. We use
  // `useSyncExternalStore` to derive a stable `mounted` boolean without
  // setting state from an effect.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const isDark = mounted && resolvedTheme === "dark";

  function toggle() {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore — storage may be unavailable in private mode
    }
  }

  return (
    <button
      type="button"
      aria-label={t["ui.theme.toggleAria"]}
      aria-pressed={isDark}
      onClick={toggle}
      className="flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-neutral-50 hover:text-text focus-visible:ring-2 focus-visible:ring-brand-600"
    >
      {mounted ? (
        isDark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />
      ) : (
        <Moon size={18} aria-hidden />
      )}
    </button>
  );
}
