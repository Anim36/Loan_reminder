"use client";

/**
 * useTopBarContext — derives the page context that the persistent top
 * bar shows on its left side. The result is one of:
 *
 *   - `{ kind: "title", title }`           — a single page title.
 *   - `{ kind: "crumb", root, current }`   — a "Loans / Rafi" breadcrumb
 *                                            for nested routes.
 *   - `{ kind: "none" }`                   — route is not in the
 *                                            logged-in app shell.
 *
 * The hook reads the active path from `usePathname()` and the live
 * loan list from `useLoans()`. For dynamic segments like `/loans/[id]`
 * it looks up the loan's `friend.name`.
 */

import { usePathname } from "next/navigation";
import { useLoans } from "@/services/use-loans";

export type TopBarContext =
  | { kind: "title"; title: string }
  | { kind: "crumb"; root: string; rootHref: string; current: string }
  | { kind: "none" };

// Single source of truth for the page title in each section. Static
// titles resolve without touching the loans store; dynamic routes
// (/loans/[id], /friends/[id], /loans/[id]/edit) pull the name from
// the live data.
const STATIC_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/loans": "Loans",
  "/loans/new": "Add a loan",
  "/friends": "Friends",
  "/reminders": "Reminders",
  "/reminders/history": "Reminder history",
  "/notifications": "Notifications",
  "/reports": "Reports",
  "/settings": "Settings",
};

const CRUMB_ROOTS: Array<{ prefix: string; root: string; rootHref: string }> = [
  { prefix: "/loans/", root: "Loans", rootHref: "/loans" },
  { prefix: "/friends/", root: "Friends", rootHref: "/friends" },
  { prefix: "/reminders/", root: "Reminders", rootHref: "/reminders" },
];

export function useTopBarContext(): TopBarContext {
  const pathname = usePathname() ?? "";
  const { loans } = useLoans();

  // Static title routes
  const staticTitle = STATIC_TITLES[pathname];
  if (staticTitle) return { kind: "title", title: staticTitle };

  // Dynamic breadcrumb routes
  for (const { prefix, root, rootHref } of CRUMB_ROOTS) {
    if (pathname.startsWith(prefix)) {
      const segments = pathname.split("/").filter(Boolean);
      const id = segments[1] ?? "";
      if (id === "new") {
        return { kind: "title", title: "Add a loan" };
      }
      if (id === "edit") {
        const loanId = segments[1] ?? "";
        const loan = loans.find((l) => l.id === loanId);
        const current = loan?.friend.name ?? "Edit loan";
        return { kind: "crumb", root, rootHref, current };
      }
      if (prefix === "/loans/") {
        const loan = loans.find((l) => l.id === id);
        const friendName = loan?.friend.name ?? "Friend";
        return { kind: "crumb", root, rootHref, current: friendName };
      }
      if (prefix === "/friends/") {
        const friend = loans.find((l) => l.friend.id === id)?.friend;
        return {
          kind: "crumb",
          root,
          rootHref,
          current: friend?.name ?? "Friend",
        };
      }
      return { kind: "title", title: root };
    }
  }

  return { kind: "none" };
}