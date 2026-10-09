"use client";

/**
 * LanguageProvider — the single source of truth for the active UI
 * language in the app.
 *
 * Persistence: the same language is stored in `localStorage` (for
 * fast client reads) and a cookie (so the server render uses it too).
 * The cookie is read by `app/layout.tsx` on the server and the value
 * is passed in as `initialLang` so the first paint matches.
 *
 * To avoid a hydration mismatch the provider only ever uses the
 * server-derived `initialLang` during the very first render. After
 * mount it re-reads `localStorage` and re-renders if it differs. From
 * that point on, the source of truth is `localStorage`, and the
 * provider listens for a `language:change` event so other components
 * can also flip the language (e.g. the TopBar switcher).
 *
 * `<html lang>` is updated by a small effect on `lang` change.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_LANG,
  LANG_CHANGE_EVENT,
  LANG_COOKIE,
  LANG_STORAGE_KEY,
  dictionary,
  isLang,
  type Lang,
} from "./index";
import type { Dictionary } from "./types";

interface LanguageContextValue {
  lang: Lang;
  t: Dictionary;
  setLang: (next: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

/* ---- useSyncExternalStore snapshot pattern --------------------------
 * `getSnapshot` returns a primitive (the lang string) so React never
 * sees a "changed" reference on every render. The server snapshot is
 * the same primitive for the lifetime of the SSR render, so the first
 * client render is byte-identical. */

let cachedLang: Lang = DEFAULT_LANG;
let cachedKey: string | null = null;

function readStoredLang(): Lang {
  if (!hasWindow()) return DEFAULT_LANG;
  // The lang only changes when (a) the user changes it, or
  // (b) the storage key changes underneath us. We compare on a key
  // that includes the cookie *and* the localStorage value to avoid
  // out-of-band drift.
  const ls = window.localStorage.getItem(LANG_STORAGE_KEY);
  const cookie = readCookie(LANG_COOKIE);
  const key = `${ls}|${cookie}`;
  if (key === cachedKey) return cachedLang;
  cachedKey = key;
  if (isLang(ls)) cachedLang = ls;
  else if (isLang(cookie)) cachedLang = cookie;
  else cachedLang = DEFAULT_LANG;
  return cachedLang;
}

function readCookie(name: string): string | null {
  if (!hasWindow()) return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function subscribe(cb: () => void) {
  if (!hasWindow()) return () => {};
  const handler = () => cb();
  window.addEventListener(LANG_CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(LANG_CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/* ---- Provider -------------------------------------------------------- */

export function LanguageProvider({
  initialLang,
  children,
}: {
  /** Server-derived language (from the cookie). Used for the first
   *  client render so SSR/CSR markup matches. */
  initialLang: Lang;
  children: ReactNode;
}) {
  // During SSR and the very first client render we use `initialLang`.
  // After mount, `useSyncExternalStore` swaps in the persisted value
  // (which may match, or may be a later change).
  const lang = useSyncExternalStore(
    subscribe,
    readStoredLang,
    () => initialLang,
  );

  // Update the <html lang> attribute whenever the language changes.
  // (Belt-and-braces: Next's app router doesn't set <html lang>
  // automatically from a client component.)
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    if (!hasWindow()) return;
    window.localStorage.setItem(LANG_STORAGE_KEY, next);
    // Mirror to a cookie so the server render and any other SSR
    // request picks it up. Use a 1-year max-age and sameSite=Lax.
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `${LANG_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=${oneYear}; samesite=lax`;
    window.dispatchEvent(new CustomEvent(LANG_CHANGE_EVENT));
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, t: dictionary(lang), setLang }),
    [lang, setLang],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/* ---- Hooks ------------------------------------------------------------ */

/**
 * Returns the active language, the dictionary, and a setter. Throws
 * if used outside a `<LanguageProvider>`.
 */
export function useT(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Defensive fallback so a server-render mistake doesn't crash
    // the whole tree — use the English dictionary.
    return { lang: DEFAULT_LANG, t: dictionary(DEFAULT_LANG), setLang: () => undefined };
  }
  return ctx;
}

/** Returns just the language code (en / bn). */
export function useLang(): Lang {
  return useT().lang;
}

/** Returns just the dictionary. */
export function useDict(): Dictionary {
  return useT().t;
}
