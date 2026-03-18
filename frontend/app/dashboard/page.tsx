import { cookies } from "next/headers";
import { ArrowUpRight, ArrowDownLeft, TrendingUp } from "lucide-react";
import { formatCLPCompact } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MonthlyBarChart, { type MonthData } from "@/components/dashboard/MonthlyBarChart";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import ActivityDonut, { type DonutSegment } from "@/components/dashboard/ActivityDonut";
import { fetchTransactions, type ApiTransaction } from "@/lib/api";

// ─── Aggregation helpers ───────────────────────────────────────────────────────

const CATEGORY_COLORS = ["#EF4444", "#818CF8", "#F0A500", "#22C55E", "#A855F7", "#EC4899"];

function computeStats(txs: ApiTransaction[]) {
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth();

  let gastoMes = 0, ingresosMes = 0, txMesCount = 0;
  let totalGastos = 0, totalIngresos = 0;

  for (const tx of txs) {
    const d = new Date(tx.transaction_date);
    const amt = Number(tx.amount);
    const isThisMonth = d.getFullYear() === curY && d.getMonth() === curM;
    const isCredit = tx.transaction_type === "transfer_credit";

    if (isCredit) {
      totalIngresos += amt;
      if (isThisMonth) { ingresosMes += amt; txMesCount++; }
    } else {
      totalGastos += amt;
      if (isThisMonth) { gastoMes += amt; txMesCount++; }
    }
  }

  return { gastoMes, ingresosMes, txMesCount, totalGastos, totalIngresos };
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
      .slice(0, 3);
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

function computeSegments(txs: ApiTransaction[]): { segments: DonutSegment[]; total: number } {
  const outflows = txs.filter((tx) => tx.transaction_type !== "transfer_credit");
  const total = outflows.reduce((sum, tx) => sum + Number(tx.amount), 0);
  if (total === 0) return { segments: [], total: 0 };

  const groups: Record<string, number> = {};
  for (const tx of outflows) {
    const key =
      tx.category ??
      (tx.transaction_type === "transfer_debit" ? "Transferencias" : "Gastos");
    groups[key] = (groups[key] ?? 0) + Number(tx.amount);
  }

  const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  const segments: DonutSegment[] = sorted.map(([label, amount], i) => ({
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    pct: (amount / total) * 100,
    label,
    amount,
  }));

  return { segments, total };
}

// ─── Stat cards ───────────────────────────────────────────────────────────────

function GastoMesCard({ amount, count }: { amount: number; count: number }) {
  const now = new Date();
  const mes = now.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
  return (
    <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="size-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <ArrowUpRight className="size-3.5 text-primary" />
          </div>
          <span className="text-[11px] text-primary/70 capitalize">{mes}</span>
        </div>
        <div className="flex items-end justify-between gap-2">
          <p className="text-[26px] font-bold font-mono tabular-nums leading-none text-foreground">
            {formatCLPCompact(amount)}
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary shrink-0">
            {count} transacción{count !== 1 ? "es" : ""}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function TotalGastosCard({ amount, count }: { amount: number; count: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="size-7 rounded-lg bg-ch-red-dim flex items-center justify-center">
            <ArrowUpRight className="size-3.5 text-ch-red" />
          </div>
          <span className="text-[11px] text-muted-foreground">Total Gastos</span>
        </div>
        <div className="flex items-end justify-between gap-2">
          <p className="text-[26px] font-bold font-mono tabular-nums text-foreground leading-none">
            {formatCLPCompact(amount)}
          </p>
          <span className="text-[11px] text-muted-foreground shrink-0">
            {count} transacc.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function TotalIngresosCard({ amount, count }: { amount: number; count: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="size-7 rounded-lg bg-ch-green-dim flex items-center justify-center">
            <ArrowDownLeft className="size-3.5 text-ch-green" />
          </div>
          <span className="text-[11px] text-muted-foreground">Total Ingresos</span>
        </div>
        <div className="flex items-end justify-between gap-2">
          <p className="text-[26px] font-bold text-ch-green leading-none">
            {formatCLPCompact(amount)}
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ch-green shrink-0">
            <TrendingUp className="size-3" />
            {count} transacc.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  let transactions: ApiTransaction[] = [];
  if (token) {
    try { transactions = await fetchTransactions(token); } catch { /* backend unavailable */ }
  }

  const { gastoMes, ingresosMes: _ingresosMes, txMesCount, totalGastos, totalIngresos } =
    computeStats(transactions);
  const monthlyData = computeMonthly(transactions);
  const { segments, total: donutTotal } = computeSegments(transactions);

  const outflowCount = transactions.filter((t) => t.transaction_type !== "transfer_credit").length;
  const incomeCount  = transactions.filter((t) => t.transaction_type === "transfer_credit").length;
  const recentFour   = transactions.slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {transactions.length > 0
            ? `${transactions.length} transacciones · Banco de Chile`
            : "Sincroniza para ver tus transacciones"}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_272px] gap-5">
        <div className="space-y-5 min-w-0">
          <MonthlyBarChart months={monthlyData} />
          <RecentTransactions transactions={recentFour} />
        </div>

        <div className="space-y-4">
          <GastoMesCard amount={gastoMes} count={txMesCount} />
          <TotalGastosCard amount={totalGastos} count={outflowCount} />
          <TotalIngresosCard amount={totalIngresos} count={incomeCount} />
          <ActivityDonut segments={segments} total={donutTotal} txCount={transactions.length} />
        </div>
      </div>
    </div>
  );
}
