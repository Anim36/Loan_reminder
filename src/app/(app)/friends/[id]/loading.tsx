/**
 * Streaming skeleton for /friends/[id]. Mirrors the header + 3 summary
 * cards + loan list shape so the page doesn't flash a different layout
 * while localStorage hydration or future server data resolves.
 */
export default function FriendDetailLoading() {
  return (
    <div
      className="flex w-full flex-col gap-6 p-6 md:p-10"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading friend…</span>
      <div className="flex flex-col gap-3">
        <div className="h-3 w-12 animate-pulse rounded-pill bg-neutral-50" />
        <div className="h-12 w-32 animate-pulse rounded-pill bg-neutral-50" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-card border border-border bg-surface"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-card border border-border bg-surface" />
    </div>
  );
}