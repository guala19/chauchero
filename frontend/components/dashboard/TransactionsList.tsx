"use client";

import { useState, useMemo, useCallback } from "react";
import { formatCLP, formatRelativeDate } from "@/lib/format";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import TransactionDrawer, { type Transaction } from "@/components/ui/TransactionDrawer";
import type { ApiTransaction } from "@/lib/api";

// ─── Category inference (same logic as DashboardContent) ─────────────────────

const CATEGORY_RULES: { pattern: RegExp; name: string; icon: string; dotColor: string; badgeBg: string; badgeText: string }[] = [
  { pattern: /supermercado|lider|jumbo|unimarc|santa isabel|tottus|acuenta/i, name: "Supermercado", icon: "shopping_cart", dotColor: "bg-[#B87A3D]", badgeBg: "bg-[#F5EDE0]", badgeText: "text-[#8B5E2A]" },
  { pattern: /restaurant|restoran|starbucks|mcdonalds|burger|pizza|sushi|cafe|coffe/i, name: "Restaurantes", icon: "restaurant", dotColor: "bg-[#B86B7A]", badgeBg: "bg-[#F5E8EC]", badgeText: "text-[#8C4A5A]" },
  { pattern: /uber|cabify|metro|transantiago|bip!|copec|shell|enex|gasolina|estacion/i, name: "Transporte", icon: "commute", dotColor: "bg-[#5B8FA8]", badgeBg: "bg-[#E8F0F4]", badgeText: "text-[#3D6B82]" },
  { pattern: /farmacia|ahumada|cruz verde|salcobrand/i, name: "Farmacia", icon: "local_pharmacy", dotColor: "bg-[#B86B7A]", badgeBg: "bg-[#F5E8EC]", badgeText: "text-[#8C4A5A]" },
  { pattern: /netflix|spotify|youtube|disney|hbo|amazon prime|apple/i, name: "Suscripciones", icon: "subscriptions", dotColor: "bg-[#8B7BA8]", badgeBg: "bg-[#F0ECF5]", badgeText: "text-[#5A4D6E]" },
  { pattern: /rappi|pedidosya|uber eats|cornershop/i, name: "Delivery", icon: "delivery_dining", dotColor: "bg-[#B87A3D]", badgeBg: "bg-[#F5EDE0]", badgeText: "text-[#8B5E2A]" },
  { pattern: /enel|aguas|engie|vtr|movistar|claro|wom|entel/i, name: "Servicios", icon: "bolt", dotColor: "bg-[#9E8E86]", badgeBg: "bg-[#F2EDE6]", badgeText: "text-[#6B5C54]" },
];

function inferCategory(tx: ApiTransaction) {
  if (tx.transaction_type === "transfer_credit") {
    return { name: "Transferencias", icon: "payments", dotColor: "bg-[#7BA88B]", badgeBg: "bg-[#E8F2EC]", badgeText: "text-[#4D7A5D]" };
  }
  if (tx.transaction_type === "transfer_debit") {
    return { name: "Transferencias", icon: "send_money", dotColor: "bg-[#7BA88B]", badgeBg: "bg-[#E8F2EC]", badgeText: "text-[#4D7A5D]" };
  }
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(tx.description)) return rule;
  }
  return { name: "Otros", icon: "receipt_long", dotColor: "bg-[#9E8E86]", badgeBg: "bg-[#F2EDE6]", badgeText: "text-[#6B5C54]" };
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

// ─── Drawer converter ────────────────────────────────────────────────────────

function toDrawerTx(tx: ApiTransaction): Transaction {
  const typeMap = { debit: "expense" as const, transfer_debit: "transfer" as const, transfer_credit: "income" as const };
  const isIncome = tx.transaction_type === "transfer_credit";
  return {
    id: tx.id,
    description: tx.description,
    amount: isIncome ? tx.amount : -tx.amount,
    type: typeMap[tx.transaction_type],
    date: new Date(tx.transaction_date).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" }),
    bank: "Banco de Chile",
    confidence: tx.parser_confidence,
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

// ─── Filter types ────────────────────────────────────────────────────────────

type FilterType = "gastos" | "ingresos";
type TimeFilter = "7D" | "1M" | "3M" | "6M" | "1A" | "Todo";

// ─── Component ───────────────────────────────────────────────────────────────

export default function TransactionsList({ transactions }: { transactions: ApiTransaction[] }) {
  const [typeFilter, setTypeFilter] = useState<FilterType>("gastos");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("6M");
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ApiTransaction | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(transactions.filter((t) => t.notes).map((t) => [t.id, t.notes!]))
  );

  // Time filter
  const timeFiltered = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    if (timeFilter === "7D") cutoff.setDate(now.getDate() - 7);
    else if (timeFilter === "1M") cutoff.setMonth(now.getMonth() - 1);
    else if (timeFilter === "3M") cutoff.setMonth(now.getMonth() - 3);
    else if (timeFilter === "6M") cutoff.setMonth(now.getMonth() - 6);
    else if (timeFilter === "1A") cutoff.setFullYear(now.getFullYear() - 1);
    else return transactions; // "Todo"
    return transactions.filter((tx) => new Date(tx.transaction_date) >= cutoff);
  }, [transactions, timeFilter]);

  // Type filter
  const typeFiltered = useMemo(() => {
    if (typeFilter === "ingresos") return timeFiltered.filter((tx) => tx.transaction_type === "transfer_credit");
    return timeFiltered.filter((tx) => tx.transaction_type !== "transfer_credit");
  }, [timeFiltered, typeFilter]);

  // Quick filter (category)
  const filtered = useMemo(() => {
    if (!quickFilter) return typeFiltered;
    if (quickFilter === "Altos montos") return typeFiltered.filter((tx) => Number(tx.amount) >= 50000);
    if (quickFilter === "Sin Categoría") return typeFiltered.filter((tx) => inferCategory(tx).name === "Otros");
    return typeFiltered.filter((tx) => inferCategory(tx).name === quickFilter);
  }, [typeFiltered, quickFilter]);

  // KPIs
  const kpis = useMemo(() => {
    let gastos = 0, ingresos = 0;
    for (const tx of timeFiltered) {
      if (tx.transaction_type === "transfer_credit") ingresos += Number(tx.amount);
      else gastos += Number(tx.amount);
    }
    return { gastos, ingresos, balance: ingresos - gastos };
  }, [timeFiltered]);

  // Category summary for right panel
  const categorySummary = useMemo(() => {
    const outflows = timeFiltered.filter((tx) => tx.transaction_type !== "transfer_credit");
    const total = outflows.reduce((sum, tx) => sum + Number(tx.amount), 0);
    if (total === 0) return [];
    const groups: Record<string, number> = {};
    for (const tx of outflows) {
      const cat = inferCategory(tx);
      groups[cat.name] = (groups[cat.name] ?? 0) + Number(tx.amount);
    }
    return Object.entries(groups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, amount]) => ({ name, percent: Math.round((amount / total) * 100) }));
  }, [timeFiltered]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSaveNote = useCallback((id: string, note: string) => {
    setNotes((prev) => ({ ...prev, [id]: note }));
  }, []);

  const QUICK_FILTERS = ["Supermercados", "Delivery", "Suscripciones", "Sin Categoría", "Altos montos"];

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (transactions.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-[28px] font-black tracking-tighter text-[var(--on-surface)]">Transacciones</h1>
        <div className="bg-[var(--surface-container)] rounded-xl p-20 flex flex-col items-center gap-4">
          <MaterialIcon name="sync" className="text-[48px] text-[var(--tertiary-text)]" />
          <p className="text-sm text-[var(--tertiary-text)]">Pulsa Sincronizar para analizar tus correos de Banco de Chile.</p>
        </div>
      </div>
    );
  }

  // ── Main view ───────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex">
        {/* Center content */}
        <div className="flex-1 min-w-0 space-y-8">
          {/* Title */}
          <div className="flex items-baseline gap-4">
            <h1 className="text-[28px] font-black tracking-tighter text-[var(--on-surface)]">Transacciones</h1>
            <span className="text-[var(--tertiary-text)] font-medium text-sm">{transactions.length} movimientos sincronizados</span>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-5">
            <div className="bg-[var(--surface-container)] p-6 rounded-xl">
              <p className="text-xs text-[var(--on-surface-variant)] font-semibold uppercase tracking-wider mb-2">Total gastos</p>
              <p className="text-2xl font-black tabular text-[var(--on-surface)]">-{formatCLP(kpis.gastos)}</p>
            </div>
            <div className="bg-[var(--surface-container)] p-6 rounded-xl">
              <p className="text-xs text-[var(--on-surface-variant)] font-semibold uppercase tracking-wider mb-2">Total ingresos</p>
              <p className="text-2xl font-black tabular text-[var(--success-text)]">+{formatCLP(kpis.ingresos)}</p>
            </div>
            <div className="bg-[var(--surface-container)] p-6 rounded-xl">
              <p className="text-xs text-[var(--on-surface-variant)] font-semibold uppercase tracking-wider mb-2">Balance neto</p>
              <p className={`text-2xl font-black tabular ${kpis.balance >= 0 ? "text-[var(--success-text)]" : "text-[var(--on-surface)]"}`}>
                {kpis.balance >= 0 ? "+" : "-"}{formatCLP(Math.abs(kpis.balance))}
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex items-center justify-between">
            <div className="flex bg-[var(--surface-container)] p-1 rounded-md text-xs font-bold text-[var(--on-surface-variant)]">
              {(["7D", "1M", "3M", "6M", "1A", "Todo"] as TimeFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => { setTimeFilter(f); setPage(1); }}
                  className={`px-4 py-1.5 transition-colors ${
                    timeFilter === f
                      ? "bg-[var(--surface)] text-[var(--on-surface)] rounded-sm"
                      : "hover:text-[var(--on-surface)]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex bg-[var(--surface-container)] p-1 rounded-md">
                <button
                  onClick={() => { setTypeFilter("gastos"); setPage(1); }}
                  className={`px-4 py-1.5 text-xs font-bold transition-colors ${
                    typeFilter === "gastos"
                      ? "bg-[var(--surface)] text-[var(--on-surface)] rounded-sm"
                      : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
                  }`}
                >
                  Gastos
                </button>
                <button
                  onClick={() => { setTypeFilter("ingresos"); setPage(1); }}
                  className={`px-4 py-1.5 text-xs font-bold transition-colors ${
                    typeFilter === "ingresos"
                      ? "bg-[var(--surface)] text-[var(--on-surface)] rounded-sm"
                      : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
                  }`}
                >
                  Ingresos
                </button>
              </div>
            </div>
          </div>

          {/* Transaction List */}
          <div className="space-y-2">
            {pageItems.length === 0 ? (
              <div className="bg-[var(--surface-container)] rounded-lg p-12 text-center text-sm text-[var(--tertiary-text)]">
                Sin transacciones en este período.
              </div>
            ) : (
              pageItems.map((tx) => {
                const cat = inferCategory(tx);
                const isCredit = tx.transaction_type === "transfer_credit";
                return (
                  <button
                    key={tx.id}
                    onClick={() => setSelected(tx)}
                    className="w-full flex items-center gap-4 p-4 bg-[var(--surface-container)] rounded-lg hover:bg-[#E5E2DD] transition-colors group text-left"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${cat.dotColor} shrink-0`} />
                    <div className="w-10 h-10 rounded-full bg-[var(--surface)] flex items-center justify-center shrink-0">
                      <MaterialIcon name={cat.icon} className={`text-[var(--on-surface-variant)] ${isCredit ? "!text-[var(--success-text)]" : ""}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[var(--on-surface)] truncate">{tx.description}</h4>
                      <p className="text-xs text-[var(--tertiary-text)]">{formatTxTime(tx.transaction_date)} • Banco de Chile</p>
                    </div>
                    <div className={`px-3 py-1 ${cat.badgeBg} rounded-full text-[10px] font-bold ${cat.badgeText} uppercase tracking-tight shrink-0`}>
                      {cat.name}
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className={`font-black tabular ${isCredit ? "text-[var(--success-text)]" : "text-[var(--on-surface)]"}`}>
                        {isCredit ? "+" : "-"}{formatCLP(tx.amount)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center gap-4 pt-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="w-8 h-8 flex items-center justify-center text-[var(--tertiary-text)] hover:bg-[var(--surface-container)] rounded-lg transition-colors disabled:opacity-30"
                >
                  <MaterialIcon name="chevron_left" />
                </button>
                <div className="flex gap-2">
                  {pageNumbers(safePage, totalPages).map((n, i) =>
                    n === "…" ? (
                      <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-[var(--tertiary-text)] text-sm">…</span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                          n === safePage
                            ? "bg-[var(--on-surface)] text-white"
                            : "text-[var(--tertiary-text)] hover:bg-[var(--surface-container)]"
                        }`}
                      >
                        {n}
                      </button>
                    )
                  )}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="w-8 h-8 flex items-center justify-center text-[var(--tertiary-text)] hover:bg-[var(--surface-container)] rounded-lg transition-colors disabled:opacity-30"
                >
                  <MaterialIcon name="chevron_right" />
                </button>
              </div>
              <p className="text-[11px] text-[var(--tertiary-text)] font-medium">
                Mostrando {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length}
              </p>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <aside className="hidden xl:block w-[280px] pl-8 shrink-0">
          {/* Month Summary */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--on-surface)]">Resumen</h3>
            </div>
            <div className="space-y-5">
              {categorySummary.map((cat) => (
                <div key={cat.name} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-[var(--on-surface)]">
                    <span>{cat.name}</span>
                    <span className="tabular">{cat.percent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#E5E2DD] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--primary)] rounded-full transition-all duration-500" style={{ width: `${cat.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connection Card */}
          <div className="bg-[var(--surface-lowest)] p-6 rounded-xl mb-10">
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

          {/* Quick Filters */}
          <div>
            <h3 className="text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-widest mb-4">Filtros rápidos</h3>
            <div className="flex flex-wrap gap-2">
              {QUICK_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => { setQuickFilter(quickFilter === f ? null : f); setPage(1); }}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-full cursor-pointer transition-colors ${
                    quickFilter === f
                      ? "bg-[var(--on-surface)] text-white"
                      : "bg-[#E5E2DD] text-[var(--on-surface-variant)] hover:bg-[var(--on-surface)] hover:text-white"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <TransactionDrawer
        transaction={selected ? toDrawerTx(selected) : null}
        note={selected ? (notes[selected.id] ?? "") : ""}
        onClose={() => setSelected(null)}
        onSaveNote={handleSaveNote}
      />
    </>
  );
}
