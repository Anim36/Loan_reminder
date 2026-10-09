"use client";

/**
 * QueryErrorState — the page-level "request failed, try again" block.
 *
 * Distinct from `EmptyState`: an empty list means "you have no loans
 * yet" (action: add one). A failed query means "we couldn't even ask
 * the server" (action: retry). Conflating them is what made the
 * Dashboard and Loans list look like "no data" when the request
 * actually errored.
 *
 * Uses the i18n keys `app.error.title`, `app.error.body`,
 * `app.error.retry`. A custom `message` prop overrides the body copy
 * (also looked up in the dictionary). The error itself is logged to
 * the console on mount so a developer can read the real cause from
 * the browser DevTools — the user never sees the raw error.
 */

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

import { useT } from "@/lib/i18n/LanguageProvider";

export interface QueryErrorStateProps {
  /** The thrown value (React Query's `error`). Logged to the console;
   *  never rendered to the user. */
  error?: unknown;
  /** Retry callback — usually the query's `refetch()`. */
  onRetry: () => void;
  /** Override the body copy (i18n key). Falls back to `app.error.body`. */
  messageKey?: "app.error.body" | "errors.api.server_error";
  /** Optional CSS class on the outer card. */
  className?: string;
}

export function QueryErrorState({
  error,
  onRetry,
  messageKey = "app.error.body",
  className = "",
}: QueryErrorStateProps) {
  const { t } = useT();

  useEffect(() => {
    // Log the real cause on the server-side / client console so a
    // developer can debug. The user never sees this string.
    if (error) {
      console.error("[QueryErrorState] retry-able error:", error);
    }
  }, [error]);

  const body =
    typeof t[messageKey] === "string"
      ? (t[messageKey] as string)
      : (t["app.error.body"] as string);

  return (
    <div
      role="alert"
      aria-live="polite"
      data-node-id="query-error-state"
      className={[
        "flex w-full flex-col items-center gap-4 rounded-card border border-status-overdue-border bg-status-overdue-bg p-6 sm:p-8",
        className,
      ].join(" ")}
    >
      <div className="flex size-12 items-center justify-center rounded-pill bg-status-overdue-text/10 text-status-overdue-text">
        <AlertTriangle className="size-5" aria-hidden />
      </div>
      <div className="flex w-full max-w-md flex-col items-center gap-2 text-center">
        <p className="font-semibold text-card-heading text-text">
          {t["app.error.title"]}
        </p>
        <p className="font-normal text-helper text-muted">{body}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center justify-center gap-2 rounded-input bg-brand-600 px-4 py-2 text-helper font-semibold text-white transition-colors hover:bg-[#176348] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
      >
        <RotateCw className="size-4" aria-hidden />
        {t["app.error.retry"]}
      </button>
    </div>
  );
}
