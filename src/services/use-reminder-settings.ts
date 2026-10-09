"use client";

// Client-only hook that subscribes to the reminder settings storage layer.
// Kept in its own file (with "use client") so the rest of @/services remains
// RSC-safe.
//
// `getSnapshot` is cached by the raw localStorage string. The settings
// object only changes when the underlying data changes — the normalizer
// (`normalizeSettings`) is called from `readAll()` and writes the
// migrated record back to storage the first time we see an old shape,
// so subsequent reads return the same reference.

import { useSyncExternalStore } from "react";
import type { MessageLanguage, Tone } from "@/types/loan";
import {
  getReminderSettings,
  normalizeSettings,
  saveReminderSettings,
  setTone as setToneAsync,
  updateChannels as updateChannelsAsync,
  updateMessageLanguage as updateMessageLanguageAsync,
  updateTemplate as updateTemplateAsync,
  type ChannelDefaults,
  type LocalizedTemplates,
  type ReminderSettings,
  type ToneTemplates,
} from "./reminderService";
import { hasWindow } from "./storage";

const STORAGE_KEY = "loan-reminder:settings:v2";
const CHANGE_EVENT = "reminder:change";

/** Cached snapshot — same object reference until the raw storage
 *  value changes. Prevents the "getSnapshot should be cached" loop
 *  in useSyncExternalStore. */
let cachedRaw: string | null = null;
let cachedSettings: ReminderSettings | null = null;

function readAll(): ReminderSettings {
  if (!hasWindow()) {
    // SSR: a fresh, fully-populated object each call is fine — the
    // server snapshot in useSyncExternalStore uses the dedicated
    // serverSnapshot function, not this one.
    return normalizeSettings(null);
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw && cachedSettings) return cachedSettings;
  const normalized = normalizeSettings(parseRaw(raw));
  cachedRaw = raw;
  cachedSettings = normalized;
  return normalized;
}

function parseRaw(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function subscribe(cb: () => void) {
  if (!hasWindow()) return () => {};
  const handler = () => {
    cachedRaw = null;
    cachedSettings = null;
    cb();
  };
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function useReminderSettings(): {
  settings: ReminderSettings;
  ready: boolean;
  setTone: (tone: Tone) => Promise<void>;
  updateTemplate: (
    tone: Tone,
    lang: MessageLanguage,
    patch: Partial<ToneTemplates>,
  ) => Promise<void>;
  updateChannels: (patch: Partial<ChannelDefaults>) => Promise<void>;
  updateMessageLanguage: (lang: MessageLanguage) => Promise<void>;
  saveAll: (settings: ReminderSettings) => Promise<void>;
} {
  const settings = useSyncExternalStore(
    subscribe,
    readAll,
    // Server snapshot — a fresh, fully-populated object is fine because
    // the server render is short-lived and the client takes over as
    // soon as hydration completes.
    () => normalizeSettings(null),
  );
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return {
    settings,
    ready,
    setTone: async (tone) => {
      await setToneAsync(tone);
    },
    updateTemplate: async (tone, lang, patch) => {
      await updateTemplateAsync(tone, lang, patch);
    },
    updateChannels: async (patch) => {
      await updateChannelsAsync(patch);
    },
    updateMessageLanguage: async (lang) => {
      await updateMessageLanguageAsync(lang);
    },
    saveAll: async (next) => {
      await saveReminderSettings(next);
    },
  };
}

export { getReminderSettings };
export type { LocalizedTemplates };
