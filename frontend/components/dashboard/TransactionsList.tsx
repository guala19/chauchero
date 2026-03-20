"use client";

import { useState, useMemo, useCallback } from "react";
import { formatCLP } from "@/lib/format";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import TransactionDrawer, { type Transaction } from "@/components/ui/TransactionDrawer";
import type { ApiTransaction } from "@/lib/api";

// ─── Category styling ───────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, { icon: string; dot: string; pillBg: string; pillText: string }> = {
  "Supermercado":    { icon: "shopping_cart",    dot: "#B87A3D", pillBg: "#F5EDE0", pillText: "#8B5E2A" },
  "Alimentación":    { icon: "restaurant",       dot: "#B86B7A", pillBg: "#F5E8EC", pillText: "#8C4A5A" },
  "Delivery":        { icon: "delivery_dining",  dot: "#B87A3D", pillBg: "#F5EDE0", pillText: "#8B5E2A" },
  "Transporte":      { icon: "commute",          dot: "#5B8FA8", pillBg: "#E8F0F4", pillText: "#3D6B82" },
  "Entretenimiento": { icon: "subscriptions",    dot: "#8B7BA8", pillBg: "#EFEBF4", pillText: "#635580" },
  "Salud":           { icon: "local_pharmacy",   dot: "#7BA8A2", pillBg: "#E8F2F0", pillText: "#4D7A74" },
  "Servicios":       { icon: "bolt",             dot: "#9E8E86", pillBg: "#F2EDE6", pillText: "#6B5C54" },
  "Combustible":     { icon: "local_gas_station",dot: "#A8885B", pillBg: "#F2ECE0", pillText: "#7A6340" },
  "Educación":       { icon: "school",           dot: "#5B8FA8", pillBg: "#E8F0F4", pillText: "#3D6B82" },
  "Compras":         { icon: "shopping_bag",     dot: "#A87B5B", pillBg: "#F2E8E0", pillText: "#7A5A40" },
  "Transferencia":   { icon: "send_money",       dot: "#7BA88B", pillBg: "#E8F2EC", pillText: "#4D7A5D" },
  "Otros":           { icon: "receipt_long",     dot: "#9E8E86", pillBg: "#F2EDE6", pillText: "#6B5C54" },
};

const DEFAULT_STYLE = CATEGORY_STYLES["Otros"];

// Fallback regex rules for transactions without backend category
const FALLBACK_RULES: { pattern: RegExp; name: string }[] = [
  { pattern: /supermercado|lider|jumbo|unimarc|santa isabel|tottus|acuenta/i, name: "Supermercado" },
  { pattern: /restaurant|restoran|starbucks|mcdonalds|burger|pizza|sushi|cafe|coffe/i, name: "Alimentación" },
  { pattern: /rappi|pedidosya|uber eats|cornershop/i, name: "Delivery" },
  { pattern: /uber|cabify|metro|transantiago|bip!/i, name: "Transporte" },
  { pattern: /netflix|spotify|youtube|disney|hbo|amazon prime/i, name: "Entretenimiento" },
  { pattern: /farmacia|ahumada|cruz verde|salcobrand/i, name: "Salud" },
  { pattern: /enel|aguas|engie|vtr|movistar|claro|wom|entel/i, name: "Servicios" },
  { pattern: /copec|shell|enex|gasolina|estacion/i, name: "Combustible" },
];

function inferCategory(tx: ApiTransaction) {
  // Use backend category if available
  if (tx.category) {
    const style = CATEGORY_STYLES[tx.category] ?? DEFAULT_STYLE;
    return { name: tx.category, ...style };
  }

  // Transfer types
  if (tx.transaction_type === "transfer_credit" || tx.transaction_type === "transfer_debit") {
    return { name: "Transferencia", ...CATEGORY_STYLES["Transferencia"] };
  }

  // Fallback regex matching
  for (const rule of FALLBACK_RULES) {
    if (rule.pattern.test(tx.description)) {
      const style = CATEGORY_STYLES[rule.name] ?? DEFAULT_STYLE;
      return { name: rule.name, ...style };
    }
  }

  return { name: "Otros", ...DEFAULT_STYLE };
}

function formatTxTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  const time = d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return time;
  if (diffDays === 1) return `Ayer, ${time}`;
  return `${d.toLocaleDateString("es-CL", { day: "numeric", month: "short" })}, ${time}`;
}

function toDrawerTx(tx: ApiTransaction): Transaction {
  const typeMap = { debit: "expense" as const, transfer_debit: "transfer" as const, transfer_credit: "income" as const };
  const isIncome = tx.transaction_type === "transfer_credit";
  return {
    id: tx.id, description: tx.description,
    amount: isIncome ? tx.amount : -tx.amount,
    type: typeMap[tx.transaction_type],
    date: new Date(tx.transaction_date).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" }),
    bank: "Banco de Chile", confidence: tx.parser_confidence,
  };
}

// ─── Pagination ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

type FilterType = "gastos" | "ingresos";

// ─── Month helpers ──────────────────────────────────────────────────────────

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function getMonthOptions() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  // Show all 12 months, starting from current month going back
  const options: { year: number; month: number; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    options.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_LABELS[d.getMonth()] });
  }
  return options;
}

// ─── All categories (matching backend) ──────────────────────────────────────

const ALL_CATEGORIES = [
  "Supermercado", "Alimentación", "Delivery", "Transporte", "Entretenimiento",
  "Salud", "Servicios", "Combustible", "Educación", "Compras", "Transferencia", "Otros",
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function TransactionsList({ transactions }: { transactions: ApiTransaction[] }) {
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [typeFilter, setTypeFilter] = useState<FilterType>("gastos");
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(monthOptions.length - 1);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ApiTransaction | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(transactions.filter((t) => t.notes).map((t) => [t.id, t.notes!]))
  );

  const selectedMonth = monthOptions[selectedMonthIdx];

  const monthFiltered = useMemo(() => {
    return transactions.filter((tx) => {
      const d = new Date(tx.transaction_date);
      return d.getFullYear() === selectedMonth.year && d.getMonth() === selectedMonth.month;
    });
  }, [transactions, selectedMonth]);

  const typeFiltered = useMemo(() => {
    if (typeFilter === "ingresos") return monthFiltered.filter((tx) => tx.transaction_type === "transfer_credit");
    return monthFiltered.filter((tx) => tx.transaction_type !== "transfer_credit");
  }, [monthFiltered, typeFilter]);

  const filtered = useMemo(() => {
    if (!categoryFilter) return typeFiltered;
    return typeFiltered.filter((tx) => {
      const cat = tx.category || inferCategory(tx).name;
      return cat === categoryFilter;
    });
  }, [typeFiltered, categoryFilter]);

  const kpis = useMemo(() => {
    let gastos = 0, ingresos = 0;
    for (const tx of monthFiltered) {
      if (tx.transaction_type === "transfer_credit") ingresos += Number(tx.amount);
      else gastos += Number(tx.amount);
    }
    return { gastos, ingresos, balance: ingresos - gastos };
  }, [monthFiltered]);

  const categorySummary = useMemo(() => {
    const outflows = monthFiltered.filter((tx) => tx.transaction_type !== "transfer_credit");
    const total = outflows.reduce((sum, tx) => sum + Number(tx.amount), 0);
    if (total === 0) return [];
    const groups: Record<string, number> = {};
    for (const tx of outflows) {
      const name = tx.category || inferCategory(tx).name;
      groups[name] = (groups[name] ?? 0) + Number(tx.amount);
    }
    return Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([name, amount]) => ({ name, percent: Math.round((amount / total) * 100) }));
  }, [monthFiltered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const handleSaveNote = useCallback((id: string, note: string) => { setNotes((prev) => ({ ...prev, [id]: note })); }, []);

  if (transactions.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-[28px] font-black tracking-tighter text-[var(--on-surface)]">Transacciones</h1>
        <div className="bg-[var(--surface-container)] rounded-xl p-20 flex flex-col items-center gap-4">
          <MaterialIcon name="sync" className="text-[48px] text-[var(--tertiary-text)]" />
          <p className="text-sm text-[var(--tertiary-text)]">Pulsa Sincronizar para analizar tus correos.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main content — respects shell margins */}
      <div className="space-y-8">
        {/* Title */}
        <div className="flex items-baseline gap-4">
          <h1 className="text-[28px] font-black tracking-tighter text-[var(--on-surface)]">Transacciones</h1>
          <span className="text-[var(--tertiary-text)] font-medium text-sm">{transactions.length} movimientos sincronizados</span>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-5">
          <div className="bg-[var(--surface-container)] p-6 rounded-xl">
            <p className="text-xs text-[var(--on-surface-variant)] font-semibold uppercase tracking-wider mb-2">Total gastos</p>
            <p className="text-2xl font-black tabular text-[var(--on-surface)]">-$ {kpis.gastos.toLocaleString("es-CL")}</p>
          </div>
          <div className="bg-[var(--surface-container)] p-6 rounded-xl">
            <p className="text-xs text-[var(--on-surface-variant)] font-semibold uppercase tracking-wider mb-2">Total ingresos</p>
            <p className="text-2xl font-black tabular text-[var(--success-text)]">+$ {kpis.ingresos.toLocaleString("es-CL")}</p>
          </div>
          <div className="bg-[var(--surface-container)] p-6 rounded-xl">
            <p className="text-xs text-[var(--on-surface-variant)] font-semibold uppercase tracking-wider mb-2">Balance neto</p>
            <p className={`text-2xl font-black tabular ${kpis.balance >= 0 ? "text-[var(--success-text)]" : "text-[var(--on-surface)]"}`}>
              {kpis.balance >= 0 ? "+$ " : "-$ "}{Math.abs(kpis.balance).toLocaleString("es-CL")}
            </p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex bg-[var(--surface-container)] p-1 rounded-md text-xs font-bold text-[var(--on-surface-variant)] overflow-x-auto">
            {monthOptions.map((m, i) => (
              <button key={`${m.year}-${m.month}`} onClick={() => { setSelectedMonthIdx(i); setPage(1); }}
                className={`px-3 py-1.5 transition-colors whitespace-nowrap ${i === selectedMonthIdx ? "bg-[var(--surface)] text-[var(--on-surface)] rounded-sm" : "hover:text-[var(--on-surface)]"}`}>
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex bg-[var(--surface-container)] p-1 rounded-md shrink-0">
            <button onClick={() => { setTypeFilter("gastos"); setPage(1); }}
              className={`px-4 py-1.5 text-xs font-bold transition-colors ${typeFilter === "gastos" ? "bg-[var(--surface)] text-[var(--on-surface)] rounded-sm" : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"}`}>
              Gastos
            </button>
            <button onClick={() => { setTypeFilter("ingresos"); setPage(1); }}
              className={`px-4 py-1.5 text-xs font-bold transition-colors ${typeFilter === "ingresos" ? "bg-[var(--surface)] text-[var(--on-surface)] rounded-sm" : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"}`}>
              Ingresos
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setCategoryFilter(null); setPage(1); }}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-full transition-colors ${
              !categoryFilter ? "bg-[var(--on-surface)] text-white" : "bg-[var(--surface-container)] text-[var(--on-surface-variant)] hover:bg-[var(--on-surface)] hover:text-white"
            }`}>
            Todas
          </button>
          {ALL_CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => { setCategoryFilter(categoryFilter === cat ? null : cat); setPage(1); }}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-full transition-colors ${
                categoryFilter === cat ? "bg-[var(--on-surface)] text-white" : "bg-[var(--surface-container)] text-[var(--on-surface-variant)] hover:bg-[var(--on-surface)] hover:text-white"
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Transaction List */}
        <div className="space-y-2">
          {pageItems.length === 0 ? (
            <div className="bg-[var(--surface-container)] rounded-lg p-12 text-center text-sm text-[var(--tertiary-text)]">
              Sin transacciones en este período.
            </div>
          ) : pageItems.map((tx) => {
            const cat = inferCategory(tx);
            const isCredit = tx.transaction_type === "transfer_credit";
            return (
              <button key={tx.id} onClick={() => setSelected(tx)}
                className="w-full flex items-center gap-4 p-4 bg-[var(--surface-container)] rounded-lg hover:bg-[#E5E2DD] transition-colors text-left">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.dot }} />
                <div className="w-10 h-10 rounded-full bg-[var(--surface)] flex items-center justify-center shrink-0">
                  <MaterialIcon name={cat.icon} className={isCredit ? "text-[var(--success-text)]" : "text-[var(--on-surface-variant)]"} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[var(--on-surface)] truncate">{tx.description}</h4>
                  <p className="text-xs text-[var(--tertiary-text)]">{formatTxTime(tx.transaction_date)} • Banco de Chile</p>
                </div>
                <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight shrink-0"
                  style={{ backgroundColor: cat.pillBg, color: cat.pillText }}>
                  {cat.name}
                </div>
                <div className="text-right ml-4 shrink-0">
                  <p className={`font-black tabular ${isCredit ? "text-[var(--success-text)]" : "text-[var(--on-surface)]"}`}>
                    {isCredit ? "+$ " : "-$ "}{Number(tx.amount).toLocaleString("es-CL")}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col items-center gap-4 pt-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
                className="w-8 h-8 flex items-center justify-center text-[var(--tertiary-text)] hover:bg-[var(--surface-container)] rounded-lg transition-colors disabled:opacity-30">
                <MaterialIcon name="chevron_left" />
              </button>
              <div className="flex gap-2">
                {pageNumbers(safePage, totalPages).map((n, i) =>
                  n === "…" ? <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-[var(--tertiary-text)] text-sm">…</span>
                  : <button key={n} onClick={() => setPage(n)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${n === safePage ? "bg-[var(--on-surface)] text-white" : "text-[var(--tertiary-text)] hover:bg-[var(--surface-container)]"}`}>
                      {n}
                    </button>
                )}
              </div>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                className="w-8 h-8 flex items-center justify-center text-[var(--tertiary-text)] hover:bg-[var(--surface-container)] rounded-lg transition-colors disabled:opacity-30">
                <MaterialIcon name="chevron_right" />
              </button>
            </div>
            <p className="text-[11px] text-[var(--tertiary-text)] font-medium">
              Mostrando {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length}
            </p>
          </div>
        )}
      </div>

      {/* Right Panel — fixed, same position as dashboard right panel */}
      <aside className="hidden xl:flex fixed right-0 top-0 h-full w-[272px] bg-[var(--surface-container)] border-l border-[var(--outline)] p-6 pt-8 flex-col gap-10 overflow-y-auto z-50">
        {/* Category Summary */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-[var(--on-surface)] mb-6">Resumen</h3>
          <div className="space-y-5">
            {categorySummary.map((cat) => (
              <div key={cat.name} className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-[var(--on-surface)]">
                  <span>{cat.name}</span>
                  <span className="tabular">{cat.percent}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#E5E2DD] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--primary)] rounded-full" style={{ width: `${cat.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Connection Card */}
        <div className="bg-[var(--surface)] p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-widest">Conexión</h3>
            <div className="w-2 h-2 rounded-full bg-[var(--success-text)]" style={{ boxShadow: "0 0 8px rgba(58,125,94,0.4)" }} />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[var(--surface-container)] flex items-center justify-center">
              <MaterialIcon name="account_balance" className="text-sm" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--on-surface)]">Banco de Chile</p>
              <p className="text-[10px] text-[var(--tertiary-text)]">Sincronizado</p>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div>
          <h3 className="text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-widest mb-4">Categorías</h3>
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => { setCategoryFilter(categoryFilter === cat ? null : cat); setPage(1); }}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-full transition-colors ${
                  categoryFilter === cat
                    ? "bg-[var(--on-surface)] text-white"
                    : "bg-[#E5E2DD] text-[var(--on-surface-variant)] hover:bg-[var(--on-surface)] hover:text-white"
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <TransactionDrawer
        transaction={selected ? toDrawerTx(selected) : null}
        note={selected ? (notes[selected.id] ?? "") : ""}
        onClose={() => setSelected(null)}
        onSaveNote={handleSaveNote}
      />
    </>
  );
}
