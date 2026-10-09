// Stable query keys for React Query.
//
// Centralised so two consumers can't disagree on the shape of
// "loans" and accidentally cache-bust themselves.

export const queryKeys = {
  loans: {
    all: ["loans"] as const,
    list: (filters: Record<string, unknown> = {}) =>
      ["loans", "list", filters] as const,
    byId: (id: string) => ["loans", "detail", id] as const,
  },
  friends: {
    all: ["friends"] as const,
    list: (filters: Record<string, unknown> = {}) =>
      ["friends", "list", filters] as const,
    byId: (id: string) => ["friends", "detail", id] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: (filters: Record<string, unknown> = {}) =>
      ["notifications", "list", filters] as const,
    unread: () => ["notifications", "unread-count"] as const,
  },
  dashboard: {
    summary: () => ["dashboard", "summary"] as const,
  },
  reports: {
    byRange: (range: string) => ["reports", range] as const,
  },
  reminders: {
    history: (filters: Record<string, unknown> = {}) =>
      ["reminders", "history", filters] as const,
    settings: () => ["reminders", "settings"] as const,
  },
  settings: {
    profile: () => ["settings", "profile"] as const,
    preferences: () => ["settings", "preferences"] as const,
  },
  me: () => ["me"] as const,
};

/** Invalidate everything that depends on the user's loans + counts. */
export function loanMutationInvalidator(qc: {
  invalidateQueries: (q: { queryKey: readonly unknown[] }) => void;
}) {
  qc.invalidateQueries({ queryKey: queryKeys.loans.all });
  qc.invalidateQueries({ queryKey: queryKeys.friends.all });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
  qc.invalidateQueries({ queryKey: ["reports"] });
  qc.invalidateQueries({ queryKey: queryKeys.reminders.history() });
  qc.invalidateQueries({ queryKey: queryKeys.notifications.unread() });
}

/** Invalidate only the friend's aggregates (not the full loan list). */
export function friendMutationInvalidator(qc: {
  invalidateQueries: (q: { queryKey: readonly unknown[] }) => void;
}) {
  qc.invalidateQueries({ queryKey: queryKeys.friends.all });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
}
