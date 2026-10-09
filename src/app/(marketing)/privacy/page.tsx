import Link from "next/link";
import type { Metadata } from "next";
import { MarketingLayout } from "@/components/marketing/marketing-shell";
import { getDict, readServerLang } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Privacy Policy — Loan Reminder",
  description:
    "What data Loan Reminder collects, why, and how it's stored. Draft copy for review by counsel.",
};

const LAST_UPDATED = "08 Oct 2026";

export default async function PrivacyPage() {
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
          Privacy Policy
        </h1>

        <div className="rounded-card border border-status-overdue-border bg-status-overdue-bg p-4 text-body leading-[1.5] text-status-overdue-text">
          <strong className="font-semibold">Draft — please review.</strong>{" "}
          This is placeholder text for an early-access build. Have a lawyer
          review this Privacy Policy before the app is available to the public.
        </div>

        <Section id="what-we-collect" title="1. What data we collect">
          We collect the data you give us: name, email, phone number, and the
          loan records you create. For each loan you record, you may add a
          friend's name, phone number, and email address. We also keep a log of
          every reminder we send on your behalf and the channel it was sent on.
        </Section>

        <Section id="how-we-use-it" title="2. How we use it">
          We use this data to render your dashboard, send reminders you have
          explicitly scheduled, and notify you when your friends pay back. We
          do not use your data for advertising. We do not sell it.
        </Section>

        <Section id="providers" title="3. SMS and email delivery">
          SMS and email reminders are delivered by third-party providers (for
          example, Twilio and Postmark / SendGrid). Those providers may store
          the message body and recipient details on their infrastructure,
          governed by their own privacy terms.
        </Section>

        <Section id="retention" title="4. Data retention and deletion">
          We keep your records while your account is active. You can delete a
          loan at any time. You can request full account deletion from the
          Settings page; when you do, we delete your account and every
          associated loan and reminder record within 30 days.
        </Section>

        <Section id="security" title="5. Security">
          Data is encrypted in transit (HTTPS) and at rest. We use
          industry-standard authentication. No method of storage is 100%
          secure, and we cannot guarantee absolute security.
        </Section>

        <Section id="rights" title="6. Your rights">
          You can export your data and delete your account from the Settings
          page. If you have other rights under local data protection law (for
          example, GDPR or the Bangladesh Digital Personal Data Protection Act),
          you can exercise them by emailing us.
        </Section>

        <Section id="contact" title="7. Contact">
          Questions? Email{" "}
          <a className="text-brand-600 hover:underline" href="mailto:hello@loan-reminder.app">
            hello@loan-reminder.app
          </a>
          .
        </Section>

        <p className="font-normal text-helper text-muted">
          See also our{" "}
          <Link href="/terms" className="text-brand-600 hover:underline">
            Terms of Service
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