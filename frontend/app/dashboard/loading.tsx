export default function DashboardLoading() {
  return (
    <div className="xl:mr-[272px]">
      <div className="space-y-7 animate-pulse">
        {/* Hero skeleton */}
        <div className="space-y-3">
          <div className="h-4 w-28 bg-secondary rounded" />
          <div className="h-12 w-56 bg-secondary rounded-lg" />
          <div className="h-4 w-40 bg-secondary rounded" />
        </div>

        {/* Chart skeleton */}
        <div className="bg-secondary rounded-2xl ghost-border h-[280px]" />

        {/* Categories skeleton */}
        <div className="space-y-4">
          <div className="h-5 w-40 bg-secondary rounded" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-secondary rounded-xl ghost-border h-24" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
