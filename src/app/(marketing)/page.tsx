// Marketing landing page (route group: marketing)
// Maps to Figma frame: Landing (10:3495 desktop / 10:3603 mobile)
//
// This is the public home page. It is a Server Component so the
// metadata export is hoisted and the page loads instantly. Smooth
// scroll is handled by `html { scroll-behavior: smooth }` in
// globals.css.

import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  CircleCheck,
  HandCoins,
  ListChecks,
  Send,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Loan Reminder — A kinder way to remember who owes you what",
  description:
    "Track money you've lent to friends and family, schedule polite SMS and email reminders, and keep friendships about more than money.",
  openGraph: {
    title: "Loan Reminder",
    description:
      "Track money you've lent to friends and family, schedule polite SMS and email reminders.",
    type: "website",
  },
};

const features = [
  {
    title: "Keep a calm record",
    body: "Add the loan, the friend, and the due date. The rest lives in one place.",
    icon: HandCoins,
  },
  {
    title: "Send polite reminders",
    body: "Friendly, neutral, or firm — pick the tone that matches your friendship.",
    icon: Send,
  },
  {
    title: "Stay in the loop",
    body: "Dashboard summary cards and a quiet notification feed so nothing slips.",
    icon: ListChecks,
  },
];

const steps = [
  {
    n: "01",
    title: "Add the loan",
    body: "Friend's name, amount, and the date you'd like it back.",
  },
  {
    n: "02",
    title: "Pick a tone",
    body: "Choose a friendly, neutral, or firm reminder template.",
  },
  {
    n: "03",
    title: "We send, you relax",
    body: "Loan Reminder sends a gentle SMS or email at the right time.",
  },
];

export default function MarketingHomePage() {
  return (
    <MarketingLayout>
      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-24 px-6 py-16 md:px-12 md:py-24">
        {/* Hero */}
        <section className="flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-6 leading-[1.4]">
            <p className="eyebrow">
              For the people you lend to
            </p>
            <h1 className="font-semibold text-display tracking-[-0.02em] text-text md:leading-[1.05]">
              A kinder way to remember who owes you what.
            </h1>
            <p className="max-w-xl font-normal text-body text-muted md:text-subtitle">
              Track money you've lent to friends and family, schedule polite
              SMS or email reminders, and keep your friendships about more
              than money.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/signup"
                className="inline-flex h-[52px] items-center gap-2 rounded-input bg-brand-600 px-6 font-semibold text-label text-white hover:bg-[#176348] transition-colors"
              >
                Get Started
                <ArrowRight size={18} aria-hidden />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-[52px] items-center rounded-input px-4 font-semibold text-label text-text hover:bg-brand-50 hover:text-brand-600 transition-colors"
              >
                Log in
              </Link>
            </div>
          </div>
          <DashboardMockup />
        </section>

        {/* Features */}
        <section
          id="features"
          className="flex flex-col gap-8 scroll-mt-24"
        >
          <header className="flex flex-col gap-2 max-w-2xl">
            <p className="eyebrow">Features</p>
            <h2 className="font-semibold text-h2 tracking-[-0.02em] text-text">
              A lending space that doesn't feel like a spreadsheet.
            </h2>
          </header>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {features.map(({ title, body, icon: Icon }) => (
              <article
                key={title}
                className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card md:p-8"
              >
                <span className="flex size-10 items-center justify-center rounded-input bg-brand-50 text-brand-600">
                  <Icon size={20} aria-hidden />
                </span>
                <h3 className="font-semibold text-card-heading text-text">
                  {title}
                </h3>
                <p className="font-normal text-body text-muted">{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="flex flex-col gap-8 scroll-mt-24"
        >
          <header className="flex flex-col gap-2 max-w-2xl">
            <p className="eyebrow">How it works</p>
            <h2 className="font-semibold text-section-h2 tracking-[-0.02em] text-text">
              Three steps. Then we're out of it.
            </h2>
          </header>
          <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <li
                key={s.n}
                className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card md:p-8"
              >
                <span className="font-semibold text-display tracking-[-0.02em] text-brand-600 leading-none">
                  {s.n}
                </span>
                <h3 className="font-semibold text-card-heading text-text">
                  {s.title}
                </h3>
                <p className="font-normal text-body text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Final CTA */}
        <section className="flex flex-col items-center gap-4 rounded-card border border-border bg-surface p-10 text-center shadow-card md:p-14">
          <h2 className="font-semibold text-h2 tracking-[-0.02em] text-text">
            Ready to keep it kind?
          </h2>
          <p className="max-w-md font-normal text-body text-muted">
            Create your private lending space in under a minute.
          </p>
          <Link
            href="/signup"
            className="inline-flex h-[52px] items-center gap-2 rounded-input bg-brand-600 px-6 font-semibold text-label text-white hover:bg-[#176348] transition-colors"
          >
            Get Started
            <ArrowRight size={18} aria-hidden />
          </Link>
        </section>
      </main>
    </MarketingLayout>
  );
}

function DashboardMockup() {
  return (
    <div className="relative flex w-full max-w-[480px] flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-overlay md:flex-1">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-card-heading text-text">Dashboard</p>
        <span className="rounded-pill bg-status-paid-bg px-3 py-1 font-medium text-badge text-status-paid-text">
          Healthy
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total lent", value: "৳32,500" },
          { label: "Outstanding", value: "৳18,000" },
          { label: "Overdue", value: "৳5,000", tone: "overdue" as const },
          { label: "Pending", value: "৳13,000" },
        ].map((card) => (
          <div
            key={card.label}
            className={[
              "flex flex-col gap-1 rounded-card border p-3",
              card.tone === "overdue"
                ? "bg-status-overdue-bg border-status-overdue-border"
                : "bg-surface border-border",
            ].join(" ")}
          >
            <span className="text-helper text-muted">{card.label}</span>
            <span
              className={[
                "font-semibold text-card-heading",
                card.tone === "overdue"
                  ? "text-status-overdue-text"
                  : "text-text",
              ].join(" ")}
            >
              {card.value}
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-col rounded-input border border-border bg-bg p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-pill bg-[#e5eee7] font-semibold text-label text-brand-600">
            R
          </span>
          <div className="flex flex-1 flex-col">
            <span className="font-medium text-body text-text">Rafi</span>
            <span className="font-normal text-helper text-muted">
              Due 02 Oct 2026
            </span>
          </div>
          <span className="font-medium text-body text-text">৳5,000</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <CircleCheck size={14} className="text-status-overdue-text" aria-hidden />
          <span className="font-normal text-helper text-status-overdue-text">
            Overdue by 2 days
          </span>
        </div>
      </div>
    </div>
  );
}