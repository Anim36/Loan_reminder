"use client";

/**
 * Figma reference: Loan Reminder · Log in
 *   10:3794 (desktop) / 10:3831 (mobile)
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, ArrowRight } from "lucide-react";

import { AuthCard, PasswordInput } from "@/components/auth/auth-card";
import { AuthToolbar } from "@/components/auth/auth-toolbar";
import { signIn } from "@/services/authService";
import { useT } from "@/lib/i18n/LanguageProvider";

const baseInput =
  "w-full h-[48px] px-[14px] flex items-center gap-[10px] rounded-input border bg-surface overflow-hidden font-normal text-body";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn({ email, password });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/\.$/, "") : t["auth.incorrectPassword"]);
      setSubmitting(false);
    }
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
