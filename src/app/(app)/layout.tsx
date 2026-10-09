// Layout for all logged-in app routes (Dashboard, Loans, Reminders,
// Settings).
//
// Figma reference:  Dashboard Desktop (10:3868) — 224px sidebar + 80px top bar
//                   Dashboard Mobile  (10:4024) — 72px top bar + 80px bottom tabs
//
// Breakpoint: lg (1024px) and up uses the fixed desktop sidebar.
// Below lg, the sidebar is hidden, a hamburger button in the top bar
// opens the `MobileNavDrawer`, and a 5-tab `BottomTabBar` sits at
// the bottom of the viewport. The drawer's "More" tab is a
// `BottomTabBar` entry that opens the same drawer, so Reports and
// Settings are always reachable.
//
// `NavDrawerProvider` is the single source of truth for the drawer's
// open state; it is mounted here so both the TopBar's hamburger and
// the BottomTabBar's "More" tab can read / write it.
import { Suspense, type ReactNode } from "react";

import { NavDrawerProvider } from "@/components/layout/nav-drawer-context";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <NavDrawerProvider>
      <div className="min-h-dvh bg-bg text-text">
        <Sidebar />
        {/* Content column. The `lg:ml-56` (224px) offset matches the
            fixed desktop sidebar's width; below lg the sidebar is
            hidden so no offset is needed. The page itself is the
            only scroll surface; no nested scroll on <main>. */}
        <div className="flex min-h-dvh min-w-0 flex-col lg:ml-56">
          <TopBar />
          <main
            className="min-w-0 flex-1 pb-[calc(80px+env(safe-area-inset-bottom))] lg:pb-0"
          >
            {children}
          </main>
          <Suspense fallback={<div className="h-20 lg:hidden" />}>
            <BottomTabBar />
          </Suspense>
        </div>
        <MobileNavDrawer />
      </div>
    </NavDrawerProvider>
  );
}
