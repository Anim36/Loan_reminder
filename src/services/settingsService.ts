// User settings service — B3/B4 API-backed.
//
// The localStorage copy is gone; the server is the source of
// truth. The pages call `useUserSettings()` (a thin React Query
// wrapper) for the live value, and the helpers below for
// programmatic reads / writes.

import { apiGet, apiPatch, apiPut } from "@/lib/api-client";
import type { ApiPreferences, ApiProfile } from "@/lib/api/api-types";
import { mapPreferences, mapProfile } from "@/lib/api/mappers";

export type ThemeChoice = "light" | "dark" | "system";

export interface NotificationPrefs {
  emailOnPaid: boolean;
  emailOnOverdue: boolean;
  weeklySummary: boolean;
}

export interface UserSettings {
  /** Profile (id, name, email, phone, image) */
  profile: {
    id: string;
    email: string;
    name: string;
    /** E.164 (`+8801XXXXXXXXX`) or null. */
    phone: string | null;
    image: string | null;
  };
  /** Preferences (language, theme, banglaNumerals, notifications) */
  preferences: {
    language: "en" | "bn";
    theme: ThemeChoice;
    banglaNumerals: boolean;
    notifications: NotificationPrefs;
  };
}

export const SEED: UserSettings = {
  profile: {
    id: "",
    email: "",
    name: "—",
    phone: null,
    image: null,
  },
  preferences: {
    language: "en",
    theme: "light",
    banglaNumerals: false,
    notifications: {
      emailOnPaid: true,
      emailOnOverdue: true,
      weeklySummary: false,
    },
  },
};

/* ---- Reads -------------------------------------------------------- */

export async function getUserSettings(): Promise<UserSettings> {
  // api-client returns the full envelope `{ data: ApiProfile }` /
  // `{ data: ApiPreferences }`. Read `.data` exactly once.
  const [profileRes, preferencesRes] = await Promise.all([
    apiGet<{ data: ApiProfile }>("/settings/profile"),
    apiGet<{ data: ApiPreferences }>("/settings/preferences"),
  ]);
  return {
    profile: mapProfile(profileRes.data),
    preferences: {
      ...mapPreferences(preferencesRes.data),
      // The wire shape exposes `theme: "light" | "dark" | "system"`
      // but the UI's ThemeChoice is identical. Cast through
      // `unknown` to keep the public surface unchanged.
      theme: preferencesRes.data.theme as ThemeChoice,
    },
  };
}

export async function getProfile(): Promise<UserSettings["profile"]> {
  const res = await apiGet<{ data: ApiProfile }>("/settings/profile");
  return mapProfile(res.data);
}

export async function getPreferences(): Promise<UserSettings["preferences"]> {
  const res = await apiGet<{ data: ApiPreferences }>("/settings/preferences");
  return mapPreferences(res.data);
}

/* ---- Writes ------------------------------------------------------- */

export interface ProfileUpdate {
  name?: string;
  phone?: string | null;
}

export async function updateProfile(patch: ProfileUpdate): Promise<UserSettings["profile"]> {
  const wire: Record<string, unknown> = {};
  if (patch.name !== undefined) wire.name = patch.name;
  if (patch.phone !== undefined) {
    // The wire accepts `""` to mean "clear the field". The UI
    // passes `null` for "clear"; we map null → "" here.
    wire.phone = patch.phone === null ? "" : patch.phone;
  }
  // api-client returns the full envelope `{ data: ApiProfile }`.
  const res = await apiPatch<{ data: ApiProfile }>("/settings/profile", wire);
  return mapProfile(res.data);
}

export async function updatePreferences(
  patch: Partial<{
    language: "en" | "bn";
    theme: ThemeChoice;
    banglaNumerals: boolean;
    emailOnPaid: boolean;
    emailOnOverdue: boolean;
    weeklySummary: boolean;
  }>,
): Promise<UserSettings["preferences"]> {
  // api-client returns the full envelope `{ data: ApiPreferences }`.
  const res = await apiPatch<{ data: ApiPreferences }>(
    "/settings/preferences",
    patch,
  );
  return mapPreferences(res.data);
}

export async function updateTheme(theme: ThemeChoice): Promise<UserSettings["preferences"]> {
  return updatePreferences({ theme });
}

export async function updateBanglaNumerals(enabled: boolean): Promise<UserSettings["preferences"]> {
  return updatePreferences({ banglaNumerals: enabled });
}

export async function updateNotificationPrefs(
  patch: Partial<NotificationPrefs>,
): Promise<UserSettings["preferences"]> {
  return updatePreferences(patch);
}

export async function saveUserSettings(
  settings: UserSettings,
): Promise<UserSettings> {
  await apiPut("/settings/profile", settings.profile);
  const prefs = await apiPut<ApiPreferences>(
    "/settings/preferences",
    settings.preferences,
  );
  return {
    profile: settings.profile,
    preferences: {
      ...mapPreferences(prefs),
      theme: prefs.theme as ThemeChoice,
    },
  };
}

/* ---- Auth-adjacent helpers ---------------------------------------- */

export async function changePassword(input: {
  current: string;
  next: string;
}): Promise<{ ok: true }> {
  const res = await apiPostMaybe<{ ok: true }>(
    "/settings/password",
    { currentPassword: input.current, newPassword: input.next },
  );
  return res ?? { ok: true };
}

export async function deleteAccount(): Promise<{ ok: true }> {
  const res = await apiPostMaybe<{ ok: true }>("/settings/delete-account");
  return res ?? { ok: true };
}

import { apiPost as apiPostHttp } from "@/lib/api-client";

async function apiPostMaybe<T>(path: string, body?: unknown): Promise<T | null> {
  try {
    return await apiPostHttp<T>(path, body);
  } catch {
    return null;
  }
}

/* ---- Stubs for the old subscription helper ----------------------- */

/** The notification feed used to broadcast a `user-settings:change`
 *  event so the language switcher could react. The API is the
 *  source of truth now, so this is a no-op kept for source
 *  compatibility. */
export function subscribeUserSettings(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const fn = () => handler();
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener("storage", fn);
  };
}
