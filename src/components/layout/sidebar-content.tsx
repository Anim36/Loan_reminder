"use client";

/**
 * SidebarContent — the shared nav list + brand mark used by both the
 * desktop `Sidebar` and the mobile `MobileNavDrawer`. The two surfaces
 * differ only in their outer chrome (fixed sidebar vs slide-in drawer
 * with a close button); the navigation itself is identical.
 *
 * Visual contract (matches the existing Figma `Sidebar` node 10:3869):
 *   - 224px-ish wide, surface background, 24px padding.
 *   - Logo: 32px brand-600 rounded-[10px] mark + DM Sans 17px
 *     semibold "Loan Reminder" wordmark.
 *   - Nav items: 12px radius, 14px horizontal padding, 14px vertical
 *     padding (≥48px total hit area on mobile), 12px gap between
 *     20px Lucide icon and label.
 *   - Active: brand-50 background + brand-600 text, semibold.
 *   - Default: transparent + muted text, regular, hover → text colour.
 *
 * The component renders the `<nav>` only — the parent supplies the
 * `aria-label` and any extra chrome (the close X on the drawer).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HandCoins } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { isNavItemActive, NAV_ITEMS } from "./nav-items";

export interface SidebarContentProps {
  /**
   * ID of the element that labels this navigation region (used by the
   * drawer as the `aria-labelledby` target for the dialog).
   */
  ariaLabelledBy?: string;
}

export function SidebarContent({ ariaLabelledBy }: SidebarContentProps) {
  const pathname = usePathname() ?? "";
  const { t } = useT();
  return (
    <nav
      aria-label={t["nav.aria.primary"]}
      aria-labelledby={ariaLabelledBy}
      className="flex w-full min-w-0 flex-1 flex-col gap-2"
    >
      {NAV_ITEMS.map((item) => {
        const active = isNavItemActive(item, pathname);
        const label = t[item.labelKey];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={[
              // 14px horizontal padding + 14px vertical padding gives a
              // 48px tap target on mobile even before any padding tweak.
              "flex w-full min-w-0 items-center gap-3 overflow-clip rounded-[12px] px-[14px] py-[14px] text-label leading-6",
              active
                ? "bg-brand-50 font-semibold text-brand-600"
                : "bg-transparent font-normal text-muted hover:text-text",
            ].join(" ")}
          >
            <item.Icon className="size-5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Brand mark + wordmark. Used at the top of the desktop Sidebar and
 * the mobile drawer header. Stays identical so the two surfaces feel
 * like the same component.
 */
export function SidebarBrand({ href = "/dashboard" }: { href?: string }) {
  const { t } = useT();
  return (
    <Link
      href={href}
      className="flex shrink-0 items-center gap-2.5"
      aria-label={t["nav.aria.brandHome"]}
    >
      <span
        className="flex size-8 items-center justify-center overflow-clip rounded-[10px] bg-brand-600"
        aria-hidden="true"
      >
        <HandCoins className="size-5 text-white" />
      </span>
      <span className="whitespace-nowrap font-semibold text-nav leading-6 text-text">
        {t["common.appName"]}
      </span>
    </Link>
  );
}
