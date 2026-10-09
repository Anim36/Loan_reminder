"use client";

// Reset password — /reset-password?token=….
//
// Same outer rhythm as the Log in card. The token comes from
// `useSearchParams()`; for the prototype we accept any token and the
// service validates the new password length. After success we swap the
// card body for a "Password updated" state with a Log in button.
//
// All copy is taken from the language dictionary via `useT()`.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  HandCoins,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { AuthToolbar } from "@/components/auth/auth-toolbar";
import { resetPassword, AuthError } from "@/services/authService";
import { useT } from "@/lib/i18n/LanguageProvider";

function buildSchema(t: ReturnType<typeof useT>["t"]) {
  return z
    .object({
      newPassword: z.string().min(8, t["settings.passwordTooShort"]),
      confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      message: t["settings.passwordMismatch"],
      path: ["confirmPassword"],
    });
}

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useT();
  const token = params.get("token") ?? "demo-token";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = buildSchema(t).safeParse({ newPassword, confirmPassword });
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setErrors({
        newPassword: flat.newPassword?.[0],
        confirmPassword: flat.confirmPassword?.[0],
      });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await resetPassword({
        token,
        newPassword: result.data.newPassword,
      });
      setDone(true);
    } catch (err) {
      const code = err instanceof AuthError ? err.code : null;
      let msg: string;
      if (code === "invalid_token") {
        msg = t["auth.tokenInvalid"];
      } else if (code === "password_too_short") {
        msg = t["settings.passwordTooShort"];
      } else if (code === "rate_limited") {
        msg = t["auth.rateLimited"];
      } else if (err instanceof Error) {
        msg = err.message;
      } else {
        msg = t["app.error.body"];
      }
      setErrors({ newPassword: msg });
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
          {done ? (
            <DoneState onLogin={() => router.push("/login")} />
          ) : (
            <>
              <div className="flex w-full flex-col gap-3 leading-[1.5]">
                <h1 className="font-semibold text-auth-heading tracking-[-0.02em] text-text">
                  {t["auth.resetTitle"]}
                </h1>
                <p className="font-normal text-subtitle text-muted">
                  {t["auth.resetSubtitle"]}
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                noValidate
                className="flex w-full flex-col gap-6"
              >
                <PasswordField
                  id="reset-new"
                  label={t["auth.newPassword"]}
                  value={newPassword}
                  onChange={setNewPassword}
                  error={errors.newPassword}
                  helperText={t["auth.useMinChars"]}
                />
                <PasswordField
                  id="reset-confirm"
                  label={t["auth.confirmPassword"]}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  error={errors.confirmPassword}
                />

                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                  icon={<ArrowRight size={18} aria-hidden />}
                  className="w-full"
                >
                  {submitting ? t["auth.updating"] : t["auth.sendReset"]}
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

function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  helperText,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  helperText?: string;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <label htmlFor={id} className="font-medium text-label text-text">
        {label}
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
          id={id}
          type="password"
          autoComplete="new-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent outline-none font-normal text-body text-text placeholder:text-placeholder"
        />
        <Lock className="size-[18px] shrink-0 text-muted" aria-hidden />
      </div>
      {error ? (
        <p className="font-normal text-helper text-status-overdue-text">
          {error}
        </p>
      ) : helperText ? (
        <p className="font-normal text-helper text-muted">{helperText}</p>
      ) : null}
    </div>
  );
}

function DoneState({ onLogin }: { onLogin: () => void }) {
  const { t } = useT();
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex size-12 items-center justify-center rounded-pill bg-brand-50">
        <ArrowRight className="size-5 text-brand-600" aria-hidden />
      </div>
      <div className="flex w-full flex-col gap-3 leading-[1.5]">
        <h1 className="font-semibold text-auth-heading tracking-[-0.02em] text-text">
          {t["auth.passwordReset"]}
        </h1>
        <p className="font-normal text-subtitle text-muted">
          {t["auth.passwordResetSub"]}
        </p>
      </div>
      <button
        type="button"
        onClick={onLogin}
        className="inline-flex w-full items-center justify-center gap-2 rounded-input bg-brand-600 px-[18px] py-[11px] min-h-[44px] font-semibold text-label text-white transition-colors hover:bg-[#176348]"
      >
        {t["auth.logInTitle"]}
        <ArrowRight size={16} aria-hidden />
      </button>
      <Link
        href="/login"
        className="inline-flex w-full items-center justify-center gap-2 font-normal text-helper text-muted hover:text-text"
      >
        <ArrowLeft size={14} aria-hidden />
        {t["auth.goToLogin"]}
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <span className="text-muted text-helper">Loading…</span>
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
