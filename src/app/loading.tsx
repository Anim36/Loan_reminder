/**
 * Top-level loading skeleton. Shown by Next.js when a route segment
 * above (app) is rendering (rare; the (app) group has its own).
 */
export default function GlobalLoading() {
  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-bg"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading…</span>
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-pill bg-brand-50" />
        <p className="font-medium text-helper text-muted">Loading Loan Reminder…</p>
      </div>
    </div>
  );
}
