"use client";

import { useState, useMemo } from "react";
import { formatCLP } from "@/lib/format";
import LineChart, { type MonthData } from "@/components/dashboard/LineChart";
import CategoryCards, { type CategoryData } from "@/components/dashboard/CategoryCards";
import type { ApiTransaction } from "@/lib/api";

// ─── Category inference ──────────────────────────────────────────────────────
// Since tx.category is almost always null, we infer from the description.

const CATEGORY_RULES: { pattern: RegExp; name: string; color: string; icon: string }[] = [
  { pattern: /supermercado|lider|jumbo|unimarc|santa isabel|tottus|acuenta/i, name: "Supermercado", color: "orange", icon: "shopping_cart" },
  { pattern: /restaurant|restoran|starbucks|mcdonalds|burger|pizza|sushi|cafe|coffe/i, name: "Restaurantes", color: "rose", icon: "restaurant" },
  { pattern: /uber|cabify|metro|transantiago|bip!|copec|shell|enex|gasolina|estacion/i, name: "Transporte", color: "blue", icon: "directions_car" },
  { pattern: /farmacia|ahumada|cruz verde|salcobrand/i, name: "Farmacia", color: "rose", icon: "local_pharmacy" },
  { pattern: /netflix|spotify|youtube|disney|hbo|amazon prime|apple/i, name: "Suscripciones", color: "slate", icon: "subscriptions" },
  { pattern: /rappi|pedidosya|uber eats|cornershop/i, name: "Delivery", color: "orange", icon: "delivery_dining" },
];

function inferCategory(tx: ApiTransaction): { name: string; color: string; icon: string } {
  // Use explicit category if present
  if (tx.category) {
    const key = tx.category.toLowerCase();
    const rule = CATEGORY_RULES.find((r) => r.name.toLowerCase() === key);
    if (rule) return { name: rule.name, color: rule.color, icon: rule.icon };
    return { name: tx.category, color: "slate", icon: "category" };
  }

  // Transfers
  if (tx.transaction_type === "transfer_debit") {
    return { name: "Transferencias", color: "blue", icon: "send_money" };
  }

  // Infer from description
  const desc = tx.description;
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(desc)) {
      return { name: rule.name, color: rule.color, icon: rule.icon };
    }
  }

  return { name: "Otros", color: "slate", icon: "category" };
}

// ─── Month helpers ───────────────────────────────────────────────────────────

interface MonthOption {
  year: number;
  month: number;
  label: string;
  shortLabel: string;
}

function getAvailableMonths(): MonthOption[] {
  const now = new Date();
  const months: MonthOption[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
    const shortLabel = d.toLocaleDateString("es-CL", { month: "short" })
      .replace(".", "")
      .replace(/^\w/, (c) => c.toUpperCase())
      .slice(0, 3);

    months.push({ year: d.getFullYear(), month: d.getMonth(), label, shortLabel });
  }

  return months;
}

function filterByMonth(txs: ApiTransaction[], year: number, month: number) {
  return txs.filter((tx) => {
    const d = new Date(tx.transaction_date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

// ─── Compute stats for a month ───────────────────────────────────────────────

function computeMonthStats(monthTxs: ApiTransaction[], prevMonthTxs: ApiTransaction[]) {
  let gastos = 0, ingresos = 0;
  let gastosCount = 0, ingresosCount = 0;

  for (const tx of monthTxs) {
    const amt = Number(tx.amount);
    if (tx.transaction_type === "transfer_credit") {
      ingresos += amt;
      ingresosCount++;
    } else {
      gastos += amt;
      gastosCount++;
    }
  }

  let gastosPrev = 0;
  for (const tx of prevMonthTxs) {
    if (tx.transaction_type !== "transfer_credit") gastosPrev += Number(tx.amount);
  }

  // Only show variation if there's meaningful data in both months
  const variacion = gastosPrev > 0 && gastos > 0
    ? ((gastos - gastosPrev) / gastosPrev) * 100
    : 0;

  return { gastos, ingresos, gastosCount, ingresosCount, totalCount: monthTxs.length, variacion };
}

function computeCategories(txs: ApiTransaction[]): CategoryData[] {
  const outflows = txs.filter((tx) => tx.transaction_type !== "transfer_credit");
  const total = outflows.reduce((sum, tx) => sum + Number(tx.amount), 0);
  if (total === 0) return [];

  const groups: Record<string, { amount: number; count: number; color: string; icon: string }> = {};
  for (const tx of outflows) {
    const cat = inferCategory(tx);
    if (!groups[cat.name]) groups[cat.name] = { amount: 0, count: 0, color: cat.color, icon: cat.icon };
    groups[cat.name].amount += Number(tx.amount);
    groups[cat.name].count++;
  }

  return Object.entries(groups)
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 4)
    .map(([name, data]) => ({
      name,
      amount: data.amount,
      count: data.count,
      percent: Math.round((data.amount / total) * 100),
      color: data.color,
      icon: data.icon,
    }));
}

function computeMonthlyChart(txs: ApiTransaction[], months: MonthOption[]): MonthData[] {
  return months.map((m) => {
    const total = txs
      .filter((tx) => {
        const d = new Date(tx.transaction_date);
        return (
          tx.transaction_type !== "transfer_credit" &&
          d.getFullYear() === m.year &&
          d.getMonth() === m.month
        );
      })
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    return { label: m.shortLabel.toUpperCase(), total, month: m.label };
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DashboardContent({
  transactions,
}: {
  transactions: ApiTransaction[];
}) {
  const months = useMemo(() => getAvailableMonths(), []);
  const [selectedIdx, setSelectedIdx] = useState(months.length - 1);

  const selected = months[selectedIdx];
  const monthlyChart = useMemo(() => computeMonthlyChart(transactions, months), [transactions, months]);

  const monthTxs = useMemo(
    () => filterByMonth(transactions, selected.year, selected.month),
    [transactions, selected]
  );

  const prevMonth = selectedIdx > 0 ? months[selectedIdx - 1] : null;
  const prevMonthTxs = useMemo(
    () => prevMonth ? filterByMonth(transactions, prevMonth.year, prevMonth.month) : [],
    [transactions, prevMonth]
  );

  const stats = useMemo(
    () => computeMonthStats(monthTxs, prevMonthTxs),
    [monthTxs, prevMonthTxs]
  );

  const categories = useMemo(() => computeCategories(monthTxs), [monthTxs]);

  const mesLabel = selected.label;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="space-y-4">
        {/* Amount */}
        <h2
          className="text-5xl font-semibold tabular text-[var(--on-surface)]"
          style={{ letterSpacing: "-0.02em" }}
        >
          {formatCLP(stats.gastos)}
        </h2>

        {/* Sub-stats */}
        <div className="flex items-center gap-6">
          {stats.ingresos > 0 && (
            <p className="text-[var(--success-text)] text-sm font-medium tabular">
              Ingresos: {formatCLP(stats.ingresos)}
            </p>
          )}
          <p className="text-[var(--tertiary-text)] text-sm">
            {stats.totalCount > 0
              ? `${stats.totalCount} transacciones`
              : "Sin transacciones este mes"}
          </p>
        </div>
      </section>

      {/* Line Chart — highlight selected month */}
      <LineChart months={monthlyChart} selectedIdx={selectedIdx} />

      {/* Category Cards */}
      <CategoryCards categories={categories} />
    </div>
  );
}
