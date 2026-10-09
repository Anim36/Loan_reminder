"use client";

/**
 * Root error boundary for the entire app. Catches any uncaught error
 * that bubbles up from a child route or layout.
 */
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App crashed:", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-6 py-16 text-center">
      <p className="eyebrow">
        Something went wrong
      </p>
      <h1 className="text-h1 font-semibold tracking-[-0.02em] text-text">We hit a snag</h1>
      <p className="text-body text-muted">
        {error.message || "An unexpected error occurred."}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <Link
          href="/"
          className="font-normal text-body text-muted underline-offset-4 hover:underline"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
