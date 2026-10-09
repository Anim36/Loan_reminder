"use client";

// Client-only hook that subscribes to the loan storage layer.
// Kept in its own file (with the "use client" directive) so the rest of
// @/services remains RSC-safe — the bare `loanService.ts` is imported
// from server components like the edit page.
//
// `getSnapshot` is cached by the raw localStorage string so React never
// sees a "changed" array reference on every render. The first read
// normalizes the stored array (which migrates v1/v2/old-v3 shapes to
// the current shape and writes the migrated value back), so
// subsequent reads return the same reference. The hook returns the
// raw loan list; consumers should derive the display-time status
// with `remapStatuses(loans, today)` in a `useMemo` against a stable
// `useToday()` so the loop is impossible.

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { SEED_LOANS } from "@/data";
import type { Loan } from "@/types";
import { normalizeLoan, remapStatuses } from "./loanService";
import { hasWindow, safeJsonParse } from "./storage";
import { useToday } from "@/lib/use-today";

const STORAGE_KEY = "loan-reminder:loans:v3";
const STORAGE_KEY_V2 = "loan-reminder:loans:v2";
const STORAGE_KEY_V1 = "loan-reminder:loans:v1";
const CHANGE_EVENT = "loans:change";

/** Unwrap a v3 envelope (`{ __v, items }`) or pass through a v1/v2
 *  bare array. Returns `null` for anything else. */
function unwrap(raw: unknown): Loan[] | null {
  if (Array.isArray(raw)) return raw as Loan[];
  if (raw && typeof raw === "object") {
    const items = (raw as Record<string, unknown>).items;
    if (Array.isArray(items)) return items as Loan[];
  }
  return null;
}

/** Cache the parsed snapshot by the raw storage string. The first
 *  call reads + parses; subsequent calls return the **same** array
 *  reference when the storage value hasn't changed. */
let cachedRaw: string | null = null;
let cachedLoans: Loan[] = SEED_LOANS;

function normalizeAndCache(raw: string | null): Loan[] {
  if (!raw) {
    cachedRaw = null;
    cachedLoans = SEED_LOANS;
    return cachedLoans;
  }
  const parsed = safeJsonParse<unknown>(raw);
  const arr = parsed ? unwrap(parsed) : null;
  if (!arr) {
    cachedRaw = raw;
    cachedLoans = SEED_LOANS;
    return cachedLoans;
  }
  const normalized = arr.map((l) => normalizeLoan(l as Partial<Loan> & { id: string }));
  // Persist the migrated form if anything changed, so the next
  // subscription tick (and any other reader) sees the canonical
  // v3 envelope.
  if (JSON.stringify(normalized) !== JSON.stringify(arr)) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ __v: 2, items: normalized }),
      );
    } catch {
      // ignore
    }
  }
  cachedRaw = raw;
  cachedLoans = normalized;
  return cachedLoans;
}

function readLoans(): Loan[] {
  if (!hasWindow()) return SEED_LOANS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw && cachedLoans) return cachedLoans;
  if (raw !== null) return normalizeAndCache(raw);
  // Fall through to the legacy keys. If any of them has data, the
  // background migration in `loanService.readAll` will write the v3
  // envelope next time something writes.
  const v2 = window.localStorage.getItem(STORAGE_KEY_V2);
  if (v2) return normalizeAndCache(v2);
  const v1 = window.localStorage.getItem(STORAGE_KEY_V1);
  if (v1) return normalizeAndCache(v1);
  cachedRaw = null;
  cachedLoans = SEED_LOANS;
  return cachedLoans;
}

function subscribe(cb: () => void) {
  if (!hasWindow()) return () => {};
  const handler = () => {
    cachedRaw = null;
    cb();
  };
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function useLoans(): {
  loans: Loan[];
  /** Same `loans`, but with `status` recomputed against `today`. */
  loansByStatus: Loan[];
  ready: boolean;
  refresh: () => void;
} {
  const loans = useSyncExternalStore(subscribe, readLoans, () => SEED_LOANS);
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const today = useToday();
  // `remapStatuses` only allocates new objects for loans whose status
  // actually changed. Memoising the array keeps the reference stable
  // for downstream consumers.
  const loansByStatus = useMemo(
    () => remapStatuses(loans, today),
    [loans, today],
  );
  const refresh = useCallback(() => {
    cachedRaw = null;
    if (hasWindow()) {
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
    }
  }, []);
  return { loans, loansByStatus, ready, refresh };
}
