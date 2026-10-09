"use client";

/**
 * Figma reference: Loan Reminder · Dashboard Mobile (10:4024)
 * BottomTabBar  node 10:4161 — 80px container, top border, 5 tabs
 *  • Per tab (10:4163/10:7167/etc): 20×20 icon + 10px label, gap 5px,
 *    flex-col items-center, regular weight
 *  • Active tab: brand-600 icon + brand-600 Semibold label
 *  • Default:   muted icon + muted regular label
 *  • Shown on mobile only; on lg+ the fixed Sidebar takes over
 *
 * The five tabs are: Dashboard · Loans · Friends · Reminders · More.
 * The 5th tab is a "More" tab (ellipsis icon) that opens the
 * `MobileNavDrawer` — Reports and Settings are reachable from there
 * (and from any other surface not directly represented in the four
 * primary tabs). The More tab is marked active when the current
 * route is /reports, /settings, or anything else not handled by the
 * first four tabs (e.g. /notifications, /friends/[id], /loans/[id]).
 */

import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";

import { useT } from "@/lib/i18n/LanguageProvider";
import {
  isNavItemActive,
  PRIMARY_TAB_ITEMS,
  type NavItem,
} from "./nav-items";
import { useNavDrawer } from "./nav-drawer-context";

const MORE_ICON = MoreHorizontal;

export function BottomTabBar() {
  const pathname = usePathname() ?? "";
  const { t } = useT();
  const { setOpen } = useNavDrawer();

  const anyPrimaryActive = PRIMARY_TAB_ITEMS.some((it) =>
    isNavItemActive(it, pathname),
  );

  return (
    <nav
      data-node-id="10:4161"
      aria-label={t["nav.aria.primary"]}
      className="flex h-20 shrink-0 items-start justify-around border-t border-border bg-surface pt-3 lg:hidden"
    >
      {PRIMARY_TAB_ITEMS.map((it) => (
        <PrimaryTab key={it.href} item={it} active={isNavItemActive(it, pathname)} />
      ))}
      <MoreTab active={!anyPrimaryActive} onOpen={() => setOpen(true)} label={t["nav.more"]} />
    </nav>
  );
}

/* ---------------------------------------------------------------------------
 * Primary tab — pure link, no drawer interaction.
 * ------------------------------------------------------------------------- */

function PrimaryTab({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <a
      href={item.href}
      aria-current={active ? "page" : undefined}
      data-node-id="10:4163"
      className="flex min-w-px flex-1 cursor-pointer flex-col items-center gap-[5px]"
    >
      <item.Icon
        aria-hidden="true"
        className={["size-5", active ? "text-brand-600" : "text-muted"].join(" ")}
      />
      <span
        className={[
          "whitespace-nowrap text-badge leading-[1.5]",
          active ? "font-semibold text-brand-600" : "font-normal text-muted",
        ].join(" ")}
      >
        {item.shortLabel}
      </span>
    </a>
  );
}

/* ---------------------------------------------------------------------------
 * More tab — opens the drawer. Active when no primary tab matches
 * (e.g. /reports, /settings, /notifications, /friends/[id], etc.).
 * ------------------------------------------------------------------------- */

function MoreTab({
  active,
  onOpen,
  label,
}: {
  active: boolean;
  onOpen: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={active ? "page" : undefined}
      data-node-id="10:7167"
      className="flex min-w-px flex-1 cursor-pointer flex-col items-center gap-[5px]"
    >
      <MORE_ICON
        aria-hidden="true"
        className={["size-5", active ? "text-brand-600" : "text-muted"].join(" ")}
      />
      <span
        className={[
          "whitespace-nowrap text-badge leading-[1.5]",
          active ? "font-semibold text-brand-600" : "font-normal text-muted",
        ].join(" ")}
      >
        {label}
      </span>
    </button>
  );
}
