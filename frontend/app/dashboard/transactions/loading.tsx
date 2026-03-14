export default function TransactionsLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-7 w-40 bg-[var(--bg-elevated)] rounded-[var(--radius)]" />
        <div className="h-4 w-56 bg-[var(--bg-elevated)] rounded-[var(--radius)] mt-2" />
      </div>

      {/* Filter tabs skeleton */}
      <div className="flex gap-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] p-1 w-fit">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-24 bg-[var(--bg-elevated)] rounded-[var(--radius)]" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 w-16 bg-[var(--bg-surface)] rounded" />
          ))}
        </div>

        {/* Rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 border-b border-[var(--border-subtle)]"
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-[var(--bg-elevated)] shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-3.5 w-3/4 bg-[var(--bg-elevated)] rounded" />
                <div className="h-3 w-1/2 bg-[var(--bg-elevated)] rounded" />
              </div>
            </div>
            <div className="h-6 w-20 bg-[var(--bg-elevated)] rounded-full" />
            <div className="h-3 w-16 bg-[var(--bg-elevated)] rounded" />
            <div className="h-3 w-12 bg-[var(--bg-elevated)] rounded" />
            <div className="h-4 w-20 bg-[var(--bg-elevated)] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
