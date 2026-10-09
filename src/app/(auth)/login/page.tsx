"use client";

/**
 * Figma reference: Loan Reminder · Log in
 *   10:3794 (desktop) / 10:3831 (mobile)
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Mail, ArrowRight } from "lucide-react";
import { signIn as nextAuthSignIn } from "next-auth/react";

import { AuthCard, PasswordInput } from "@/components/auth/auth-card";
import { AuthToolbar } from "@/components/auth/auth-toolbar";
import { signIn, AuthError } from "@/services/authService";
import { useT } from "@/lib/i18n/LanguageProvider";

const baseInput =
  "w-full h-[48px] px-[14px] flex items-center gap-[10px] rounded-input border bg-surface overflow-hidden font-normal text-body";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    // One-shot fetch — the result is constant for the life of
    // the deployment so we don't bother refetching.
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn({ email, password });
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      // Map known codes to dictionary strings; everything else
      // shows a generic error.
      const code = err instanceof AuthError ? err.code : null;
      if (code === "CredentialsSignin" || code === "credentials") {
        setError(t["auth.incorrectPassword"]);
      } else if (code === "rate_limited") {
        setError(t["auth.rateLimited"]);
      } else if (err instanceof Error) {
        setError(err.message.replace(/\.$/, ""));
      } else {
        setError(t["auth.incorrectPassword"]);
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
        title={t["auth.logInTitle"]}
        subtitle={t["auth.logInSubtitle"]}
        footerPrompt={t["auth.noAccount"]}
        footerLinkLabel={t["nav.signUp"]}
        footerLinkHref="/signup"
        onGoogle={googleEnabled ? handleGoogle : undefined}
      >
        <form
          onSubmit={handleSubmit}
          className="flex w-full flex-col gap-5"
          noValidate
        >
          <div className="flex w-full flex-col gap-2">
            <label
              htmlFor="login-email"
              className="font-medium text-label text-text"
            >
              {t["auth.email"]}
            </label>
            <div
              className={[
                baseInput,
                error
                  ? "border border-status-overdue-text"
                  : "border border-border focus-within:border-2 focus-within:border-brand-600 focus-within:shadow-focus",
              ].join(" ")}
            >
              <Mail className="size-4 text-muted" aria-hidden />
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t["settings.emailPlaceholder"]}
                className="flex-1 min-w-0 bg-transparent outline-none font-normal text-body text-text placeholder:text-placeholder"
              />
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 self-stretch">
            <Link
              href="/forgot-password"
              className="font-medium text-helper text-brand-600 hover:underline"
            >
              {t["auth.forgotPassword"]}
            </Link>
            <div className="w-full">
              <PasswordInput
                id="login-password"
                label={t["auth.password"]}
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggleShow={() => setShowPassword((v) => !v)}
                error={error ?? undefined}
                helperText={!error ? t["auth.useMinChars"] : undefined}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 min-h-[44px] px-[18px] py-[11px] bg-brand-600 text-white border border-transparent rounded-input font-semibold text-label transition-colors hover:bg-[#176348] disabled:opacity-60"
          >
            {submitting ? t["ui.loggingIn"] : t["nav.logIn"]}
            <ArrowRight className="size-[18px]" aria-hidden />
          </button>
        </form>
      </AuthCard>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <span className="text-muted text-helper">Loading…</span>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
