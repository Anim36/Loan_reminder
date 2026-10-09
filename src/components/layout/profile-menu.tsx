"use client";

/**
 * ProfileMenu — the rightmost element in the top bar. An avatar
 * initial that opens a dropdown with the user's name/email header,
 * three route links, a divider, and a "Log out" button.
 *
 * Keyboard / a11y:
 *   - `aria-haspopup="menu"` + `aria-expanded` on the trigger.
 *   - Arrow Up/Down moves focus through the menu items.
 *   - Enter / Space activates the focused item.
 *   - Escape closes and returns focus to the trigger.
 *   - Click outside closes.
 *   - Route change closes (pathname subscription).
 *
 * The avatar initial is the first character of the user's name
 * (from the session). When the user is signed out (which can
 * happen briefly during a sign-out round-trip), the trigger
 * renders nothing rather than a hardcoded placeholder.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { BarChart3, LogOut, Settings, History } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { useSessionUser } from "@/hooks/use-session-user";
import { signOut } from "@/services/authService";

type LinkItem = { kind: "link"; href: string; label: string; icon: typeof Settings };
type ActionItem = { kind: "action"; label: string; icon: typeof LogOut };
type MenuItem = LinkItem | ActionItem;

export function ProfileMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useT();
  const { user } = useSessionUser();
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);
  const menuId = useId();

  const items: MenuItem[] = [
    {
      kind: "link",
      href: "/settings",
      label: t["topbar.profileAndSettings"],
      icon: Settings,
    },
    {
      kind: "link",
      href: "/reminders/history",
      label: t["topbar.reminderHistory"],
      icon: History,
    },
    {
      kind: "link",
      href: "/reports",
      label: t["topbar.reports"],
      icon: BarChart3,
    },
    {
      kind: "action",
      label: t["nav.logOut"],
      icon: LogOut,
    },
  ];

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    setFocusIdx(-1);
    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  // Close on route change. `pathname` is a primitive so this only
  // fires when the route actually changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
    setFocusIdx(-1);
  }, [pathname]);

  // Outside click + ESC.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
        setFocusIdx(-1);
      }
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  // When the menu opens, focus the first item so arrow keys work.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFocusIdx(0);
    const id = requestAnimationFrame(() => itemRefs.current[0]?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  function onMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = (focusIdx + 1) % items.length;
      setFocusIdx(next);
      itemRefs.current[next]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = (focusIdx - 1 + items.length) % items.length;
      setFocusIdx(next);
      itemRefs.current[next]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      setFocusIdx(0);
      itemRefs.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      const last = items.length - 1;
      setFocusIdx(last);
      itemRefs.current[last]?.focus();
    } else if (e.key === "Tab") {
      // Tab closes the menu and lets the browser move focus naturally.
      setOpen(false);
    }
  }

  async function handleLogOut() {
    close(false);
    await signOut();
    router.push("/login");
    router.refresh();
  }

  // No user → don't render the trigger. The proxy guarantees
  // `(app)` routes always have a session, but a brief window
  // after sign-out can leave the TopBar mounted without a user.
  if (!user) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${t["topbar.profileMenu"]}, ${user.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-9 items-center justify-center overflow-clip rounded-pill bg-avatar-bg transition-colors hover:ring-2 hover:ring-brand-ring focus-visible:ring-2 focus-visible:ring-brand-600"
      >
        <span className="whitespace-nowrap text-label font-semibold leading-6 text-brand-600">
          {user.initial}
        </span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={t["topbar.profileMenu"]}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-64 overflow-hidden rounded-card border border-border bg-surface shadow-overlay"
        >
          {/* Header — name + email */}
          <div className="flex flex-col gap-0.5 border-b border-border bg-surface px-4 py-3">
            <p className="font-semibold text-body text-text">{user.name}</p>
            <p className="font-normal text-helper text-muted">{user.email}</p>
          </div>

          {/* Items */}
          <ul role="none" className="flex flex-col gap-0.5 p-1.5">
            {items.map((item, idx) => {
              const Icon = item.icon;
              if (item.kind === "link") {
                return (
                  <li key={item.href} role="none">
                    <Link
                      ref={(el) => {
                        itemRefs.current[idx] = el;
                      }}
                      href={item.href}
                      role="menuitem"
                      tabIndex={focusIdx === idx ? 0 : -1}
                      onClick={() => close(false)}
                      className="flex w-full items-center gap-2.5 rounded-input px-3 py-2 font-medium text-body text-text transition-colors hover:bg-brand-50 hover:text-brand-600 focus-visible:bg-brand-50 focus-visible:text-brand-600 focus-visible:outline-none"
                    >
                      <Icon className="size-[18px] shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1">{item.label}</span>
                    </Link>
                  </li>
                );
              }
              // Log out
              return (
                <li
                  key="__logout__"
                  role="none"
                  className="mt-1.5 border-t border-border pt-1.5"
                >
                  <button
                    ref={(el) => {
                      itemRefs.current[idx] = el;
                    }}
                    type="button"
                    role="menuitem"
                    tabIndex={focusIdx === idx ? 0 : -1}
                    onClick={handleLogOut}
                    className="flex w-full items-center gap-2.5 rounded-input px-3 py-2 font-medium text-body text-status-overdue-text transition-colors hover:bg-status-overdue-bg focus-visible:bg-status-overdue-bg focus-visible:outline-none"
                  >
                    <Icon className="size-[18px] shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 text-left">
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
