"use client";

// Today context for the dashboard route. The page is a server
// component; this provider supplies a stable `today` Date object to
// the client tree below. The actual `new Date()` is read on the
// server during render and re-read in the client after mount, with
// no hydration mismatch because the value is treated as a hint, not
// a hard requirement.
//
// Why a context: pages like Dashboard, Loans list, and Reports each
// need `today` for relative-date copy. `useToday()` is the
// authoritative hook — this provider just makes it tree-shakeable
// from the server entry.

import { createContext, useContext, type ReactNode } from "react";
import { useToday } from "@/lib/use-today";

const TodayContext = createContext<Date | null>(null);

export function TodayProvider({ children }: { children: ReactNode }) {
  const today = useToday();
  return (
    <TodayContext.Provider value={today}>{children}</TodayContext.Provider>
  );
}

export function useDashboardToday(): Date {
  const v = useContext(TodayContext);
  return v ?? new Date();
}
