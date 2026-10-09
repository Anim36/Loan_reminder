"use client";

/**
 * Figma reference: Loan Reminder · Dashboard Desktop (10:3868)
 * Sidebar  nodes 10:3869 (Sidebar) / 10:3870 (Logo) / 10:3874 (Navigation)
 *            10:3875 (Active item) / 10:3878/10:3881/10:3884 (Default items)
 *  • 224px wide, white surface, 1px right border, padding 24
 *  • Logo: 32px brand-600 rounded-[10px] mark + "Loan Reminder" wordmark
 *  • Nav items: 12px radius, 14px padding, 12px gap between 20px icon and label
 *  • Active: brand-50 background + brand-600 text, semibold
 *  • Default: transparent + muted text, regular
 *
 * On screens below `lg` (1024px) the mobile `MobileNavDrawer` takes
 * over. We render this component unconditionally so the markup is
 * stable across breakpoints; visibility is controlled by Tailwind.
 */

import { SidebarBrand, SidebarContent } from "./sidebar-content";

export function Sidebar() {
  return (
    <aside
      data-node-id="10:3869"
      aria-label="Primary"
      className={[
        // Hidden on mobile / tablet — the mobile drawer takes over.
        "hidden lg:flex",
        // Pinned to the left of the viewport for its full height.
        "lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:h-dvh lg:w-56",
        // Surface styling: white card, 1px right border, 24px padding.
        "flex-col gap-10 border-r border-border bg-surface p-6",
        // Inner vertical scroll when the viewport is short. The
        // arbitrary-property utilities hide the WebKit / Firefox
        // scrollbar so the list looks like a static menu.
        "overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      ].join(" ")}
    >
      <div className="flex h-full flex-col gap-10">
        <SidebarBrand />
        <SidebarContent />
      </div>
    </aside>
  );
}
