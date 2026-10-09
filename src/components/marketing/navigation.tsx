"use client";

// Figma reference: Landing · 10:3496 (Navigation) / 10:3497 (Brand and
// navigation) / 10:3502 (Navigation actions — desktop) / 10:3604 (Mobile
// navigation — two rows: brand + Log in on top, Features · How it works
// · Get Started below).
//
// This is the public landing-page nav. It carries the same theme
// toggle and language switch as the logged-in top bar, plus the
// "Log in" / "Get Started" CTAs. The notification bell and avatar
// are intentionally absent — they only appear inside the logged-in
// shell.

import Link from "next/link";
import { ArrowRight, HandCoins } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useT } from "@/lib/i18n/LanguageProvider";

function Brand({ t }: { t: ReturnType<typeof useT>["t"] }) {
  return (
    <Link href="/" aria-label="Loan Reminder home" className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="flex size-8 items-center justify-center overflow-clip rounded-[10px] bg-brand-600"
      >
        <HandCoins className="size-5 text-white" />
      </span>
      <span className="whitespace-nowrap font-semibold text-nav leading-6 text-text">
        {t["common.appName"]}
      </span>
    </Link>
  );
}

export function MarketingNavigation() {
  const { t } = useT();
  return (
    <header
      data-node-id="10:3496"
      className="sticky top-0 z-30 w-full border-b border-border bg-surface/95 backdrop-blur-sm"
    >
      {/* Mobile: two rows. Desktop: one row. */}
      <div className="flex w-full flex-col gap-5 px-6 py-6 md:flex-row md:items-center md:justify-between md:gap-8 md:px-20 md:py-6">
        {/* Top row: brand + (mobile) Log in + language, or (desktop) brand only. */}
        <div className="flex w-full items-center justify-between md:w-auto md:justify-start">
          <Brand t={t} />
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <LanguageSwitcher variant="dropdown" />
            <Link
              href="/login"
              className="flex min-h-[44px] items-center px-[18px] py-[11px] font-semibold text-label text-text hover:text-brand-600"
            >
              {t["nav.logIn"]}
            </Link>
          </div>
        </div>

        {/* Desktop inline nav */}
        <nav
          aria-label="Primary"
          className="hidden items-center gap-6 md:flex"
          data-node-id="10:3502"
        >
          <Link
            href="#features"
            className="font-normal text-body text-muted hover:text-text"
          >
            {t["nav.features"]}
          </Link>
          <Link
            href="#how-it-works"
            className="font-normal text-body text-muted hover:text-text"
          >
            {t["nav.howItWorks"]}
          </Link>
          <ThemeToggle />
          <LanguageSwitcher variant="dropdown" />
          <Link
            href="/login"
            className="flex min-h-[44px] items-center justify-center px-[18px] py-[11px] font-semibold text-label text-text hover:text-brand-600"
          >
            {t["nav.logIn"]}
          </Link>
          <Link href="/signup">
            <Button
              variant="primary"
              icon={<ArrowRight className="size-[18px]" aria-hidden />}
            >
              {t["nav.getStarted"]}
            </Button>
          </Link>
        </nav>
      </div>

      {/* Mobile second row: Features · How it works · Get Started */}
      <div
        data-node-id="10:3613"
        className="flex w-full items-center justify-between border-t border-border px-6 py-4 md:hidden"
      >
        <Link
          href="#features"
          className="font-normal text-helper text-muted hover:text-text"
        >
          {t["nav.features"]}
        </Link>
        <Link
          href="#how-it-works"
          className="font-normal text-helper text-muted hover:text-text"
        >
          {t["nav.howItWorks"]}
        </Link>
        <Link href="/signup">
          <Button variant="primary" className="min-h-[44px] px-[18px] py-[11px]">
            {t["nav.getStarted"]}
          </Button>
        </Link>
      </div>
    </header>
  );
}
