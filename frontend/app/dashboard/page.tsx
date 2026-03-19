import { cookies } from "next/headers";
import DashboardContent from "@/components/dashboard/DashboardContent";
import RightPanel from "@/components/dashboard/RightPanel";
import { fetchTransactions, type ApiTransaction } from "@/lib/api";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  let transactions: ApiTransaction[] = [];
  if (token) {
    try { transactions = await fetchTransactions(token); } catch { /* backend unavailable */ }
  }

  const recentSix = transactions.slice(0, 6);

  return (
    <div>
      <DashboardContent transactions={transactions} />
      <RightPanel transactions={recentSix} totalCount={transactions.length} />
    </div>
  );
}
