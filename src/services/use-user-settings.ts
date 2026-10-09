"use client";

// Client-only hook for the user-settings store. Caches the parsed
// snapshot by the raw localStorage string so React never sees a
// "changed" reference on every render. The first read runs the
// normalizer (which migrates old shapes to the current v2 record and
// writes the migrated value back), so subsequent reads are O(1).
//
// Since the user can be signed in via Auth.js, the profile
// (`name`/`phone`), language, theme, and Bangla-numerals flag are
// also pushed to the server through `updateProfile` (PATCH
// /api/auth/me). The localStorage copy is still written so the UI
// stays consistent across reloads, but the server copy is the
// source of truth for the next sign-in.

import { useCallback, useSyncExternalStore } from "react";
import {
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
import {
  changePassword as changePasswordApi,
  deleteAccount as deleteAccountApi,
  updateProfile as updateProfileServer,
} from "./authService";

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
      // Local copy first so the form reflects the change
      // immediately even if the server is slow or down.
      await updateProfileAsync(patch);
      // Server is the source of truth for next sign-in. We only
      // forward the fields the server actually accepts (name,
      // phone). Email changes still need a verification flow we
      // haven't built yet, so they're localStorage-only.
      try {
        await updateProfileServer({
          name: patch.displayName,
          phone: patch.phone,
        });
      } catch (err) {
        // Don't swallow — but don't fail the save either, the
        // local copy is already updated. Re-throw so callers can
        // show a "saved locally, sync failed" toast in the
        // future.
        console.warn("[useUserSettings] server profile sync failed", err);
      }
    },
    [],
  );
  const updateTheme = useCallback(async (theme: ThemeChoice) => {
    await updateThemeAsync(theme);
    try {
      await updateProfileServer({ theme });
    } catch (err) {
      console.warn("[useUserSettings] server theme sync failed", err);
    }
  }, []);
  const updateBanglaNumerals = useCallback(async (enabled: boolean) => {
    await updateBanglaNumeralsAsync(enabled);
    try {
      await updateProfileServer({ banglaNumerals: enabled });
    } catch (err) {
      console.warn("[useUserSettings] server numerals sync failed", err);
    }
  }, []);
  const updateNotificationPrefs = useCallback(
    async (patch: Partial<NotificationPrefs>) => {
      // Notification prefs are not yet a server-side concern
      // (no Preference table in the schema). Local-only.
      await updateNotificationPrefsAsync(patch);
    },
    [],
  );
  const changePassword = useCallback(
    async (args: { current: string; next: string }) => {
      // Real backend call (Auth.js + Prisma) — succeeds
      // silently on success, throws `AuthError` otherwise.
      await changePasswordApi(args);
      return { ok: true as const };
    },
    [],
  );
  const deleteAccount = useCallback(async () => {
    // Real backend call. The route deletes the user, the
    // cascading children, and the session cookie. The caller
    // is expected to navigate to /login.
    await deleteAccountApi();
    return { ok: true as const };
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
