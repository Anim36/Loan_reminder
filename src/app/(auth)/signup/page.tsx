"use client";

/**
 * Figma reference: Loan Reminder · Sign up
 *   10:3712 (desktop) / 10:3753 (mobile)
 * Card body fields (top to bottom):
 *   - Your name (placeholder "Ayesha Rahman")
 *   - Email (mail icon)
 *   - Password (eye-off icon) + "Use at least 8 characters." helper
 *   - "Create account" primary button (full width)
 *   - "or" divider
 *   - "Continue with Google" secondary button
 *   - "Already have an account? Log in" footer link
 *
 * All copy goes through `useT()` so the page re-renders when the
 * user switches language.
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Mail, ArrowRight } from "lucide-react";
import { signIn as nextAuthSignIn } from "next-auth/react";

import { AuthCard, PasswordInput } from "@/components/auth/auth-card";
import { AuthToolbar } from "@/components/auth/auth-toolbar";
import { signUp, AuthError } from "@/services/authService";
import { useT } from "@/lib/i18n/LanguageProvider";

const baseInput =
  "w-full h-[48px] px-[14px] flex items-center gap-[10px] rounded-input border bg-surface overflow-hidden font-normal text-body";

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";
  const { t } = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/google-enabled")
      .then((r) => r.json())
      .then((body: { enabled?: boolean }) => {
        if (!cancelled) setGoogleEnabled(Boolean(body.enabled));
      })
      .catch(() => {
        if (!cancelled) setGoogleEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function validate() {
    const next: typeof errors = {};
    if (!name.trim()) next.name = t["settings.fieldRequired"];
    if (!email.trim()) next.email = t["settings.fieldRequired"];
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
      next.email = t["settings.fieldInvalid"];
    if (!password) next.password = t["settings.fieldRequired"];
    else if (password.length < 8) next.password = t["settings.passwordTooShort"];
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await signUp({ name: name.trim(), email: email.trim(), password });
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      const code = err instanceof AuthError ? err.code : null;
      if (code === "rate_limited") {
        setErrors({ password: t["auth.rateLimited"] });
      } else if (err instanceof Error) {
        setErrors({ password: err.message });
      } else {
        setErrors({ password: t["auth.signUpFailed"] });
      }
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setSubmitting(true);
    await nextAuthSignIn("google", { callbackUrl });
  }

  return (
    <>
      <AuthToolbar />
      <AuthCard
        title={t["auth.signUpTitle"]}
        subtitle={t["auth.signUpSubtitle"]}
        footerPrompt={t["auth.hasAccount"]}
        footerLinkLabel={t["auth.logInTitle"]}
        footerLinkHref="/login"
        onGoogle={googleEnabled ? handleGoogle : undefined}
      >
        <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-6">
          {/* Name field */}
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="auth-name" className="font-medium text-label text-text">
              {t["auth.fullName"]}
            </label>
            <div
              className={[
                baseInput,
                errors.name
                  ? "border border-status-overdue-text"
                  : "border border-border focus-within:border-2 focus-within:border-brand-600 focus-within:shadow-focus",
              ].join(" ")}
            >
              <input
                id="auth-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t["settings.namePlaceholder"]}
                className="flex-1 min-w-0 bg-transparent outline-none font-normal text-body text-text placeholder:text-placeholder"
              />
            </div>
            {errors.name ? (
              <p className="font-normal text-helper text-status-overdue-text">
                {errors.name}
              </p>
            ) : null}
          </div>

          {/* Email field */}
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="auth-email" className="font-medium text-label text-text">
              {t["auth.email"]}
            </label>
            <div
              className={[
                baseInput,
                errors.email
                  ? "border border-status-overdue-text"
                  : "border border-border focus-within:border-2 focus-within:border-brand-600 focus-within:shadow-focus",
              ].join(" ")}
            >
              <input
                id="auth-email"
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
            {errors.email ? (
              <p className="font-normal text-helper text-status-overdue-text">
                {errors.email}
              </p>
            ) : null}
          </div>

          {/* Password field with helper */}
          <PasswordInput
            id="auth-password"
            label={t["auth.password"]}
            value={password}
            onChange={setPassword}
            show={showPassword}
            onToggleShow={() => setShowPassword((v) => !v)}
            error={errors.password}
            helperText={!errors.password ? t["auth.useMinChars"] : undefined}
            autoComplete="new-password"
          />

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-input bg-brand-600 px-[18px] py-[11px] min-h-[44px] font-semibold text-label text-white transition-colors hover:bg-[#176348] disabled:bg-disabled-bg disabled:text-disabled-text disabled:cursor-not-allowed"
          >
            {submitting ? (
              t["auth.creatingAccount"]
            ) : (
              <>
                {t["auth.signUpTitle"]}
                <ArrowRight className="size-[18px] shrink-0" aria-hidden />
              </>
            )}
          </button>
        </form>

        <p className="text-center font-normal text-helper text-muted">
          {t["auth.agreeTerms"](
            <Link href="/terms" className="font-medium text-brand-600 hover:underline">
              {t["legal.termsHeading"]}
            </Link>,
            <Link href="/privacy" className="font-medium text-brand-600 hover:underline">
              {t["legal.privacyHeading"]}
            </Link>,
          )}
        </p>
      </AuthCard>
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <span className="text-muted text-helper">Loading…</span>
        </div>
      }
    >
      <SignupInner />
    </Suspense>
  );
}
