"use client";

import { useState, useMemo } from "react";
import { formatCLP } from "@/lib/format";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import LineChart, { type MonthData } from "@/components/dashboard/LineChart";
import CategoryCards, { type CategoryData } from "@/components/dashboard/CategoryCards";
import type { ApiTransaction } from "@/lib/api";

// ─── Category config ─────────────────────────────────────────────────────────

const CAT_CONFIG: Record<string, { color: string; icon: string }> = {
  supermercado: { color: "orange", icon: "shopping_cart" },
  alimentación: { color: "orange", icon: "shopping_cart" },
  transporte: { color: "blue", icon: "directions_car" },
  restaurante: { color: "rose", icon: "restaurant" },
  restaurantes: { color: "rose", icon: "restaurant" },
  transferencias: { color: "blue", icon: "send_money" },
  gastos: { color: "orange", icon: "receipt_long" },
  otros: { color: "slate", icon: "category" },
};

// ─── Month helpers ───────────────────────────────────────────────────────────

interface MonthOption {
  year: number;
  month: number;
  label: string;
  shortLabel: string;
}

function getAvailableMonths(txs: ApiTransaction[]): MonthOption[] {
  const now = new Date();
  const months: MonthOption[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
    const shortLabel = d.toLocaleDateString("es-CL", { month: "short" })
      .replace(".", "")
      .replace(/^\w/, (c) => c.toUpperCase())
      .slice(0, 3);

    months.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label,
      shortLabel,
    });
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
  let gastos = 0, ingresos = 0, count = 0;
  for (const tx of monthTxs) {
    const amt = Number(tx.amount);
    if (tx.transaction_type === "transfer_credit") ingresos += amt;
    else gastos += amt;
    count++;
  }

  let gastosPrev = 0;
  for (const tx of prevMonthTxs) {
    if (tx.transaction_type !== "transfer_credit") gastosPrev += Number(tx.amount);
  }

  const variacion = gastosPrev > 0
    ? ((gastos - gastosPrev) / gastosPrev) * 100
    : 0;

  return { gastos, ingresos, count, variacion };
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
    .map(([name, data]) => {
      const cfg = CAT_CONFIG[name.toLowerCase()] ?? { color: "slate", icon: "category" };
      return {
        name,
        amount: data.amount,
        count: data.count,
        percent: Math.round((data.amount / total) * 100),
        color: cfg.color,
        icon: cfg.icon,
      };
    });
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

    return {
      label: m.shortLabel.toUpperCase(),
      total,
      month: m.label,
    };
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DashboardContent({
  transactions,
}: {
  transactions: ApiTransaction[];
}) {
  const months = useMemo(() => getAvailableMonths(transactions), [transactions]);
  const [selectedIdx, setSelectedIdx] = useState(months.length - 1); // current month

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

  const { gastos, ingresos, count, variacion } = useMemo(
    () => computeMonthStats(monthTxs, prevMonthTxs),
    [monthTxs, prevMonthTxs]
  );

  const categories = useMemo(() => computeCategories(monthTxs), [monthTxs]);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="space-y-4">
        {/* Month selector */}
        <div className="flex items-center gap-3">
          <span className="text-[var(--on-surface-variant)] text-sm font-medium">
            Gastos de
          </span>
          <div className="flex p-0.5 bg-[var(--surface-container)] rounded-lg gap-0.5 border border-[var(--outline)]">
            {months.map((m, i) => (
              <button
                key={`${m.year}-${m.month}`}
                onClick={() => setSelectedIdx(i)}
                className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all capitalize ${
                  i === selectedIdx
                    ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm border border-[var(--outline)]"
                    : "text-[var(--tertiary-text)] hover:text-[var(--on-surface)]"
                }`}
              >
                {m.shortLabel}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-baseline gap-4">
          <h2
            className="text-5xl font-semibold tabular text-[var(--on-surface)]"
            style={{ letterSpacing: "-0.02em" }}
          >
            {formatCLP(gastos)}
          </h2>
          {variacion !== 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--success-bg)] text-[var(--success-text)] rounded-full text-xs font-semibold tabular">
              <span>{variacion > 0 ? "↑" : "↓"}</span>
              {Math.abs(variacion).toFixed(1).replace(".", ",")}% vs mes anterior
            </div>
          )}
        </div>
        <div>
          {ingresos > 0 && (
            <p className="text-[var(--success-text)] text-sm font-medium tabular">
              Ingresos del mes: {formatCLP(ingresos)}
            </p>
          )}
          <p className="text-[var(--tertiary-text)] text-sm mt-1">
            {count > 0
              ? `${count} transacciones`
              : "Sin transacciones este mes"}
          </p>
        </div>
      </section>

      {/* Line Chart */}
      <LineChart months={monthlyChart} />

      {/* Category Cards */}
      <CategoryCards categories={categories} />
    </div>
  );
}
