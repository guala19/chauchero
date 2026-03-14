import Header from "@/components/Header";
import KpiCards from "@/components/KpiCards";
import MonthlyChart from "@/components/MonthlyChart";
import CategoryDonut from "@/components/CategoryDonut";
import RecentTransactions from "@/components/RecentTransactions";

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-[1200px] px-6">
      <Header />

      <div className="space-y-6 pb-12">
        {/* KPI Cards */}
        <KpiCards />

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <MonthlyChart />
          </div>
          <div className="lg:col-span-2">
            <CategoryDonut />
          </div>
        </div>

        {/* Recent transactions */}
        <RecentTransactions />
      </div>
    </div>
  );
}
