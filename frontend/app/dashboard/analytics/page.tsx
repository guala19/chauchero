import type { Metadata } from "next";
import { cookies } from "next/headers";
import BudgetPage from "@/components/dashboard/BudgetPage";
import { fetchTransactions, type ApiTransaction } from "@/lib/api";

export const metadata: Metadata = { title: "Presupuestos" };

export default async function AnalyticsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  let transactions: ApiTransaction[] = [];
  if (token) {
    try { transactions = await fetchTransactions(token); } catch { /* backend unavailable */ }
  }

  return <BudgetPage transactions={transactions} />;
}
