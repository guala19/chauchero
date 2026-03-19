export default function DashboardLoading() {
  return (
    <div className="mr-0 xl:mr-[272px]">
      <div className="space-y-8 animate-pulse">
        {/* Hero skeleton */}
        <div className="space-y-4">
          <div className="h-4 w-28 bg-[var(--surface-container)] rounded" />
          <div className="h-14 w-64 bg-[var(--surface-container)] rounded-lg" />
          <div className="h-4 w-40 bg-[var(--surface-container)] rounded" />
        </div>

        {/* Chart skeleton */}
        <div className="bg-[var(--surface-container)] rounded-2xl ghost-border h-[280px]" />

        {/* Categories skeleton */}
        <div className="space-y-6">
          <div className="h-5 w-40 bg-[var(--surface-container)] rounded" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[var(--surface-container)] rounded-2xl ghost-border h-32" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
