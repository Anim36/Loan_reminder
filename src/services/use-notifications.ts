"use client";

// `useNotifications` — wraps the React Query notifications
// hook with the public surface the page already uses:
//
//   { notifications, unread, ready, markRead, markAllRead,
//     refresh, deleteNotification (no-op legacy), isLoading,
//     isError, error }
//
// The bell badge uses `useUnreadCountQuery` separately (a
// dedicated 30s poll) so it can update without rerunning the
// list query.

// (notifications hooks are read-only; no QueryClient needed here)
import {
  useNotificationsQuery,
  useUnreadCountQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
} from "./useQueries";
import { queryKeys } from "@/lib/queryKeys";
import type { Notification, NotificationKind } from "./notificationService";

export type { Notification, NotificationKind };

export function useNotifications() {
  const list = useNotificationsQuery();
  const unread = useUnreadCountQuery();
  const markReadM = useMarkReadMutation();
  const markAllM = useMarkAllReadMutation();
  return {
    notifications: (list.data ?? []) as Notification[],
    unread: unread.data ?? 0,
    ready: !list.isPending,
    markRead: (id: string) => markReadM.mutateAsync({ id }),
    markAllRead: () => markAllM.mutateAsync(),
    /** Legacy API: deletes a single notification. The B4
     *  routes don't expose a delete endpoint, so this is a
     *  no-op kept for source compatibility. */
    // Legacy delete API: kept for source compatibility. The B4
    // route does not expose a delete endpoint, so this is a no-op.
    deleteNotification: async () => undefined,
    refresh: () => {
      list.refetch();
      unread.refetch();
    },
    isLoading: list.isLoading,
    isError: list.isError,
    error: list.error,
  };
}

export { getNotifications, getUnreadCount } from "./useQueries";
export { useNotificationsQuery, useUnreadCountQuery } from "./useQueries";
export { queryKeys };
