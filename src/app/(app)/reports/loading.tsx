// Loading skeleton for /reports. Mirrors the report layout with
// muted brand-50 placeholders so the first paint feels weighty.

export default function ReportsLoading() {
  return (
    <section
      data-node-id="reports-skeleton"
      className="flex w-full flex-col gap-6 p-6"
      aria-busy
      aria-live="polite"
    >
      <div className="h-10 w-48 animate-pulse rounded-input bg-brand-50" />
      <div className="h-6 w-72 animate-pulse rounded-input bg-brand-50" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-card bg-brand-50"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-card bg-brand-50" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="h-64 animate-pulse rounded-card bg-brand-50" />
        <div className="h-64 animate-pulse rounded-card bg-brand-50" />
      </div>
    </section>
  );
}
