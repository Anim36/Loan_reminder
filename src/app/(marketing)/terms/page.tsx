import Link from "next/link";
import type { Metadata } from "next";
import { MarketingLayout } from "@/components/marketing/marketing-shell";
import { getDict, readServerLang } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Terms of Service — Loan Reminder",
  description:
    "The terms that govern your use of Loan Reminder. Draft copy for review by counsel.",
};

const LAST_UPDATED = "08 Oct 2026";

export default async function TermsPage() {
  const lang = await readServerLang();
  const t = await getDict();
  return (
    <MarketingLayout>
      <article className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-6 py-12 md:py-16">
        {lang === "bn" ? (
          <p className="rounded-input border border-status-overdue-border bg-status-overdue-bg px-3 py-2 text-helper text-status-overdue-text">
            {t["legal.untranslatedNotice"]}
          </p>
        ) : null}
        <p className="eyebrow">
          Last updated · {LAST_UPDATED}
        </p>
        <h1 className="font-semibold text-legal-h1 tracking-[-0.02em] text-text">
          Terms of Service
        </h1>

        <div className="rounded-card border border-status-overdue-border bg-status-overdue-bg p-4 text-body leading-[1.5] text-status-overdue-text">
          <strong className="font-semibold">Draft — please review.</strong>{" "}
          This is placeholder text for an early-access build. Have a lawyer
          review these Terms before the app is available to the public.
        </div>

        <Section id="acceptance" title="1. Acceptance">
          By creating an account or otherwise using Loan Reminder, you agree to
          these Terms. If you do not agree, please don't use the service.
        </Section>

        <Section id="using-the-service" title="2. Using the service">
          Loan Reminder helps you keep a private record of money you have lent
          to friends and family. You can choose to schedule friendly SMS or
          email reminders for any loan. The reminders are sent from your own
          phone number or email, not ours, and you can stop them at any time.
        </Section>

        <Section id="user-responsibilities" title="3. Your responsibilities">
          You are responsible for the loans you record and the reminders you
          send. Before sending an SMS or email reminder to a friend, you must
          have their permission. We will ask you to confirm this when you
          create a loan, but the legal responsibility remains yours.
        </Section>

        <Section id="reminder-messages" title="4. Reminder messages">
          The reminder templates in the Tone-Friendly / Neutral / Firm editor
          are yours to edit. Please review them carefully. Loan Reminder does
          not vet the messages on your behalf and is not responsible for the
          content you send.
        </Section>

        <Section id="accounts" title="5. Accounts">
          You are responsible for keeping your account credentials safe. Let
          us know at{" "}
          <a className="text-brand-600 hover:underline" href="mailto:hello@loan-reminder.app">
            hello@loan-reminder.app
          </a>{" "}
          if you believe your account has been accessed without your permission.
        </Section>

        <Section id="limitation" title="6. Limitation of liability">
          Loan Reminder is provided "as is", without warranty. We are not a
          lender, a debt collector, or a legal service. We do not guarantee
          that any SMS or email will be delivered, that they will be received
          by your friend, or that they will produce any particular result.
        </Section>

        <Section id="changes" title="7. Changes to these Terms">
          We may update these Terms from time to time. If we do, we'll show
          the new date at the top of this page. Continuing to use the service
          after a change means you accept the new Terms.
        </Section>

        <Section id="contact" title="8. Contact">
          Questions? Email{" "}
          <a className="text-brand-600 hover:underline" href="mailto:hello@loan-reminder.app">
            hello@loan-reminder.app
          </a>
          .
        </Section>

        <p className="font-normal text-helper text-muted">
          See also our{" "}
          <Link href="/privacy" className="text-brand-600 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </article>
    </MarketingLayout>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="flex scroll-mt-24 flex-col gap-3 leading-[1.7]"
    >
      <h2 className="font-semibold text-card-heading tracking-[-0.02em] text-text">
        {title}
      </h2>
      <div className="font-normal text-legal-body text-text">{children}</div>
    </section>
  );
}