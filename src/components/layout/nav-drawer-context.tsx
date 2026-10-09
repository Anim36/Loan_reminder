"use client";

/**
 * NavDrawerContext — single client context for the mobile navigation
 * drawer's open/close state.
 *
 * The TopBar's hamburger button, the BottomTabBar's "More" tab and
 * the drawer itself all read/write the same boolean. The context
 * lives at the `(app)/layout.tsx` boundary so only the logged-in
 * shell subscribes — the marketing and auth routes don't pay for it.
 *
 * Clicking a nav item, the scrim or the X button closes the drawer;
 * the drawer also closes itself on route change (it watches
 * `usePathname()`) and when the viewport grows to `lg` or wider
 * (`matchMedia('(min-width: 1024px)')`).
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface NavDrawerContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  /** Imperative close — equivalent to `setOpen(false)` but reads
   *  better at the call site for route-change handlers. */
  close: () => void;
  /** Stable id used to wire `aria-controls` (hamburger / More tab) to
   *  the drawer dialog. */
  dialogId: string;
}

const NavDrawerContext = createContext<NavDrawerContextValue | null>(null);

export function NavDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);
  const setOpen = useCallback((next: boolean) => setOpenState(next), []);
  const close = useCallback(() => setOpenState(false), []);
  // A single id is used by all triggers; the dialog element picks it up
  // for `aria-labelledby` / `aria-controls`. We don't need useId here
  // because the provider is mounted exactly once at the layout level.
  const value = useMemo<NavDrawerContextValue>(
    () => ({ open, setOpen, close, dialogId: "nav-drawer" }),
    [open, setOpen, close],
  );
  return (
    <NavDrawerContext.Provider value={value}>
      {children}
    </NavDrawerContext.Provider>
  );
}

/** Hook used by the TopBar hamburger, the BottomTabBar "More" tab, and
 *  the drawer itself. Throws if used outside the provider — but every
 *  consumer is inside `(app)/layout.tsx`, which mounts the provider
 *  unconditionally. */
export function useNavDrawer(): NavDrawerContextValue {
  const ctx = useContext(NavDrawerContext);
  if (!ctx) {
    throw new Error(
      "useNavDrawer must be used inside <NavDrawerProvider> (mounted by src/app/(app)/layout.tsx).",
    );
  }
  return ctx;
}

/** `matchMedia` breakpoint used for the desktop sidebar / mobile
 *  drawer switch. Matches the Tailwind `lg` token (1024px). */
export const DESKTOP_NAV_BREAKPOINT = "(min-width: 1024px)";
