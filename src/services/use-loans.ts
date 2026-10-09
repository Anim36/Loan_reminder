"use client";

// `useLoans` — thin wrapper around `useLoansQuery` that
// keeps the same public surface the pages already expect:
//
//   { loans, loansByStatus, ready, refresh }
//
// `loansByStatus` is `loans` with `status` re-derived against
// `useToday()`. `ready` is `true` once the first fetch has
// settled (success or empty), `false` on the initial load.
//
// This file is the only `use-loans` import most pages need;
// the new React Query primitives live in `./useQueries`.

import { useMemo } from "react";
import { useLoansQuery } from "./useQueries";
import { useToday } from "@/lib/use-today";
import { remapStatuses } from "./loanService";
import { queryKeys } from "@/lib/queryKeys";
import type { Loan } from "@/types/loan";

export function useLoans(filters: Parameters<typeof useLoansQuery>[0] = {}) {
  const q = useLoansQuery(filters);
  const today = useToday();
  // `remapStatuses` only allocates a new array when something
  // actually changed. Memoising on the upstream reference keeps
  // the list stable for downstream consumers.
  const loansByStatus = useMemo(
    () => remapStatuses(q.data ?? [], today),
    [q.data, today],
  );
  // `ready` mirrors React Query's "is initial fetch done" flag
  // for callers that previously read it from
  // useSyncExternalStore.
  const ready = !q.isPending;
  return {
    loans: (q.data ?? []) as Loan[],
    loansByStatus,
    ready,
    // `refresh` is kept for the small set of pages that wired
    // to it; it just invalidates the query.
    refresh: () => q.refetch(),
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
  };
}

/* Re-export so `useFriendsQuery` and friends are importable
 * alongside the legacy hook. */
export { useLoansQuery } from "./useQueries";
export { queryKeys };
