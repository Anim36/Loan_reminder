/**
 * Root 404. Shown when a URL doesn't match any route in the app.
 */
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

export default function GlobalNotFound() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <p className="eyebrow">
        Page not found
      </p>
      <h1 className="text-h1 font-semibold tracking-[-0.02em] text-text">This page wandered off</h1>
      <p className="text-body text-muted">
        Let’s get you back to the dashboard.
      </p>
      <EmptyState type="Loans" />
      <Link
        href="/dashboard"
        className="font-normal text-body text-muted underline-offset-4 hover:underline"
      >
        ← Go to dashboard
      </Link>
    </div>
  );
}
