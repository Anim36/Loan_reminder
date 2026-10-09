"use client";

/**
 * TopBar — the persistent header on every logged-in page.
 *
 * Figma references:
 *   Dashboard Desktop 10:3868 / Top bar desktop 10:3888 (h=80, px=48)
 *   Dashboard Mobile  10:4024 / Top bar mobile  10:4026 (h=72, px=20)
 *   UI library 10:6506 (Top bar component)
 *
 * Layout
 *   Desktop (md+, ≥1024px search visible)
 *     Left:  page context — either a single DM Sans (font-semibold) title
 *            or a breadcrumb "Root / current" for nested routes. Below the
 *            lg breakpoint the search field is hidden.
 *     Right: bell → theme toggle → language switch (EN | বাং) → avatar
 *
 *   Mobile (<md, 390px)
 *     Left:  hamburger (mobile/tablet only) + page title that truncates
 *            gracefully via `truncate`.
 *     Right: bell, theme toggle, language switch, avatar. All elements
 *            are 36px / 40px hit targets and the search is hidden.
 *
 *   Very narrow (<390px, e.g. 360px Android) — the page title is
 *   hidden and the language switch swaps to its single-button
 *   compact variant so all five controls still fit on one row.
 *
 * Spacing follows the 8px grid (8/12/20). Height: 80px desktop, 72px
 * mobile. Background: surface, with a 1px border-bottom and a sticky
 * position. Z-index sits below the dialog/modal layer so overlays
 * still win.
 *
 * Sizing
 *   - Icon buttons: 36px square (size-9), rounded-pill hover ring.
 *   - Search input: 200px wide desktop, 280px on the lg variant.
 *   - Avatar: 36px, brand-600 initial, avatar-bg fill.
 */

import Link from "next/link";
import { Search } from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { ProfileMenu } from "./profile-menu";
import { HamburgerButton } from "./mobile-nav-drawer";
import { useTopBarContext } from "./use-topbar-context";
import { useT } from "@/lib/i18n/LanguageProvider";

export function TopBar({ className = "" }: { className?: string }) {
  const ctx = useTopBarContext();

  return (
    <header
      data-node-id="10:3888"
      className={[
        // Sticky shell — 80px desktop, 72px mobile. 1px border-bottom
        // on the surface token so it sits above the page background.
        "sticky top-0 z-20 flex w-full shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/95 backdrop-blur-sm",
        "h-[72px] px-4 md:h-20 md:px-8",
        className,
      ].join(" ")}
    >
      <LeftSide ctx={ctx} />
      <RightSide />
    </header>
  );
}

/* ---------------------------------------------------------------------------
 * Left side
 * ------------------------------------------------------------------------- */

function LeftSide({ ctx }: { ctx: ReturnType<typeof useTopBarContext> }) {
  const { t } = useT();
  if (ctx.kind === "crumb") {
    return (
      <nav
        aria-label={t["topbar.aria.breadcrumb"]}
        className="flex min-w-0 flex-1 items-center gap-2 overflow-clip"
      >
        {/* Mobile / tablet: hamburger opens the nav drawer. Hidden
            on lg+ where the fixed desktop sidebar is visible. */}
        <HamburgerButton className="lg:hidden" />

        <Link
          href={ctx.rootHref}
          className="hidden font-normal text-body text-muted hover:text-text md:inline-flex"
        >
          {ctx.root}
        </Link>
        <span
          aria-hidden
          className="hidden text-body text-placeholder md:inline-flex"
        >
          /
        </span>
        <h1 className="max-[389px]:hidden truncate font-semibold text-nav leading-[1.2] tracking-[-0.02em] text-text">
          {ctx.current}
        </h1>
      </nav>
    );
  }

  if (ctx.kind === "title") {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-clip">
        {/* Mobile / tablet: hamburger opens the nav drawer. Hidden
            on lg+ where the fixed desktop sidebar is visible. */}
        <HamburgerButton className="lg:hidden" />
        {/* Page title truncates by default; below 390px the
            segmented language control in the top bar needs the
            space, so the title is hidden. The brand mark in the
            drawer covers the "where am I" question instead. */}
        <span className="max-[389px]:hidden truncate font-semibold text-nav leading-[1.2] tracking-[-0.02em] text-text">
          {ctx.title}
        </span>
      </div>
    );
  }

  // Fallback: route not in the app shell — show the hamburger so the
  // user can still reach the drawer, and no page title.
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 overflow-clip">
      <HamburgerButton className="lg:hidden" />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Right side — bell, theme, language, avatar
 *
 * The order matches the spec: bell → theme → language → avatar.
 * Tighter gaps on mobile (8px), comfortable (10–12px) on desktop.
 * ------------------------------------------------------------------------- */

function RightSide() {
  const { t } = useT();
  return (
    <div
      role="toolbar"
      aria-label={t["topbar.aria.accountTools"]}
      data-node-id="10:3890"
      className="flex shrink-0 items-center gap-2 md:gap-2.5"
    >
      {/* Search — desktop only, hidden below lg (1024px). */}
      <DesktopSearch />

      <NotificationBell />
      <ThemeToggle />
      {/* Segmented language control at ≥390px; the single-button
          compact form is swapped in below 390px so the row still
          fits when there's no room for the segmented pair. */}
      <div className="max-[389px]:hidden">
        <LanguageSwitcher variant="segmented" />
      </div>
      <div className="hidden max-[389px]:block">
        <LanguageSwitcher variant="compact" />
      </div>
      <ProfileMenu />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Desktop search field. The current build has no real search yet —
 * this is a visual placeholder that mirrors the Figma node 10:3891
 * (200px wide with magnifier + "Search loans…" + ⌘K hint). When the
 * field is wired up later it slots in without touching the bar
 * layout.
 * ------------------------------------------------------------------------- */

function DesktopSearch() {
  const { t } = useT();
  return (
    <label
      data-node-id="10:3891"
      className="hidden h-9 w-[200px] items-center gap-2.5 rounded-pill border border-border bg-surface px-3 text-helper text-muted transition-colors hover:border-brand-600 lg:flex"
    >
      <Search className="size-[18px] shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{t["topbar.search"]}</span>
      <span className="shrink-0 whitespace-nowrap rounded-input border border-border px-1.5 py-0.5 text-badge font-semibold">
        ⌘K
      </span>
      <span className="sr-only">{t["ui.searchLoansPlaceholder"]}</span>
    </label>
  );
}
