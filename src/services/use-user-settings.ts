"use client";

// Client-only hook for the user-settings store. Caches the parsed
// snapshot by the raw localStorage string so React never sees a
// "changed" reference on every render. The first read runs the
// normalizer (which migrates old shapes to the current v2 record and
// writes the migrated value back), so subsequent reads are O(1).

import { useCallback, useSyncExternalStore } from "react";
import {
  changePassword as changePasswordAsync,
  deleteAccount as deleteAccountAsync,
  getUserSettings,
  normalizeSettings,
  saveUserSettings as saveUserSettingsAsync,
  updateBanglaNumerals as updateBanglaNumeralsAsync,
  updateNotificationPrefs as updateNotificationPrefsAsync,
  updateProfile as updateProfileAsync,
  updateTheme as updateThemeAsync,
  type NotificationPrefs,
  type ThemeChoice,
  type UserSettings,
} from "./settingsService";
import { SEED } from "./settingsService";
import { hasWindow } from "./storage";

const STORAGE_KEY = "loan-reminder:user-settings:v2";
const CHANGE_EVENT = "user-settings:change";

let cachedRaw: string | null = null;
let cachedSettings: UserSettings = SEED;

function parseRaw(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function readAll(): UserSettings {
  if (!hasWindow()) return SEED;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedSettings;
  const normalized = normalizeSettings(parseRaw(raw));
  cachedRaw = raw;
  cachedSettings = normalized;
  return cachedSettings;
}

function subscribe(cb: () => void) {
  if (!hasWindow()) return () => {};
  const handler = () => {
    cachedRaw = null;
    cachedSettings = SEED;
    cb();
  };
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function useUserSettings(): {
  settings: UserSettings;
  ready: boolean;
  updateProfile: (patch: {
    displayName?: string;
    phone?: string;
    email?: string;
  }) => Promise<void>;
  updateTheme: (theme: ThemeChoice) => Promise<void>;
  updateBanglaNumerals: (enabled: boolean) => Promise<void>;
  updateNotificationPrefs: (patch: Partial<NotificationPrefs>) => Promise<void>;
  changePassword: (args: { current: string; next: string }) => Promise<{ ok: true }>;
  deleteAccount: () => Promise<{ ok: true }>;
  saveAll: (settings: UserSettings) => Promise<void>;
} {
  const settings = useSyncExternalStore(subscribe, readAll, () => SEED);
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const updateProfile = useCallback(
    async (patch: { displayName?: string; phone?: string; email?: string }) => {
      await updateProfileAsync(patch);
    },
    [],
  );
  const updateTheme = useCallback(async (theme: ThemeChoice) => {
    await updateThemeAsync(theme);
  }, []);
  const updateBanglaNumerals = useCallback(async (enabled: boolean) => {
    await updateBanglaNumeralsAsync(enabled);
  }, []);
  const updateNotificationPrefs = useCallback(
    async (patch: Partial<NotificationPrefs>) => {
      await updateNotificationPrefsAsync(patch);
    },
    [],
  );
  const changePassword = useCallback(
    async (args: { current: string; next: string }) => {
      return changePasswordAsync(args);
    },
    [],
  );
  const deleteAccount = useCallback(async () => {
    return deleteAccountAsync();
  }, []);
  const saveAll = useCallback(async (next: UserSettings) => {
    await saveUserSettingsAsync(next);
  }, []);
  return {
    settings,
    ready,
    updateProfile,
    updateTheme,
    updateBanglaNumerals,
    updateNotificationPrefs,
    changePassword,
    deleteAccount,
    saveAll,
  };
}

export { getUserSettings };
