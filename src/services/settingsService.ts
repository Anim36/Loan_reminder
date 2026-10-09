// User settings storage layer.
//
// When `NEXT_PUBLIC_API_URL` is set the functions below hit the
// `/settings/me` endpoint of the backend. When it's empty they fall
// back to a `localStorage`-backed store that matches the API contract.
//
// All exports are `async` so the call sites never branch on which
// backend is configured. SSR-safe.
//
// Storage versioning
// ------------------
// Stored data may be missing the `banglaNumerals` field (added in v1)
// or any of the three notification flags. `normalizeSettings` accepts
// any partial record and returns a fully-populated `UserSettings`
// deep-merged with `SEED`. The migrated result is written back so
// subsequent reads are a no-op. Corrupt or non-object JSON falls
// back to `SEED` without throwing.

import { API_ENABLED, apiGet, apiPatch, apiPut } from "@/lib/api";
import { hasWindow, readAndNormalize } from "./storage";

export type ThemeChoice = "light" | "dark" | "system";

export interface NotificationPrefs {
  emailOnPaid: boolean;
  emailOnOverdue: boolean;
  weeklySummary: boolean;
}

export interface UserSettings {
  /** Schema version — bump on every shape change. */
  __v: 2;
  /** User display name. Seeded with "Ayesha" so the demo reads right. */
  displayName: string;
  /** National digits; "+880" prefix is implied. */
  phone: string;
  email: string;
  theme: ThemeChoice;
  /** Use Bangla numerals (০-৯) for amounts and dates. Off by default. */
  banglaNumerals: boolean;
  notifications: NotificationPrefs;
}

const STORAGE_VERSION = 2;
const STORAGE_KEY = "loan-reminder:user-settings:v2";
const CHANGE_EVENT = "user-settings:change";

export const SEED: UserSettings = {
  __v: STORAGE_VERSION,
  displayName: "Ayesha",
  phone: "1712345678",
  email: "ayesha@example.com",
  theme: "light",
  banglaNumerals: false,
  notifications: {
    emailOnPaid: true,
    emailOnOverdue: true,
    weeklySummary: false,
  },
};

/* ---- Normalization ------------------------------------------------- */

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isTheme(v: unknown): v is ThemeChoice {
  return v === "light" || v === "dark" || v === "system";
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

/**
 * Normalize any historical shape of user settings into the current v2
 * record. Always returns a complete, ready-to-render object — never
 * `null`. Falls back to `SEED` for unrecognized / corrupt data.
 */
export function normalizeSettings(raw: unknown): UserSettings {
  if (!raw || typeof raw !== "object") return { ...SEED, notifications: { ...SEED.notifications } };
  const r = raw as Partial<UserSettings> & Record<string, unknown>;

  // Display name: never blank — fall back to SEED.
  const displayName = isString(r.displayName) && r.displayName.length > 0
    ? r.displayName
    : SEED.displayName;
  const phone = isString(r.phone) ? r.phone : SEED.phone;
  const email = isString(r.email) ? r.email : SEED.email;
  const theme = isTheme(r.theme) ? r.theme : SEED.theme;
  const banglaNumerals = isBoolean(r.banglaNumerals) ? r.banglaNumerals : SEED.banglaNumerals;

  // Notifications: deep merge with SEED so any missing field is filled.
  const n = (r.notifications ?? {}) as Partial<Record<keyof NotificationPrefs, unknown>>;
  const notifications: NotificationPrefs = {
    emailOnPaid: isBoolean(n.emailOnPaid) ? n.emailOnPaid : SEED.notifications.emailOnPaid,
    emailOnOverdue: isBoolean(n.emailOnOverdue) ? n.emailOnOverdue : SEED.notifications.emailOnOverdue,
    weeklySummary: isBoolean(n.weeklySummary) ? n.weeklySummary : SEED.notifications.weeklySummary,
  };

  return {
    __v: STORAGE_VERSION,
    displayName,
    phone,
    email,
    theme,
    banglaNumerals,
    notifications,
  };
}

/* ---- Read / write -------------------------------------------------- */

function readAll(): UserSettings {
  if (!hasWindow()) return cloneSeed();
  const normalized = readAndNormalize<UserSettings>(
    STORAGE_KEY,
    (raw) => normalizeSettings(raw),
    (a, b) => {
      if (a === b) return true;
      const aObj = a as Partial<UserSettings>;
      if (aObj.__v !== b.__v) return false;
      if (aObj.displayName !== b.displayName) return false;
      if (aObj.phone !== b.phone) return false;
      if (aObj.email !== b.email) return false;
      if (aObj.theme !== b.theme) return false;
      if (aObj.banglaNumerals !== b.banglaNumerals) return false;
      if (!aObj.notifications) return false;
      return (
        aObj.notifications.emailOnPaid === b.notifications.emailOnPaid &&
        aObj.notifications.emailOnOverdue === b.notifications.emailOnOverdue &&
        aObj.notifications.weeklySummary === b.notifications.weeklySummary
      );
    },
  );
  return normalized ?? cloneSeed();
}

function cloneSeed(): UserSettings {
  return {
    __v: STORAGE_VERSION,
    displayName: SEED.displayName,
    phone: SEED.phone,
    email: SEED.email,
    theme: SEED.theme,
    banglaNumerals: SEED.banglaNumerals,
    notifications: { ...SEED.notifications },
  };
}

function writeAll(settings: UserSettings): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...settings, __v: STORAGE_VERSION }),
    );
  } catch {
    // ignore — storage may be unavailable in private mode
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/* ---- Public API ----------------------------------------------------- */

/** Returns the current settings (SSR-safe). */
export async function getUserSettings(): Promise<UserSettings> {
  if (API_ENABLED) return apiGet<UserSettings>("/settings/me");
  return readAll();
}

/** Persists the full settings object. */
export async function saveUserSettings(
  settings: UserSettings,
): Promise<UserSettings> {
  // Defensive — re-normalize whatever the caller hands in so partial
  // or malformed saves never land in storage.
  const safe = normalizeSettings(settings);
  if (API_ENABLED) return apiPut<UserSettings>("/settings/me", safe);
  writeAll(safe);
  return safe;
}

/** Updates only the user-visible profile. */
export async function updateProfile(patch: {
  displayName?: string;
  phone?: string;
  email?: string;
}): Promise<UserSettings> {
  if (API_ENABLED) return apiPatch<UserSettings>("/settings/me/profile", patch);
  const next: UserSettings = { ...readAll(), ...patch, __v: STORAGE_VERSION };
  writeAll(next);
  return next;
}

/** Updates the theme preference. */
export async function updateTheme(theme: ThemeChoice): Promise<UserSettings> {
  if (API_ENABLED) return apiPatch<UserSettings>("/settings/me/theme", { theme });
  const next: UserSettings = { ...readAll(), theme, __v: STORAGE_VERSION };
  writeAll(next);
  return next;
}

/** Toggles Bangla numerals. */
export async function updateBanglaNumerals(
  enabled: boolean,
): Promise<UserSettings> {
  if (API_ENABLED) {
    return apiPatch<UserSettings>("/settings/me/bangla-numerals", {
      banglaNumerals: enabled,
    });
  }
  const next: UserSettings = { ...readAll(), banglaNumerals: enabled, __v: STORAGE_VERSION };
  writeAll(next);
  return next;
}

/** Updates the notification preferences. */
export async function updateNotificationPrefs(
  patch: Partial<NotificationPrefs>,
): Promise<UserSettings> {
  if (API_ENABLED) {
    return apiPatch<UserSettings>(
      "/settings/me/notifications",
      patch,
    );
  }
  const current = readAll();
  const next: UserSettings = {
    ...current,
    __v: STORAGE_VERSION,
    notifications: { ...current.notifications, ...patch },
  };
  writeAll(next);
  return next;
}

/** Pretends to change the password. The real auth flow lives elsewhere. */
export async function changePassword(args: {
  current: string;
  next: string;
}): Promise<{ ok: true }> {
  if (API_ENABLED) {
    await apiPut<{ ok: true }>("/settings/me/password", args);
    return { ok: true };
  }
  return { ok: true };
}

/** Pretends to delete the account. */
export async function deleteAccount(): Promise<{ ok: true }> {
  if (API_ENABLED) {
    await apiPut<{ ok: true }>("/settings/me/delete", {});
    return { ok: true };
  }
  return { ok: true };
}

/** Lets the rest of the app react to settings changes. */
export function subscribeUserSettings(handler: () => void): () => void {
  if (!hasWindow()) return () => {};
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
