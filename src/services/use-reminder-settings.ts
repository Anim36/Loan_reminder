"use client";

// `useReminderSettings` — wraps the React-Query reminder-settings
// hooks with the public surface the `/reminders` page already uses:
//
//   {
//     settings, ready,
//     setTone, updateTemplate, updateChannels, updateMessageLanguage,
//     saveAll,
//     isLoading, isError, error,
//   }
//
// Every mutation in this hook is a `PUT /api/reminders/settings` call
// with the *full* record. The server validates + merges defaults
// for any cell the user didn't change, so a partial update just
// reads the current row, applies the patch, and saves it back.

import {
  useReminderSettingsQuery,
  useSaveReminderSettingsMutation,
} from "./useQueries";
import { queryKeys } from "@/lib/queryKeys";
import { useQueryClient } from "@tanstack/react-query";
import type {
  ReminderSettings,
  ChannelDefaults,
  ToneTemplates,
} from "./reminderService";
import type { Tone, MessageLanguage } from "@/types/loan";

export type { ReminderSettings, ChannelDefaults, ToneTemplates, Tone, MessageLanguage };

export function useReminderSettings() {
  const q = useReminderSettingsQuery();
  const save = useSaveReminderSettingsMutation();
  const qc = useQueryClient();

  return {
    settings: (q.data ?? null) as ReminderSettings | null,
    ready: !q.isPending && !!q.data,
    setTone: async (tone: Tone) => {
      if (!q.data) return;
      const next: ReminderSettings = { ...q.data, tone };
      await save.mutateAsync(next);
    },
    updateTemplate: async (
      tone: Tone,
      lang: MessageLanguage,
      patch: Partial<ToneTemplates>,
    ) => {
      if (!q.data) return;
      const next: ReminderSettings = {
        ...q.data,
        templates: {
          ...q.data.templates,
          [tone]: {
            ...q.data.templates[tone],
            [lang]: { ...q.data.templates[tone][lang], ...patch },
          },
        },
      };
      await save.mutateAsync(next);
    },
    updateChannels: async (patch: Partial<ChannelDefaults>) => {
      if (!q.data) return;
      const next: ReminderSettings = {
        ...q.data,
        channels: { ...q.data.channels, ...patch },
      };
      await save.mutateAsync(next);
    },
    updateMessageLanguage: async (lang: MessageLanguage) => {
      if (!q.data) return;
      const next: ReminderSettings = { ...q.data, messageLanguage: lang };
      await save.mutateAsync(next);
    },
    saveAll: async (settings: ReminderSettings) => {
      await save.mutateAsync(settings);
    },
    invalidate: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.reminders.settings() });
    },
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
  };
}

export { getReminderSettings, normalizeSettings, saveReminderSettings } from "./reminderService";
