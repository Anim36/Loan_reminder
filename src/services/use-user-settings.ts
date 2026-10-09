"use client";

// `useUserSettings` — wraps the React Query user-settings
// hook with the public surface the Settings page uses:
//
//   { settings, ready, updateProfile, updateTheme,
//     updateBanglaNumerals, updateNotificationPrefs,
//     changePassword, deleteAccount, saveAll }
//
// Settings now live on the server; the localStorage cache is
// gone. The hook returns a `UserSettings` shape that the form
// code already consumes (top-level `displayName`, `phone`,
// `email`, `theme`, `banglaNumerals`, `notifications.*`).

import { useEffect } from "react";
import {
  useUserSettingsQuery,
  useUpdateProfileMutation,
  useUpdatePreferencesMutation,
  useChangePasswordMutation,
  useDeleteAccountMutation,
} from "./useQueries";
import { useT } from "@/lib/i18n/LanguageProvider";
import { useTheme } from "next-themes";

export type { NotificationPrefs, ThemeChoice, UserSettings } from "./settingsService";

/** Build the legacy flat settings shape the Settings page reads
 *  from localStorage. Maps the server's `profile.*` / `preferences.*`
 *  nesting back to the top-level `displayName` etc. fields. */
function flatten(s: ReturnType<typeof useUserSettingsQuery>["data"] | undefined) {
  const profile = s?.profile;
  const prefs = s?.preferences;
  return {
    displayName: profile?.name ?? "—",
    email: profile?.email ?? "",
    phone: (profile?.phone ?? "").replace(/^\+880/, ""),
    theme: prefs?.theme ?? "light",
    banglaNumerals: prefs?.banglaNumerals ?? false,
    notifications: {
      emailOnPaid: prefs?.notifications.emailOnPaid ?? true,
      emailOnOverdue: prefs?.notifications.emailOnOverdue ?? true,
      weeklySummary: prefs?.notifications.weeklySummary ?? false,
    },
  };
}

export function useUserSettings() {
  const q = useUserSettingsQuery();
  const updateProfile = useUpdateProfileMutation();
  const updatePrefs = useUpdatePreferencesMutation();
  const changePw = useChangePasswordMutation();
  const deleteAcct = useDeleteAccountMutation();
  const { setTheme } = useTheme();
  const { lang } = useT();
  // Mirror the persisted language to next-themes so a new tab
  // (and the SSR cookie-driven first paint) doesn't disagree
  // with the user-preference.
  useEffect(() => {
    if (lang) document.documentElement.lang = lang;
  }, [lang]);

  const settings = flatten(q.data);
  // Keep next-themes in sync with the persisted `theme`
  // preference so the first render is correct.
  useEffect(() => {
    if (!q.data) return;
    setTheme(q.data.preferences.theme === "system" ? "light" : q.data.preferences.theme);
  }, [q.data?.preferences.theme, setTheme, q.data]);

  return {
    settings,
    ready: !q.isPending,
    updateProfile: async (patch: {
      displayName?: string;
      phone?: string;
      email?: string;
    }) => {
      // The legacy form allows editing the email locally but
      // the B4 route doesn't expose an email update; the
      // server route is `PATCH /api/auth/me` which the
      // `authService.updateProfile` calls. We forward name +
      // phone; email edits are stored nowhere today.
      const out = await updateProfile.mutateAsync({
        name: patch.displayName,
        phone: patch.phone ? `+880${patch.phone.replace(/^0/, "").replace(/\D/g, "")}` : undefined,
      });
      return { ok: true as const, ...out };
    },
    updateTheme: async (theme: "light" | "dark" | "system") => {
      await updatePrefs.mutateAsync({ theme });
      setTheme(theme === "system" ? "light" : theme);
    },
    updateBanglaNumerals: async (enabled: boolean) => {
      await updatePrefs.mutateAsync({ banglaNumerals: enabled });
    },
    updateNotificationPrefs: async (
      patch: Partial<{
        emailOnPaid: boolean;
        emailOnOverdue: boolean;
        weeklySummary: boolean;
      }>,
    ) => {
      await updatePrefs.mutateAsync(patch);
    },
    changePassword: async (args: { current: string; next: string }) => {
      await changePw.mutateAsync(args);
      return { ok: true as const };
    },
    deleteAccount: async () => {
      await deleteAcct.mutateAsync();
      return { ok: true as const };
    },
    saveAll: async () => {
      // The legacy form used this to save the *whole* settings
      // object at once. Today we don't have a single endpoint
      // for that; the individual `update*` calls handle the
      // form's intent. This stub is kept so legacy imports
      // still compile.
    },
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
  };
}

export { getUserSettings } from "./settingsService";
