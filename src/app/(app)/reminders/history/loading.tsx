/**
 * Streaming skeleton for /reminders/history. Mirrors the 3 summary
 * cards + table shape so the page doesn't flash a different layout.
 */
export default function ReminderHistoryLoading() {
  return (
    <div
      className="flex w-full flex-col gap-6 p-6 md:p-10"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading reminder history…</span>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-32 animate-pulse rounded-pill bg-neutral-50" />
        <div className="h-10 w-80 animate-pulse rounded-input bg-neutral-50" />
        <div className="h-3 w-96 animate-pulse rounded-pill bg-neutral-50" />
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
