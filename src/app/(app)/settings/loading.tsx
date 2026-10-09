/**
 * Streaming skeleton for /settings. Mirrors the 5-card rhythm so the
 * page doesn't flash a different shape when localStorage hydration runs.
 */
export default function SettingsLoading() {
  return (
    <div
      className="flex w-full flex-col gap-6 p-6 md:p-10"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading settings…</span>

      <div className="flex flex-col gap-2">
        <div className="h-3 w-32 animate-pulse rounded-pill bg-neutral-50" />
        <div className="h-10 w-72 animate-pulse rounded-input bg-neutral-50" />
        <div className="h-3 w-96 animate-pulse rounded-pill bg-neutral-50" />
      </div>

      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-56 animate-pulse rounded-card border border-border bg-surface"
        />
      ))}
    </div>
  );
}