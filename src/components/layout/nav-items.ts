// Single source of truth for the primary navigation.
//
// Reused by the desktop `Sidebar`, the mobile drawer, and the
// `BottomTabBar`'s "More" / "Settings" tab. Each entry carries:
//   - a stable href (and the route prefix it should match for
//     `aria-current` — so nested routes like /loans/[id] keep the
//     parent item highlighted),
//   - a Lucide icon (the same 20px icons used across all three
//     surfaces; the BottomTabBar renders them at 20px, the Sidebar /
//     Drawer at 20px too),
//   - a short label for the BottomTabBar (10px, English-only — Bangla
//     translations on a 10px label are unreadable) and a longer
//     dictionary key for the Sidebar / Drawer (13px, fully translated).
//
// Anything new that should appear in the logged-in shell — both at the
// desktop sidebar and the mobile drawer / "More" tab — must be added
// here. The BottomTabBar picks the first four items plus a
// "more"-tab entry that opens the drawer.

import {
  BarChart3,
  Bell,
  HandCoins,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  /** Route this item points to. */
  href: string;
  /** Prefix(es) that count as the active item. The first entry must
   *  equal `href`; the rest are matched with `startsWith`. */
  activePrefixes: string[];
  /** Lucide icon, rendered at 20px on all surfaces. */
  Icon: LucideIcon;
  /** Dictionary key for the long label (sidebar / drawer). */
  labelKey:
    | "nav.dashboard"
    | "nav.loans"
    | "nav.friends"
    | "nav.reminders"
    | "nav.reports"
    | "nav.settings";
  /** Short label for the BottomTabBar (no translation, kept short so
   *  the 10px label fits on a 360px phone). Falls back to `labelKey`
   *  if missing. */
  shortLabel: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/dashboard",
    activePrefixes: ["/dashboard"],
    Icon: LayoutDashboard,
    labelKey: "nav.dashboard",
    shortLabel: "Home",
  },
  {
    href: "/loans",
    activePrefixes: ["/loans"],
    Icon: HandCoins,
    labelKey: "nav.loans",
    shortLabel: "Loans",
  },
  {
    href: "/friends",
    activePrefixes: ["/friends"],
    Icon: Users,
    labelKey: "nav.friends",
    shortLabel: "Friends",
  },
  {
    href: "/reminders",
    activePrefixes: ["/reminders", "/notifications"],
    Icon: Bell,
    labelKey: "nav.reminders",
    shortLabel: "Alerts",
  },
  {
    href: "/reports",
    activePrefixes: ["/reports"],
    Icon: BarChart3,
    labelKey: "nav.reports",
    shortLabel: "Reports",
  },
  {
    href: "/settings",
    activePrefixes: ["/settings"],
    Icon: Settings,
    labelKey: "nav.settings",
    shortLabel: "Settings",
  },
];

/** Items the BottomTabBar surfaces directly. Everything else is hidden
 *  behind the "More" tab, which opens the drawer. The first four are
 *  the four tabs; the rest are reachable from inside the drawer. */
export const PRIMARY_TAB_ITEMS: readonly NavItem[] = NAV_ITEMS.slice(0, 4);

/** Pure helper: is `path` inside the given item's `activePrefixes`? */
export function isNavItemActive(item: NavItem, path: string): boolean {
  return item.activePrefixes.some(
    (p) => p === path || (p !== "/" && path.startsWith(p + "/")) || path === p,
  );
}
