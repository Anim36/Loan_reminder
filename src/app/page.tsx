// Marketing landing page (route group: marketing)
// Maps to Figma frame: Landing (10:3495 desktop / 10:3603 mobile)
//
// Top-to-bottom structure (per the Figma frame):
//   1. Navigation — client component (`MarketingNavigation`)
//   2. Hero — eyebrow + 64px DM Sans (font-semibold, text-display) headline
//      "Never chase a loan again"
//      + 17px subhead + primary CTA + "A little less to remember."
//      + privacy line + dashboard mockup (right of hero on desktop,
//      stacked under it on mobile).
//   3. Features — 3 cards (Track loans / Auto reminders / Private notes)
//   4. How it works — 3 steps
//   5. Final invitation — brand-50 panel with primary CTA
//   6. Footer
//
// Smooth scroll is enabled in `globals.css` (`scroll-behavior: smooth`).

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  HandCoins,
  HeartHandshake,
  LockKeyhole,
  Bell,
  NotebookPen,
  Clock,
  CircleCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { MarketingNavigation } from "@/components/marketing/navigation";
import { en as enDict, bn as bnDict, type Lang } from "@/lib/i18n";
import { getT, readServerLang } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const title = `${t("common.appName")} · ${t("landing.hero.title")}`;
  const description = t("landing.hero.subtitle");
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function MarketingHomePage() {
  const lang: Lang = await readServerLang();
  return (
    <div className="flex w-full flex-col items-center bg-bg text-text">
      <MarketingNavigation />
      <main className="flex w-full flex-col items-center">
        <Hero lang={lang} />
        <div className="flex w-full justify-center px-5 pb-12 md:hidden">
          <DashboardMockup lang={lang} />
        </div>
        <Features lang={lang} />
        <HowItWorks lang={lang} />
        <FinalInvitation lang={lang} />
      </main>
      <Footer lang={lang} />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Hero
 * ------------------------------------------------------------------------- */

function Hero({ lang }: { lang: Lang }) {
  const map = tMap(lang);
  return (
    <section
      data-node-id="10:3509"
      className="flex w-full flex-col items-center gap-10 px-6 py-14 md:flex-row md:items-center md:gap-16 md:px-20 md:py-[88px]"
    >
      <div
        data-node-id="10:3510"
        className="flex w-full max-w-[480px] flex-col items-start gap-6"
      >
        <div
          data-node-id="10:3511"
          className="flex items-center gap-2"
        >
          <HeartHandshake className="size-4 text-brand-600" aria-hidden />
          <p className="whitespace-nowrap eyebrow !text-brand-600">
            {map["landing.eyebrow"]}
          </p>
        </div>

        <h1
          data-node-id="10:3514"
          className="font-semibold text-display tracking-[-0.02em] text-text leading-[1.1]"
        >
          {map["landing.hero.title"]}
        </h1>

        <p
          data-node-id="10:3515"
          className="font-normal text-subtitle text-muted"
        >
          {map["landing.hero.subtitle"]}
        </p>

        <div
          data-node-id="10:3516"
          className="flex w-full items-center gap-4"
        >
          <Link href="/signup">
            <Button
              variant="primary"
              icon={<ArrowRight className="size-[18px]" aria-hidden />}
            >
              {map["landing.cta"]}
            </Button>
          </Link>
          <p className="flex-1 font-normal text-helper text-muted">
            {map["landing.ctaHelper"]}
          </p>
        </div>

        <div
          data-node-id="10:3521"
          className="flex items-center gap-2"
        >
          <LockKeyhole className="size-[14px] text-muted" aria-hidden />
          <p className="font-normal text-helper text-muted">
            {map["landing.privacy"]}
          </p>
        </div>
      </div>

      {/* Dashboard mockup — desktop: right of hero. Mobile uses the
          page-level stacked copy. */}
      <div className="hidden w-full justify-center md:flex md:flex-1">
        <DashboardMockup lang={lang} />
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
 * Dashboard mockup
 * ------------------------------------------------------------------------- */

function DashboardMockup({ lang }: { lang: Lang }) {
  const map = tMap(lang);
  return (
    <div
      data-node-id="10:3524"
      className="flex w-full max-w-[640px] flex-col gap-6 rounded-[20px] border border-brand-50 bg-brand-50/40 p-6 shadow-overlay"
    >
      <div
        data-node-id="10:3525"
        className="flex w-full flex-col gap-5 rounded-card bg-surface p-5 sm:p-6"
      >
        <div
          data-node-id="10:3526"
          className="flex w-full items-center justify-between"
        >
          <span
            aria-hidden
            className="flex size-8 items-center justify-center overflow-clip rounded-[10px] bg-brand-600"
          >
            <HandCoins className="size-5 text-white" />
          </span>
          <p className="whitespace-nowrap font-normal text-badge text-muted">
            WED, 07 OCT
          </p>
        </div>

        <p
          data-node-id="10:3531"
          className="font-semibold text-list-title tracking-[-0.02em] text-text"
        >
          {lang === "bn" ? "সুপ্রভাত, আয়েশা" : "Good morning, Ayesha"}
        </p>

        <div className="grid w-full grid-cols-2 gap-3">
          <PreviewMetric
            label={map["landing.mockup.totalLent"]}
            value={formatMoney(45000)}
            caption={map["landing.mockup.totalLentCaption"]}
            icon={<HandCoins className="size-4 text-muted" aria-hidden />}
          />
          <PreviewMetric
            label={map["landing.mockup.pending"]}
            value={formatMoney(19000)}
            caption={map["landing.mockup.pendingCaption"]}
            icon={<Clock className="size-4 text-muted" aria-hidden />}
          />
        </div>

        <div className="flex flex-col gap-3">
          <PreviewLoan name="Rafi" due={lang === "bn" ? "২ অক্টোবর বকেয়া" : "Due 02 Oct 2026"} amount={formatMoney(5000)} />
          <PreviewLoan
            name="Tanvir"
            due={lang === "bn" ? "১৫ অক্টোবর বকেয়া" : "Due 15 Oct 2026"}
            amount={formatMoney(12500)}
          />
        </div>

        <div className="h-px w-full bg-border" />

        <div className="flex items-center gap-2.5">
          <CircleCheck className="size-5 text-brand-600" aria-hidden />
          <p className="flex-1 font-normal text-helper text-brand-600">
            {map["landing.mockup.note"]}
          </p>
        </div>
      </div>

      <p className="text-center font-normal text-eyebrow text-brand-600">
        {map["landing.mockup.footnote"]}
      </p>
    </div>
  );
}

function PreviewMetric({
  label,
  value,
  caption,
  icon,
}: {
  label: string;
  value: string;
  caption: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-start gap-1 overflow-clip rounded-card border border-border bg-surface p-5">
      <span className="absolute right-[15px] top-[19px]">{icon}</span>
      <p className="font-normal text-helper text-muted">{label}</p>
      <p className="tabular font-semibold text-summary text-text">{value}</p>
      <p className="font-normal text-eyebrow text-muted">{caption}</p>
    </div>
  );
}

function PreviewLoan({
  name,
  due,
  amount,
}: {
  name: string;
  due: string;
  amount: string;
}) {
  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex flex-col gap-[3px]">
        <p className="font-medium text-body text-text">{name}</p>
        <p className="font-normal text-eyebrow text-muted">{due}</p>
      </div>
      <p className="font-semibold text-body text-text">{amount}</p>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Features
 * ------------------------------------------------------------------------- */

function Features({ lang }: { lang: Lang }) {
  const map = tMap(lang);
  const items: { icon: React.ReactNode; title: string; body: string }[] = [
    {
      icon: <HandCoins className="size-5 text-brand-600" aria-hidden />,
      title: map["landing.features.track.title"],
      body: map["landing.features.track.body"],
    },
    {
      icon: <Bell className="size-5 text-brand-600" aria-hidden />,
      title: map["landing.features.reminders.title"],
      body: map["landing.features.reminders.body"],
    },
    {
      icon: <NotebookPen className="size-5 text-brand-600" aria-hidden />,
      title: map["landing.features.notes.title"],
      body: map["landing.features.notes.body"],
    },
  ];

  return (
    <section
      id="features"
      data-node-id="10:3555"
      className="flex w-full flex-col gap-8 bg-surface px-6 py-16 md:gap-8 md:px-20 md:py-16"
    >
      <div className="flex w-full flex-col gap-3">
        <h2 className="font-semibold text-section-h2 tracking-[-0.02em] text-text">
          {map["landing.features.title"]}
        </h2>
        <p className="font-normal text-subtitle text-muted">
          {map["landing.features.subtitle"]}
        </p>
      </div>

      <div
        data-node-id="10:3559"
        className="grid grid-cols-1 gap-6 md:grid-cols-3"
      >
        {items.map(({ icon, title, body }) => (
          <div
            key={title}
            className="flex flex-col items-start gap-6 overflow-clip rounded-card border border-border bg-surface p-7 shadow-card"
          >
            <span
              aria-hidden
              className="flex size-11 items-center justify-center overflow-clip rounded-input bg-brand-50"
            >
              {icon}
            </span>
            <p className="font-semibold text-card-heading text-text">{title}</p>
            <p className="font-normal text-body text-muted">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
 * How it works
 * ------------------------------------------------------------------------- */

function HowItWorks({ lang }: { lang: Lang }) {
  const map = tMap(lang);
  const steps = [
    { n: "01", title: map["landing.how.step1.title"], body: map["landing.how.step1.body"] },
    { n: "02", title: map["landing.how.step2.title"], body: map["landing.how.step2.body"] },
    { n: "03", title: map["landing.how.step3.title"], body: map["landing.how.step3.body"] },
  ];

  return (
    <section
      id="how-it-works"
      data-node-id="10:3575"
      className="flex w-full flex-col gap-10 px-6 py-14 md:px-20 md:py-20"
    >
      <h2 className="font-semibold text-section-h2 tracking-[-0.02em] text-text">
        {map["landing.how.title"]}
      </h2>

      <div
        data-node-id="10:3577"
        className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-12"
      >
        {steps.map(({ n, title, body }) => (
          <div key={n} className="flex flex-col items-start gap-4 leading-[1.5]">
            <p className="whitespace-nowrap font-medium text-body text-brand-600">
              {n} —
            </p>
            <p className="font-semibold text-card-heading text-text">{title}</p>
            <p className="font-normal text-body text-muted">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
 * Final invitation
 * ------------------------------------------------------------------------- */

function FinalInvitation({ lang }: { lang: Lang }) {
  const map = tMap(lang);
  return (
    <section
      data-node-id="10:3590"
      className="flex w-full flex-col items-center gap-6 bg-brand-50 px-6 py-16 md:px-20 md:py-16"
    >
      <h2 className="text-center font-semibold text-section-h2 tracking-[-0.02em] text-text">
        {map["landing.final.title"]}
      </h2>
      <p className="text-center font-normal text-body text-muted">
        {map["landing.final.body"]}
      </p>
      <Link href="/signup">
        <Button
          variant="primary"
          icon={<ArrowRight className="size-[18px]" aria-hidden />}
        >
          {map["landing.cta"]}
        </Button>
      </Link>
    </section>
  );
}

/* ---------------------------------------------------------------------------
 * Footer
 * ------------------------------------------------------------------------- */

function Footer({ lang }: { lang: Lang }) {
  const map = tMap(lang);
  return (
    <footer
      data-node-id="10:3596"
      className="flex w-full flex-col items-start gap-6 px-6 py-8 md:flex-row md:items-center md:gap-6 md:px-20"
    >
      <Link
        href="/"
        aria-label="Loan Reminder home"
        className="flex items-center gap-2.5"
      >
        <span
          aria-hidden
          className="flex size-8 items-center justify-center overflow-clip rounded-[10px] bg-brand-600"
        >
          <HandCoins className="size-5 text-white" />
        </span>
        <span className="whitespace-nowrap font-semibold text-nav leading-6 text-text">
          {map["common.appName"]}
        </span>
      </Link>
      <p className="font-normal text-helper text-muted md:ml-auto md:text-right">
        {map["landing.footer"]}
      </p>
    </footer>
  );
}

/* ---------------------------------------------------------------------------
 * Map the active language's dictionary. We keep landing copy as
 * server-rendered strings (no React on the page) so the dictionary
 * is read at the start of the page and passed down.
 * ------------------------------------------------------------------------- */

function tMap(lang: Lang) {
  return (lang === "bn" ? bnDict : enDict) as unknown as Record<string, string>;
}
