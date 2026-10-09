// Server-side i18n helpers.
//
// Use from a server component or `generateMetadata`:
//
//   import { getT } from "@/lib/i18n/server";
//   const t = await getT();
//   return { title: t("common.appName") };
//
// `getT` reads the language cookie via `cookies()` so the SSR render
// matches the client's preference. When the cookie is missing or
// unparseable the default (English) dictionary is returned.
//
// Why a callable and not a `Dictionary`: the dictionary is an
// object with function leaves for interpolation (e.g.
// `t("dashboard.activeLoans")(n)`). Exposing the `t()` callable
// form keeps the call sites identical between client (`useT()`)
// and server (`getT()`) components.

import { cookies } from "next/headers";
import {
  DEFAULT_LANG,
  LANG_COOKIE,
  dictionary,
  isLang,
  type Lang,
} from "./index";
import type { Dictionary } from "./types";
export type { Dictionary } from "./types";

/** Read the language cookie via Next's `cookies()` API. Falls back to
 *  the default language when the cookie is missing or unparseable. */
export async function readServerLang(): Promise<Lang> {
  const store = await cookies();
  const raw = store.get(LANG_COOKIE)?.value;
  return isLang(raw) ? raw : DEFAULT_LANG;
}

/**
 * Returns a `t` callable for the current request's language. The
 * signature is intentionally similar to `useT().t` so call sites
 * can swap easily.
 *
 * Usage:
 *   const t = await getT();
 *   <h1>{t("loans.title")}</h1>
 *   <p>{t("dashboard.activeLoans")(n)}</p>
 */
export async function getT(): Promise<TT> {
  const lang = await readServerLang();
  return makeT(lang);
}

/**
 * Returns the raw `Dictionary` for the current request's language —
 * useful for marketing / legal pages that index into the dictionary
 * (e.g. `t["common.appName"]`) rather than call it as a function.
 * Mirrors `getT()` for the same cookie.
 */
export async function getDict(): Promise<Dictionary> {
  const lang = await readServerLang();
  return dictionary(lang);
}

/** Same as `getT` but for an explicit language — useful in
 *  `generateMetadata` when you don't want an extra `cookies()`
 *  read. */
export function makeT(lang: Lang): TT {
  const dict = dictionary(lang);
  const t: TT = ((key: keyof Dictionary, ...args: unknown[]) => {
    const leaf = dict[key];
    if (typeof leaf === "function") {
      return (leaf as (...a: unknown[]) => string)(...args);
    }
    return leaf;
  }) as TT;
  return t;
}

/** Type alias for the `t` callable returned by `getT` / `makeT`. The
 *  overloads let the type checker treat string leaves and function
 *  leaves (with their respective argument types) differently. */
export interface TT {
  // Function leaves (with their own parameter list).
  <
    K extends {
      [P in keyof Dictionary]: Dictionary[P] extends (...a: never[]) => string
        ? P
        : never;
    }[keyof Dictionary],
  >(
    key: K,
    ...args: Parameters<Extract<Dictionary[K], (...a: never[]) => string>>
  ): string;
  // String leaves (no extra args).
  <
    K extends {
      [P in keyof Dictionary]: Dictionary[P] extends string ? P : never;
    }[keyof Dictionary],
  >(
    key: K,
  ): string;
}
