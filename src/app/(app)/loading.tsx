/**
 * Streaming skeleton for any (app) route. Mirrors the dashboard shell so
 * the layout feels stable while data resolves (e.g. localStorage hydration
 * or a future server action).
 */
export default function AppLoading() {
  return (
    <div
      className="flex w-full flex-col gap-6 p-6 md:p-10 lg:p-12"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading…</span>

      {/* Date overline + title */}
      <div className="flex flex-col gap-3">
        <div className="h-3 w-32 animate-pulse rounded-pill bg-neutral-50" />
        <div className="h-10 w-72 animate-pulse rounded-input bg-neutral-50" />
        <div className="h-3 w-96 animate-pulse rounded-pill bg-neutral-50" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-card border border-border bg-surface"
          />
        ))}
      </div>

      {/* Recent loans card */}
      <div className="h-72 animate-pulse rounded-card border border-border bg-surface" />
    </div>
  );
}
