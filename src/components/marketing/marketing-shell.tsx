// Shared chrome for the marketing pages (landing, terms, privacy).
//
// The nav is sticky (so the theme + language controls stay reachable
// while scrolling the long landing page). It carries the same theme
// toggle and language switch as the logged-in top bar, plus the
// "Log in" / "Get Started" CTAs. The bell and avatar are intentionally
// absent here — the spec keeps them on the logged-in shell only.

import Link from "next/link";
import { Menu, X } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { getDict, type Dictionary } from "@/lib/i18n/server";

export async function MarketingNav() {
  const t = await getDict();
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-3 px-5 py-3 md:gap-6 md:px-12 md:py-4">
        <Brand label={t["auth.brandHome"]} brand={t["common.appName"]} />
        <DesktopLinks t={t} />
        <DesktopCTAs t={t} />
        <MobileNav t={t} />
      </div>
    </header>
  );
}

function Brand({
  label,
  brand,
}: {
  label: string;
  brand: string;
}) {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-2.5"
      aria-label={label}
    >
      <span className="flex size-8 items-center justify-center overflow-clip rounded-[10px] bg-brand-600">
        <BrandMark />
      </span>
      <span className="whitespace-nowrap font-semibold text-nav leading-6 text-text">
        {brand}
      </span>
    </Link>
  );
}

function DesktopLinks({ t }: { t: Dictionary }) {
  return (
    <nav
      aria-label={t["marketing.nav.aria"]}
      className="hidden flex-1 items-center gap-6 md:flex"
    >
      <Link
        href="#features"
        className="font-normal text-body text-muted hover:text-text"
      >
        {t["marketing.featuresLink"]}
      </Link>
      <Link
        href="#how-it-works"
        className="font-normal text-body text-muted hover:text-text"
      >
        {t["marketing.howItWorksLink"]}
      </Link>
    </nav>
  );
}

function DesktopCTAs({ t }: { t: Dictionary }) {
  return (
    <div className="hidden shrink-0 items-center gap-2 md:flex">
      <ThemeToggle />
      <LanguageSwitcher variant="dropdown" />
      <Link
        href="/login"
        className="inline-flex h-10 items-center justify-center rounded-input px-4 font-semibold text-label text-text transition-colors hover:bg-brand-50 hover:text-brand-600"
      >
        {t["marketing.logIn"]}
      </Link>
      <Link
        href="/signup"
        className="inline-flex h-10 items-center justify-center rounded-input bg-brand-600 px-4 font-semibold text-label text-white transition-colors hover:bg-[#176348]"
      >
        {t["marketing.getStarted"]}
      </Link>
    </div>
  );
}

function MobileNav({ t }: { t: Dictionary }) {
  return (
    <details className="relative md:hidden">
      <summary
        className="flex size-10 cursor-pointer list-none items-center justify-center rounded-input text-text hover:bg-brand-50 hover:text-brand-600"
        aria-label={t["marketing.openMenu"]}
      >
        <Menu size={20} aria-hidden />
      </summary>
      <div className="absolute right-0 top-full z-30 mt-2 flex w-64 flex-col rounded-card border border-border bg-surface p-3 shadow-overlay">
        <div className="mb-2 flex items-center gap-2 border-b border-border pb-3">
          <ThemeToggle />
          <LanguageSwitcher variant="dropdown" />
        </div>
        <Link
          href="#features"
          className="flex h-10 items-center rounded-input px-3 font-normal text-body text-text hover:bg-brand-50 hover:text-brand-600"
        >
          {t["marketing.featuresLink"]}
        </Link>
        <Link
          href="#how-it-works"
          className="flex h-10 items-center rounded-input px-3 font-normal text-body text-text hover:bg-brand-50 hover:text-brand-600"
        >
          {t["marketing.howItWorksLink"]}
        </Link>
        <Link
          href="/login"
          className="mt-2 flex h-10 items-center justify-center rounded-input border border-border font-semibold text-label text-text hover:bg-brand-50 hover:text-brand-600"
        >
          {t["marketing.logIn"]}
        </Link>
        <Link
          href="/signup"
          className="mt-2 flex h-10 items-center justify-center rounded-input bg-brand-600 font-semibold text-label text-white hover:bg-[#176348]"
        >
          {t["marketing.getStarted"]}
        </Link>
        <summary
          aria-label={t["marketing.closeMenu"]}
          className="absolute right-2 top-2 flex size-7 cursor-pointer list-none items-center justify-center rounded-full text-muted hover:bg-brand-50 hover:text-brand-600"
        >
          <X size={16} aria-hidden />
        </summary>
      </div>
    </details>
  );
}

export async function MarketingFooter() {
  const t = await getDict();
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-6 py-8 text-helper text-muted md:flex-row md:items-center md:justify-between md:px-12">
        <p>{t["marketing.footerTagline"]}</p>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-text">
            {t["marketing.termsLink"]}
          </Link>
          <Link href="/privacy" className="hover:text-text">
            {t["marketing.privacyLink"]}
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <MarketingNav />
      <div className="flex-1">{children}</div>
      <MarketingFooter />
    </div>
  );
}

function BrandMark() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-white"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 5v10" />
      <path d="M7.5 8.5h5" />
      <path d="M7.5 11.5h5" />
    </svg>
  );
}