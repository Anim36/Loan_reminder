"use client";

// Helpers for translating API errors into user-facing copy.
//
// `ApiError.code` is a stable string the server picks. The
// frontend maps it through `errors.api.*` dictionary keys (or
// the explicit field-level key when present). The toast helper
// here shows the right message for the current language.

import { useCallback } from "react";
import { ApiError } from "@/lib/api-client";
import { useT } from "@/lib/i18n/LanguageProvider";
import { useToast } from "@/components/ui/toast-provider";
import type { Dictionary } from "@/lib/i18n/types";

/** Map an API error (or any thrown value) to a localized message
 *  via the `errors.api.*` keys. Returns the resolved string. */
export function translateApiError(
  t: Dictionary,
  err: unknown,
  fallbackKey: keyof Dictionary = "errors.api.server_error",
): string {
  if (err instanceof ApiError) {
    // Field-level errors (validation) — show the first field's
    // first message. Field keys are the wire field paths; the
    // dictionary already mirrors the API field names ("amount",
    // "phone", …).
    if (err.fields) {
      for (const list of Object.values(err.fields)) {
        if (list && list.length > 0) {
          const first = list[0];
          const dictKey = `errors.api.${first}` as keyof Dictionary;
          const v = t[dictKey];
          if (typeof v === "string") return v;
        }
      }
    }
    if (err.code) {
      const dictKey = `errors.api.${err.code}` as keyof Dictionary;
      const v = t[dictKey];
      if (typeof v === "string") return v;
    }
  }
  const v = t[fallbackKey];
  return typeof v === "string" ? v : "Something went wrong.";
}

/** Hook variant for components that need to translate inline
 *  (e.g. form-level errors). The Dictionary is read from the
 *  active LanguageProvider. */
export function useTranslateApiError(): (
  err: unknown,
  fallbackKey?: keyof Dictionary,
) => string {
  const { t } = useT();
  return useCallback(
    (err, fallbackKey) => translateApiError(t, err, fallbackKey),
    [t],
  );
}

/** Show a toast for an error using the `errors.api.*` mapping. */
export function useErrorToast(): (err: unknown) => void {
  const { t } = useT();
  const { show } = useToast();
  const translate = useCallback(
    (err: unknown) => translateApiError(t, err),
    [t],
  );
  return useCallback(
    (err: unknown) => show(translate(err)),
    [show, translate],
  );
}
