export default function AccountsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-7 w-28 bg-[var(--bg-elevated)] rounded-[var(--radius)]" />
        <div className="h-4 w-64 bg-[var(--bg-elevated)] rounded-[var(--radius)] mt-2" />
      </div>

      {/* Account card skeleton */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
          <div className="size-8 rounded-lg bg-[var(--bg-elevated)]" />
          <div className="space-y-2">
            <div className="h-3.5 w-32 bg-[var(--bg-elevated)] rounded" />
            <div className="h-3 w-16 bg-[var(--bg-elevated)] rounded" />
          </div>
        </div>
        <div className="px-5 py-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-[var(--bg-elevated)]" />
              <div className="space-y-2">
                <div className="h-3 w-24 bg-[var(--bg-elevated)] rounded" />
                <div className="h-3.5 w-40 bg-[var(--bg-elevated)] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Banks skeleton */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] h-48" />
    </div>
  );
}
