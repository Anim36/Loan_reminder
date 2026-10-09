"use client";

// Stable "today" hook — replaces the `useSyncExternalStore(() => new Date())`
// pattern that was triggering React's "getSnapshot should be cached" warning
// and an infinite render loop on /dashboard.
//
// Rules of `useSyncExternalStore`:
//   - `getSnapshot` must return a value that is `===` to its previous return
//     when nothing has changed. Returning a fresh `new Date()` every call
//     defeats this and causes an infinite render loop.
//   - `getServerSnapshot` must return a value that is `===` to its previous
//     return too — for the same reason.
//
// We therefore snapshot a **primitive**: the start-of-day timestamp in
// milliseconds. The Date object is derived in a `useMemo` outside the
// snapshot, so a re-render with the same primitive returns the same Date
// reference. `getServerSnapshot` returns the same module-level constant on
// every call (so the SSR markup is stable across renders and across builds).

import { useMemo, useSyncExternalStore } from "react";

/** Stable, build-time-stable "today" used for SSR markup. Picked to match
 *  the design's fixture so server-rendered dates don't change between
 *  builds. The client hook will swap in the real today after hydration. */
export const SSR_TODAY_MS = Date.UTC(2026, 9, 4);

const SERVER_SNAPSHOT = SSR_TODAY_MS;

/** Read the start-of-day ms on the client. Stable per calendar day: if
 *  `now` is still the same day as last call, return the cached value so
 *  React doesn't see a "changed" snapshot. */
let cachedDayMs = SSR_TODAY_MS;
let cachedDayKey = "";
function readStartOfDayMs(): number {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  const now = new Date();
  // YYYY-MM-DD is a cheap, day-stable key that ignores the time-of-day
  // component. Comparing strings avoids the Date arithmetic that was
  // previously allocating a fresh object per call.
  const key =
    `${now.getFullYear()}-` +
    `${String(now.getMonth() + 1).padStart(2, "0")}-` +
    `${String(now.getDate()).padStart(2, "0")}`;
  if (key !== cachedDayKey) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    cachedDayKey = key;
    cachedDayMs = d.getTime();
  }
  return cachedDayMs;
}

/** Subscribe once per app session: re-compute when the page regains
 *  visibility, the user crosses midnight while the tab is open, or
 *  the user focuses the window after a long background. */
const subscribe = (cb: () => void) => {
  if (typeof window === "undefined") return () => {};
  const onVisible = () => cb();
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onVisible);
  // Recompute every minute so a session open across midnight picks up
  // the new day without needing a refresh.
  const interval = setInterval(cb, 60_000);
  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", onVisible);
    clearInterval(interval);
  };
};

/**
 * Returns today's start-of-day Date object. Stable across renders on the
 * same day; updated when midnight rolls over.
 */
export function useToday(): Date {
  const todayMs = useSyncExternalStore(subscribe, readStartOfDayMs, () => SERVER_SNAPSHOT);
  // Derive the Date outside the snapshot so a re-render with the same
  // primitive returns the same Date reference (which is safe to pass
  // around without React seeing a "changed" value).
  return useMemo(() => new Date(todayMs), [todayMs]);
}