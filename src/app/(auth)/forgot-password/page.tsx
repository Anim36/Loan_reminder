"use client";

// Forgot password — /forgot-password.
//
// Shells: same outer rhythm as the Log in card (440px desktop, full
// width mobile, brand mark on top) but no "or" divider or Google
// button — those don't fit the recovery flow.
//
// After submit we swap the card body to a success state showing the
// email the link was sent to, with a "Resend link" ghost button.
//
// All copy is taken from the language dictionary via `useT()` so the
// page re-renders when the user switches language.

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, HandCoins, Mail, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { AuthToolbar } from "@/components/auth/auth-toolbar";
import { forgotPassword } from "@/services/authService";
import { useT } from "@/lib/i18n/LanguageProvider";

// `t` is the dictionary callable; we read the email error message
// from the dictionary so the validation message updates with the
// language switch.
function buildEmailSchema(t: ReturnType<typeof useT>["t"]) {
  return z.object({
    email: z.string().trim().email(t["settings.fieldInvalid"]),
  });
}

export default function ForgotPasswordPage() {
  const toast = useToast();
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = buildEmailSchema(t).safeParse({ email });
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setError(flat.email?.[0] ?? t["settings.fieldInvalid"]);
      return;
    }
    setSubmitting(true);
    try {
      const res = await forgotPassword({ email: result.data.email });
      setSentTo(res.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : t["app.error.body"]);
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!sentTo) return;
    setSubmitting(true);
    try {
      await forgotPassword({ email: sentTo });
      toast.show(t["auth.resendHint"]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AuthToolbar />
      <div className="flex w-full min-h-full flex-1 flex-col items-center gap-10 bg-bg px-6 pt-10 pb-6 sm:gap-14 sm:px-12 sm:pt-[72px] sm:pb-8 md:gap-14">
        <Link
          href="/"
          aria-label={t["nav.aria.brandHome"]}
          className="flex items-center gap-2.5"
        >
          <span className="flex size-8 items-center justify-center overflow-clip rounded-[10px] bg-brand-600">
            <HandCoins className="size-5 text-white" />
          </span>
          <span className="whitespace-nowrap font-semibold text-nav leading-6 text-text">
            {t["common.appName"]}
          </span>
        </Link>

        <div className="flex w-full max-w-[440px] flex-col gap-6 overflow-clip rounded-card border border-border bg-surface p-6 shadow-card sm:p-10">
          {sentTo ? (
            <SuccessState
              email={sentTo}
              submitting={submitting}
              onResend={() => void handleResend()}
            />
          ) : (
            <>
              <div className="flex w-full flex-col gap-3 leading-[1.5]">
                <h1 className="font-semibold text-auth-heading tracking-[-0.02em] text-text">
                  {t["auth.forgotTitle"]}
                </h1>
                <p className="font-normal text-subtitle text-muted">
                  {t["auth.forgotSubtitle"]}
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                noValidate
                className="flex w-full flex-col gap-6"
              >
                <div className="flex w-full flex-col gap-2">
                  <label
                    htmlFor="forgot-email"
                    className="font-medium text-label text-text"
                  >
                    {t["auth.email"]}
                  </label>
                  <div
                    className={[
                      "w-full h-[48px] px-[14px] flex items-center gap-[10px] rounded-input border bg-surface overflow-hidden font-normal text-body",
                      error
                        ? "border border-status-overdue-text"
                        : "border border-border focus-within:border-2 focus-within:border-brand-600 focus-within:shadow-focus",
                    ].join(" ")}
                  >
                    <input
                      id="forgot-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t["settings.emailPlaceholder"]}
                      className="flex-1 min-w-0 bg-transparent outline-none font-normal text-body text-text placeholder:text-placeholder"
                    />
                    <Mail className="size-[18px] shrink-0 text-muted" aria-hidden />
                  </div>
                  {error ? (
                    <p className="font-normal text-helper text-status-overdue-text">
                      {error}
                    </p>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                  icon={<ArrowRight size={18} aria-hidden />}
                  className="w-full"
                >
                  {submitting ? t["auth.sendLink"] : t["auth.sendReset"]}
                </Button>

                <p className="text-center font-normal text-helper text-muted">
                  {t["auth.hasAccount"]}{" "}
                  <Link
                    href="/login"
                    className="font-medium text-brand-600 hover:underline"
                  >
                    {t["auth.backToLogin"]}
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-muted" aria-hidden />
          <p className="font-normal text-helper text-muted">
            {t["auth.privacyNotice"]}
          </p>
        </div>
      </div>
    </>
  );
}

function SuccessState({
  email,
  submitting,
  onResend,
}: {
  email: string;
  submitting: boolean;
  onResend: () => void;
}) {
  const { t } = useT();
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex size-12 items-center justify-center rounded-pill bg-brand-50">
        <Mail className="size-5 text-brand-600" aria-hidden />
      </div>
      <div className="flex w-full flex-col gap-3 leading-[1.5]">
        <h1 className="font-semibold text-auth-heading tracking-[-0.02em] text-text">
          {t["auth.checkInboxHeading"]}
        </h1>
        <p className="font-normal text-subtitle text-muted">
          {t["auth.checkInboxBody"]}{" "}
          <span className="font-medium text-text">{email}</span>.
        </p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onResend}
          disabled={submitting}
          className="w-full"
        >
          {submitting ? t["auth.resendHint"] : t["auth.resend"]}
        </Button>
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center gap-2 rounded-input border border-border bg-surface px-[18px] py-[11px] min-h-[44px] font-semibold text-label text-text transition-colors hover:bg-brand-50 hover:text-brand-600"
        >
          <ArrowLeft size={16} aria-hidden />
          {t["auth.backToLogin"]}
        </Link>
      </div>
    </div>
  );
}
