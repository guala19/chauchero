export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page title */}
      <div>
        <div className="h-7 w-32 bg-[var(--bg-elevated)] rounded-[var(--radius)]" />
        <div className="h-4 w-56 bg-[var(--bg-elevated)] rounded-[var(--radius)] mt-2" />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_272px] gap-5">
        {/* Left column */}
        <div className="space-y-5 min-w-0">
          {/* Chart skeleton */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] h-64" />
          {/* Recent transactions skeleton */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] p-5 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="size-9 rounded-full bg-[var(--bg-elevated)] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-3/4 bg-[var(--bg-elevated)] rounded" />
                  <div className="h-3 w-1/2 bg-[var(--bg-elevated)] rounded" />
                </div>
                <div className="h-4 w-20 bg-[var(--bg-elevated)] rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] h-24"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
