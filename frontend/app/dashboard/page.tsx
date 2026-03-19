import { cookies } from "next/headers";
import { formatCLP, formatCLPCompact } from "@/lib/format";
import LineChart, { type MonthData } from "@/components/dashboard/LineChart";
import CategoryCards, { type CategoryData } from "@/components/dashboard/CategoryCards";
import RightPanel from "@/components/dashboard/RightPanel";
import { fetchTransactions, type ApiTransaction } from "@/lib/api";

// ─── Category colors ─────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  supermercado: "orange",
  alimentación: "orange",
  transporte: "blue",
  restaurante: "rose",
  restaurantes: "rose",
  transferencias: "blue",
};

// ─── Aggregation helpers ───────────────────────────────────────────────────────

function computeStats(txs: ApiTransaction[]) {
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth();
  const prevM = curM === 0 ? 11 : curM - 1;
  const prevY = curM === 0 ? curY - 1 : curY;

  let gastoMes = 0, ingresosMes = 0, txMesCount = 0;
  let gastoMesAnterior = 0;

  for (const tx of txs) {
    const d = new Date(tx.transaction_date);
    const amt = Number(tx.amount);
    const y = d.getFullYear();
    const m = d.getMonth();
    const isCredit = tx.transaction_type === "transfer_credit";

    if (y === curY && m === curM) {
      if (isCredit) { ingresosMes += amt; }
      else { gastoMes += amt; }
      txMesCount++;
    }
    if (y === prevY && m === prevM && !isCredit) {
      gastoMesAnterior += amt;
    }
  }

  const variacion = gastoMesAnterior > 0
    ? ((gastoMes - gastoMesAnterior) / gastoMesAnterior) * 100
    : 0;

  return { gastoMes, ingresosMes, txMesCount, variacion };
}

function computeMonthly(txs: ApiTransaction[]): MonthData[] {
  const now = new Date();
  const months: MonthData[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const label = d.toLocaleDateString("es-CL", { month: "short" })
      .replace(".", "")
      .replace(/^\w/, (c) => c.toUpperCase())
      .slice(0, 3)
      .toUpperCase();
    const monthStr = d.toLocaleDateString("es-CL", { month: "short", year: "numeric" });

    const total = txs
      .filter((tx) => {
        const td = new Date(tx.transaction_date);
        return (
          tx.transaction_type !== "transfer_credit" &&
          td.getFullYear() === y &&
          td.getMonth() === m
        );
      })
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    months.push({ label, total, month: monthStr });
  }

  return months;
}

function computeCategories(txs: ApiTransaction[]): CategoryData[] {
  const outflows = txs.filter((tx) => tx.transaction_type !== "transfer_credit");
  const total = outflows.reduce((sum, tx) => sum + Number(tx.amount), 0);
  if (total === 0) return [];

  const groups: Record<string, { amount: number; count: number }> = {};
  for (const tx of outflows) {
    const key = tx.category
      ?? (tx.transaction_type === "transfer_debit" ? "Transferencias" : "Otros");
    if (!groups[key]) groups[key] = { amount: 0, count: 0 };
    groups[key].amount += Number(tx.amount);
    groups[key].count++;
  }

  return Object.entries(groups)
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 4)
    .map(([name, data]) => ({
      name,
      amount: data.amount,
      count: data.count,
      percent: Math.round((data.amount / total) * 100),
      color: CAT_COLORS[name.toLowerCase()] ?? "slate",
    }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  let transactions: ApiTransaction[] = [];
  if (token) {
    try { transactions = await fetchTransactions(token); } catch { /* backend unavailable */ }
  }

  const { gastoMes, ingresosMes, txMesCount, variacion } = computeStats(transactions);
  const monthlyData = computeMonthly(transactions);
  const categories = computeCategories(transactions);
  const recentSix = transactions.slice(0, 6);

  const now = new Date();
  const mesLabel = now.toLocaleDateString("es-CL", { month: "long" });

  return (
    <div className="xl:mr-[var(--right-panel-w)]" style={{ "--right-panel-w": "272px" } as React.CSSProperties}>
      <div className="space-y-7">
        {/* Hero Section */}
        <section className="space-y-3">
          <span className="text-muted-foreground text-[13px] font-medium tracking-wide capitalize">
            Gastos de {mesLabel}
          </span>
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2
              className="text-5xl md:text-6xl font-semibold tabular text-foreground"
              style={{ letterSpacing: "-0.02em" }}
            >
              {formatCLP(gastoMes)}
            </h2>
            {variacion !== 0 && (
              <div className="flex items-center gap-1 px-2.5 py-0.5 bg-[var(--success-bg)] text-[var(--success-text)] rounded-full text-[11px] font-semibold tabular">
                <span>{variacion > 0 ? "↑" : "↓"}</span>
                {Math.abs(variacion).toFixed(1).replace(".", ",")}% vs mes anterior
              </div>
            )}
          </div>
          <div>
            {ingresosMes > 0 && (
              <p className="text-[var(--success-text)] text-[13px] font-medium tabular">
                Ingresos del mes: {formatCLP(ingresosMes)}
              </p>
            )}
            <p className="text-muted-foreground text-[13px] mt-0.5">
              {txMesCount > 0
                ? `${txMesCount} transacciones`
                : transactions.length > 0
                ? `${transactions.length} transacciones totales`
                : "Sincroniza para ver tus transacciones"}
            </p>
          </div>
        </section>

        {/* Line Chart */}
        <LineChart months={monthlyData} />

        {/* Category Cards */}
        <CategoryCards categories={categories} />
      </div>

      {/* Right Panel */}
      <RightPanel transactions={recentSix} totalCount={transactions.length} />
    </div>
  );
}
