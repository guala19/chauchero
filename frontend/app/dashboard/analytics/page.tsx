import type { Metadata } from "next";
import { cookies } from "next/headers";
import BudgetPage from "@/components/dashboard/BudgetPage";
import { fetchTransactions } from "@/lib/api";

export const metadata: Metadata = { title: "Presupuestos" };

export default async function AnalyticsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    return (
      <div className="space-y-5">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--on-surface)]">Presupuestos</h2>
        <div className="bg-[var(--surface-container)] rounded-xl flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-sm text-[var(--tertiary-text)]">Inicia sesión para gestionar tus presupuestos.</p>
          <a href="/auth/login" className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
            Iniciar sesión con Google
          </a>
        </div>
      </div>
    );
  }

  const transactions = await fetchTransactions(token);
  const budgetsCookie = cookieStore.get("ch-budgets")?.value;
  const budgets = budgetsCookie ? JSON.parse(budgetsCookie) : [];

  return <BudgetPage transactions={transactions} initialBudgets={budgets} />;
}
