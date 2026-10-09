"use client";

/**
 * Route-level error boundary. Shown when a server component in the
 * (app) shell throws (e.g. a service call rejects, or an SSR-only
 * invariant is broken).
 */
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error in the dev console; in production this is the
    // single place we'd hook Sentry/Datadog later.
    console.error("App route crashed:", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-6 py-16 text-center">
      <p className="eyebrow">
        Something went wrong
      </p>
      <h1 className="text-h1 font-semibold tracking-[-0.02em] text-text">
        We couldn’t load this page
      </h1>
      <p className="text-body text-muted">
        {error.message || "An unexpected error occurred."}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <Link
          href="/dashboard"
          className="font-normal text-body text-muted underline-offset-4 hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
