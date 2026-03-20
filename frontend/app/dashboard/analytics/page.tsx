import type { Metadata } from "next";
import BudgetPage from "@/components/dashboard/BudgetPage";

export const metadata: Metadata = { title: "Presupuestos" };

export default function AnalyticsPage() {
  return <BudgetPage />;
}
