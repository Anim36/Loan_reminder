"use client";

/**
 * MobileNavDrawer — the slide-in navigation panel for screens below
 * `lg` (1024px). The desktop `Sidebar` covers the same area on
 * `lg+`; this drawer is the mobile / tablet equivalent and is mounted
 * by `(app)/layout.tsx` unconditionally (it's only visible when the
 * context's `open` flag is `true`).
 *
 * Behaviour:
 *   - Slides in from the left (translateX, 200ms ease-out) on mobile.
 *     When `prefers-reduced-motion: reduce` is set the slide is
 *     replaced with a fade.
 *   - Width is `min(288px, 85vw)`, full viewport height.
 *   - Surface background, 1px right border, `shadow-overlay`.
 *   - Scrim uses the existing `--color-scrim` token with a fade.
 *   - Closes on: scrim click, ESC, X button, any nav item, route
 *     change, viewport reaching `lg`.
 *   - Body scroll is locked while open; restored on close + on
 *     unmount.
 *   - Focus trap inside the dialog; focus moves to the close button
 *     on open and returns to the hamburger on close.
 *   - `role="dialog"`, `aria-modal="true"`, `aria-label="Main
 *     navigation"`.
 *
 * The drawer body hosts a `SidebarContent` (the same nav list used by
 * the desktop sidebar) plus a footer with the persona's avatar, name,
 * email and a "Log out" button. The theme toggle and language switch
 * are not duplicated here — they live in the TopBar (and in Settings
 * > Appearance) so this footer stays focused on the user's account.
 */

import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { Avatar } from "@/components/ui/avatar";
import { useT } from "@/lib/i18n/LanguageProvider";
import { useSessionUser } from "@/hooks/use-session-user";
import { signOut } from "@/services/authService";
import { SidebarBrand, SidebarContent } from "./sidebar-content";
import {
  DESKTOP_NAV_BREAKPOINT,
  useNavDrawer,
} from "./nav-drawer-context";

// `SidebarContent` re-renders the same logo + nav links. The drawer's
// top row is therefore just the brand + close button.

/* ---------------------------------------------------------------------------
 * Drawer
 * ------------------------------------------------------------------------- */

export function MobileNavDrawer() {
  const { open, close, dialogId } = useNavDrawer();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useT();
  const titleId = `${dialogId}-title`;

  // Refs for focus management.
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  /* ---- Close on route change --------------------------------------
   * The TopBar / BottomTabBar already route-change-close via the
   * `<Link>`'s onClick, but if the user uses the back button or
   * programmatic navigation, we still want the drawer to close. */
  useEffect(() => {
    if (open) close();
    // We only want to react to `pathname` changes; `close` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /* ---- Close when viewport grows to lg+ -------------------------- */
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const mql = window.matchMedia(DESKTOP_NAV_BREAKPOINT);
    function onChange(e: MediaQueryListEvent) {
      if (e.matches) close();
    }
    // Modern browsers add `addEventListener`; Safari ≤13 uses
    // `addListener` — guard both.
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, [open, close]);

  /* ---- Body scroll lock -------------------------------------------
   * We toggle `overflow-hidden` on `<body>` while the drawer is open.
   * The previous value is restored on close / unmount so a parent
   * (e.g. the marketing nav) isn't affected. */
  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  /* ---- Focus management -------------------------------------------
   * On open: remember the trigger, focus the close button.
   * On close: restore focus to the trigger.
   * On unmount: also restore (covers the "drawer unmounts while open"
   * edge case during route changes). */
  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // Wait a tick so the dialog has mounted.
    const id = window.requestAnimationFrame(() => {
      closeBtnRef.current?.focus();
    });
    return () => {
      window.cancelAnimationFrame(id);
      const prev = previouslyFocused.current;
      // Only restore if the document still has focus inside our app.
      if (prev && typeof prev.focus === "function") prev.focus();
      previouslyFocused.current = null;
    };
  }, [open]);

  /* ---- Focus trap -------------------------------------------------
   * Cycle Tab / Shift+Tab through the focusable elements inside the
   * dialog. If focus somehow escapes (e.g. screen reader navigation),
   * pull it back on the next keypress. */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  /* ---- Log out handler -------------------------------------------- */
  const handleLogOut = useCallback(() => {
    close();
    void signOut().finally(() => {
      router.push("/login");
      router.refresh();
    });
  }, [close, router]);

  // Render nothing when closed. The drawer mounts the dialog only
  // when it opens so the focus trap + body lock don't fight the
  // desktop sidebar at lg+.
  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      id={dialogId}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-state={open ? "open" : "closed"}
      className="fixed inset-0 z-[60] lg:hidden"
    >
      {/* Scrim — click to close, fade in. */}
      <button
        type="button"
        aria-label={t["nav.closeMenu"]}
        onClick={close}
        className="nav-drawer-scrim absolute inset-0 h-full w-full cursor-default bg-[var(--color-scrim)]"
        tabIndex={-1}
      />

      {/* Drawer panel. */}
      <div
        className="nav-drawer-panel absolute left-0 top-0 flex h-dvh w-[min(288px,85vw)] flex-col border-r border-border bg-surface shadow-overlay"
        // The animation is defined in globals.css under the
        // `nav-drawer-*` keyframes; the `data-state` attribute above
        // is the hook for both keyframe targets (scrim opacity, panel
        // translateX). `prefers-reduced-motion` swaps the keyframe
        // for a fade.
      >
        {/* Header — brand + close. */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-6 py-5">
          <span id={titleId} className="sr-only">
            {t["nav.mainNavigation"]}
          </span>
          <SidebarBrand href="/dashboard" />
          <button
            ref={closeBtnRef}
            type="button"
            onClick={close}
            aria-label={t["nav.closeMenu"]}
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[12px] text-muted transition-colors hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        {/* Body — the shared nav list. The `flex-1` + `overflow-y-auto`
            + hidden scrollbar keep the list scrollable on short
            viewports while the footer stays pinned to the bottom. */}
        <div className="flex w-full min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SidebarContent ariaLabelledBy={titleId} />
        </div>

        {/* Footer — pinned bottom, respects iOS safe area. */}
        <DrawerFooter onLogOut={handleLogOut} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Drawer footer
 * ------------------------------------------------------------------------- */

function DrawerFooter({ onLogOut }: { onLogOut: () => void }) {
  const { t } = useT();
  const { user } = useSessionUser();
  // The session is always present for `(app)` routes — the
  // proxy guards them — but render a graceful fallback so a
  // sign-out round-trip doesn't show hardcoded placeholders.
  const displayName = user?.name ?? "—";
  const displayEmail = user?.email ?? "";
  return (
    <div
      className="shrink-0 border-t border-border bg-surface px-6 pt-5"
      style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-3">
        <Avatar name={displayName} size={40} />
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate font-semibold text-body text-text">
            {displayName}
          </span>
          <span className="truncate font-normal text-helper text-muted">
            {displayEmail}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onLogOut}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-input border border-transparent bg-surface px-[18px] py-[11px] text-label font-semibold text-text transition-colors hover:bg-brand-50 hover:text-brand-600 cursor-pointer"
      >
        <LogOut size={18} aria-hidden />
        {t["nav.logOut"]}
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * HamburgerButton — the trigger used in the TopBar. Lives here (not in
 * the TopBar file) so the same trigger can be reused from the
 * BottomTabBar's "More" tab.
 * ------------------------------------------------------------------------- */

export function HamburgerButton({ className = "" }: { className?: string }) {
  const { open, setOpen, dialogId } = useNavDrawer();
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-label={t["nav.openMenu"]}
      aria-expanded={open}
      aria-controls={dialogId}
      className={[
        "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[12px] text-muted transition-colors hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
        className,
      ].join(" ")}
    >
      <Menu size={20} aria-hidden />
    </button>
  );
}
