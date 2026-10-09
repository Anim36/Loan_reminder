/**
 * 404 within the (app) shell. Provides a "back to dashboard" link so
 * the user can recover without losing their session.
 */
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

export default function AppNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-6 py-16">
      <p className="eyebrow">
        Page not found
      </p>
      <h1 className="text-h1 font-semibold tracking-[-0.02em] text-text">We can’t find that page</h1>
      <p className="text-body text-muted">
        The page you’re looking for may have been moved, renamed, or never
        existed. Head back to the dashboard to keep going.
      </p>
      <EmptyState type="Loans" />
      <Link
        href="/dashboard"
        className="font-normal text-body text-muted underline-offset-4 hover:underline"
      >
        ← Back to dashboard
      </Link>
    </div>
  );
}
