/**
 * Streaming skeleton for /friends. Mirrors the table rhythm so the
 * page doesn't flash a different shape while localStorage hydrates.
 */
export default function FriendsLoading() {
  return (
    <div
      className="flex w-full flex-col gap-6 p-6 md:p-10"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading friends…</span>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-32 animate-pulse rounded-pill bg-neutral-50" />
        <div className="h-10 w-72 animate-pulse rounded-input bg-neutral-50" />
        <div className="h-3 w-96 animate-pulse rounded-pill bg-neutral-50" />
      </div>
      <div className="h-12 w-full animate-pulse rounded-input bg-neutral-50" />
      <div className="h-72 animate-pulse rounded-card border border-border bg-surface" />
    </div>
  );
}