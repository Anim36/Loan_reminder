"use client";

/**
 * Figma reference: Loan Reminder · Authentication
 *   Log in  10:3794 (desktop) / 10:3831 (mobile)
 *   Sign up 10:3712 (desktop) / 10:3753 (mobile)
 *
 * The auth card is a single client component: it owns the brand
 * mark, the title + subtitle, the form body, the "Continue with
 * Google" button and the privacy reassurance. All copy is taken
 * from the language dictionary via `useT()`.
 */

import Link from "next/link";
import { HandCoins, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { type ReactNode } from "react";
import { useT } from "@/lib/i18n/LanguageProvider";

export interface AuthCardProps {
  /** Heading (DM Sans 36px, font-semibold). */
  title: string;
  /** Subhead (DM Sans 14px muted). */
  subtitle: string;
  /** Form body — composed by the calling page. */
  children: ReactNode;
  /** "Continue with Google" button — disabled by default for the mock. */
  onGoogle?: () => void;
  /** Footer text + link below the divider. */
  footerPrompt: string;
  footerLinkLabel: string;
  footerLinkHref: string;
}

export function AuthCard({
  title,
  subtitle,
  children,
  onGoogle,
  footerPrompt,
  footerLinkLabel,
  footerLinkHref,
}: AuthCardProps) {
  const { t } = useT();
  return (
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
        <div className="flex w-full flex-col gap-3 leading-[1.5]">
          <h1 className="font-semibold text-auth-heading tracking-[-0.02em] text-text">{title}</h1>
          <p className="font-normal text-subtitle text-muted">{subtitle}</p>
        </div>

        {children}

        {onGoogle ? (
          <>
            <div className="flex w-full items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="font-normal text-helper text-muted">
                {t["auth.dividerOr"]}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <button
              type="button"
              onClick={onGoogle}
              className="flex w-full items-center justify-center gap-2 rounded-input border border-border bg-surface px-[18px] py-[11px] min-h-[44px] font-semibold text-label text-text transition-colors hover:bg-brand-50 hover:text-brand-600"
            >
              {/* Chrome mark — single-stroke monogram, mirrors the Figma
                  chrome icon at 18px. */}
              <ChromeMark className="size-[18px] shrink-0" aria-hidden />
              {t["auth.continueWithGoogle"]}
            </button>
          </>
        ) : null}

        <p className="text-center font-normal text-helper text-muted">
          {footerPrompt}{" "}
          <Link
            href={footerLinkHref}
            className="font-medium text-brand-600 hover:underline"
          >
            {footerLinkLabel}
          </Link>
        </p>
      </div>

      {/* Privacy reassurance — sits below the card, centred. */}
      <div
        data-node-id="10:3748"
        className="flex items-center gap-2"
      >
        <ShieldCheck className="size-4 text-muted" aria-hidden />
        <p className="font-normal text-helper text-muted">
          {t["auth.privacyNotice"]}
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Chrome mark — inline SVG so we don't pull in an extra icon library.
 * Single-colour brand mark using the text color.
 * ------------------------------------------------------------------------- */

function ChromeMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 8.8h8.5" />
      <path d="M9 13.6 5.1 21" />
      <path d="M15 13.6 18.9 21" />
    </svg>
  );
}

/* ---------------------------------------------------------------------------
 * Local password input — same shell as the UI library's <Input> but with
 * an eye/eye-off toggle. Kept here so the auth pages stay a single read.
 * ------------------------------------------------------------------------- */

const passwordShell =
  "w-full h-[48px] px-[14px] flex items-center gap-[10px] rounded-input border bg-surface overflow-hidden font-normal text-body";

export interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  show: boolean;
  onToggleShow: () => void;
  error?: string;
  helperText?: string;
  autoComplete?: string;
}

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  show,
  onToggleShow,
  error,
  helperText,
  autoComplete = "current-password",
}: PasswordInputProps) {
  const { t } = useT();
  const isError = !!error;
  const borderClass = isError
    ? "border border-status-overdue-text"
    : "border border-border focus-within:border-2 focus-within:border-brand-600 focus-within:shadow-focus";

  return (
    <div className="flex w-full flex-col gap-2">
      <label htmlFor={id} className="font-medium text-label text-text">
        {label}
      </label>
      <div
        className={[passwordShell, borderClass].join(" ")}
        data-state={isError ? "error" : "default"}
      >
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? t["auth.passwordPlaceholder"]}
          autoComplete={autoComplete}
          aria-invalid={isError}
          aria-describedby={isError ? `${id}-err` : helperText ? `${id}-help` : undefined}
          className="flex-1 min-w-0 bg-transparent outline-none font-normal text-body text-text placeholder:text-placeholder"
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? t["auth.hidePassword"] : t["auth.showPassword"]}
          className="shrink-0 size-[18px] flex items-center justify-center text-muted hover:text-text"
        >
          {show ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
        </button>
      </div>
      {isError ? (
        <p id={`${id}-err`} className="font-normal text-helper text-status-overdue-text">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${id}-help`} className="font-normal text-helper text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
