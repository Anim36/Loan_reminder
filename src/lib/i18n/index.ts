// i18n barrel.
//
// Usage from a client component:
//   const { t, lang } = useT();
//   <p>{t("common.save")}</p>
//
// Usage from a server component (just for the lang attribute / cookies):
//   import { getLangCookie, readLangFromCookie } from "@/lib/i18n";
//   const lang = readLangFromCookie();
//
// The dictionary is read once per process; the provider subscribes to a
// localStorage change event and re-renders. To avoid a hydration
// mismatch the provider also respects an explicit initialLang passed in
// from a server component, which is derived from the cookie that
// `app/layout.tsx` sets.

import type { Lang } from "./types";
export type { Lang, Dictionary } from "./types";
export { en } from "./en";
export { bn } from "./bn";

import { en } from "./en";
import { bn } from "./bn";

const DICTIONARIES = { en, bn } as const;

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "bn";
}

export function dictionary(lang: Lang) {
  return DICTIONARIES[lang];
}

export const SUPPORTED_LANGS: Lang[] = ["en", "bn"];

export const LANG_COOKIE = "loan-reminder:lang";
export const LANG_STORAGE_KEY = "loan-reminder:lang";
export const LANG_CHANGE_EVENT = "language:change";

/** Default lang when nothing is persisted. */
export const DEFAULT_LANG: Lang = "en";
