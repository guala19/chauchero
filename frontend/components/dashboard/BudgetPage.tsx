"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import type { ApiTransaction } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────

interface BudgetEntry {
  category: string;
  budget: number;
}

interface Props {
  transactions: ApiTransaction[];
  initialBudgets: BudgetEntry[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MONTHS_FULL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const ALL_CATEGORIES = [
  "Supermercado", "Alimentación", "Delivery", "Transporte", "Entretenimiento",
  "Salud", "Servicios", "Combustible", "Educación", "Compras", "Transferencia", "Otros",
];

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  "Supermercado":    { icon: "shopping_cart",     color: "#B87A3D" },
  "Alimentación":    { icon: "restaurant",        color: "#B86B7A" },
  "Delivery":        { icon: "delivery_dining",   color: "#B87A3D" },
  "Transporte":      { icon: "commute",           color: "#5B8FA8" },
  "Entretenimiento": { icon: "subscriptions",     color: "#8B7BA8" },
  "Salud":           { icon: "local_pharmacy",    color: "#7BA8A2" },
  "Servicios":       { icon: "bolt",              color: "#9E8E86" },
  "Combustible":     { icon: "local_gas_station", color: "#A8885B" },
  "Educación":       { icon: "school",            color: "#5B8FA8" },
  "Compras":         { icon: "shopping_bag",      color: "#A87B5B" },
  "Transferencia":   { icon: "send_money",        color: "#7BA88B" },
  "Otros":           { icon: "receipt_long",      color: "#9E8E86" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return Math.abs(n).toLocaleString("es-CL");
}

function inferCategoryName(tx: ApiTransaction): string {
  if (tx.category) return tx.category;
  if (tx.transaction_type === "transfer_credit" || tx.transaction_type === "transfer_debit") return "Transferencia";
  return "Otros";
}

function saveBudgetsCookie(budgets: BudgetEntry[]) {
  document.cookie = `ch-budgets=${JSON.stringify(budgets)};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function BudgetPage({ transactions, initialBudgets }: Props) {
  const router = useRouter();
  const now = new Date();
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const [yearVal, setYearVal] = useState(now.getFullYear());
  const isCurrentMonth = monthIdx === now.getMonth() && yearVal === now.getFullYear();

  const [budgets, setBudgets] = useState<BudgetEntry[]>(initialBudgets);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCategory, setEditCategory] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [newBudget, setNewBudget] = useState("");

  // ── Month navigation ────────────────────────────────────────────────────

  function prevMonth() {
    if (monthIdx === 0) { setMonthIdx(11); setYearVal((y) => y - 1); }
    else setMonthIdx((m) => m - 1);
  }
  function nextMonth() {
    if (monthIdx === 11) { setMonthIdx(0); setYearVal((y) => y + 1); }
    else setMonthIdx((m) => m + 1);
  }

  // ── Budget CRUD ─────────────────────────────────────────────────────────

  const updateBudgets = useCallback((next: BudgetEntry[]) => {
    setBudgets(next);
    saveBudgetsCookie(next);
  }, []);

  function handleAddBudget() {
    if (!newCategory || !newBudget) return;
    const amount = parseInt(newBudget.replace(/\D/g, ""), 10);
    if (!amount || amount <= 0) return;
    const exists = budgets.find((b) => b.category === newCategory);
    let next: BudgetEntry[];
    if (exists) {
      next = budgets.map((b) => b.category === newCategory ? { ...b, budget: amount } : b);
    } else {
      next = [...budgets, { category: newCategory, budget: amount }];
    }
    updateBudgets(next);
    setNewCategory("");
    setNewBudget("");
    setShowAddModal(false);
  }

  function handleEditBudget(category: string, amount: number) {
    const next = budgets.map((b) => b.category === category ? { ...b, budget: amount } : b);
    updateBudgets(next);
    setEditCategory(null);
  }

  function handleDeleteBudget(category: string) {
    updateBudgets(budgets.filter((b) => b.category !== category));
  }

  // ── Real spending data ──────────────────────────────────────────────────

  const monthTxs = useMemo(() => {
    return transactions.filter((tx) => {
      const d = new Date(tx.transaction_date);
      return d.getFullYear() === yearVal && d.getMonth() === monthIdx;
    });
  }, [transactions, yearVal, monthIdx]);

  const spendingByCategory = useMemo(() => {
    const groups: Record<string, number> = {};
    for (const tx of monthTxs) {
      if (tx.transaction_type === "transfer_credit") continue;
      const cat = inferCategoryName(tx);
      groups[cat] = (groups[cat] ?? 0) + Number(tx.amount);
    }
    return groups;
  }, [monthTxs]);

  const totalSpent = useMemo(() => {
    return Object.values(spendingByCategory).reduce((a, b) => a + b, 0);
  }, [spendingByCategory]);

  const totalBudget = useMemo(() => {
    return budgets.reduce((a, b) => a + b.budget, 0);
  }, [budgets]);

  const pct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const available = totalBudget - totalSpent;

  // ── Category cards data ─────────────────────────────────────────────────

  const categoryCards = useMemo(() => {
    return budgets.map((b) => {
      const spent = spendingByCategory[b.category] ?? 0;
      const catPct = b.budget > 0 ? Math.round((spent / b.budget) * 100) : 0;
      const meta = CATEGORY_META[b.category] ?? { icon: "category", color: "#9E8E86" };
      return { ...b, spent, percent: catPct, isExceeded: spent > b.budget, ...meta };
    });
  }, [budgets, spendingByCategory]);

  // ── Right panel ranking ─────────────────────────────────────────────────

  const ranking = useMemo(() => {
    return [...categoryCards]
      .sort((a, b) => b.percent - a.percent)
      .map((c) => ({ name: c.category, percentage: c.percent, color: c.color }));
  }, [categoryCards]);

  // ── Projection ──────────────────────────────────────────────────────────

  const projection = useMemo(() => {
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(yearVal, monthIdx + 1, 0).getDate();
    const progress = Math.ceil((dayOfMonth / daysInMonth) * 4);
    if (!isCurrentMonth || dayOfMonth <= 1 || totalSpent === 0) {
      return { total: totalSpent, savings: available, progress };
    }
    const dailyRate = totalSpent / dayOfMonth;
    const projected = Math.round(dailyRate * daysInMonth);
    const savings = totalBudget - projected;
    return { total: projected, savings, progress };
  }, [totalSpent, totalBudget, available, yearVal, monthIdx, isCurrentMonth, now]);

  // ── Available categories to add ─────────────────────────────────────────

  const usedCategories = new Set(budgets.map((b) => b.category));
  const availableCategories = ALL_CATEGORIES.filter((c) => !usedCategories.has(c));

  // ── Navigate to transactions with filters ───────────────────────────────

  function goToTransactions(category: string) {
    router.push(`/dashboard/transactions?month=${monthIdx}&category=${encodeURIComponent(category)}`);
  }

  return (
    <>
      <div className="space-y-8">
        {/* Title */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#1C0F0A]">Presupuestos</h2>
          <span className="text-[10px] text-[#6B5C54] font-bold tracking-[0.1em] uppercase">Gestión mensual</span>
        </div>

        {/* Hero Cards */}
        <div className="grid grid-cols-2 gap-6">
          {/* Monthly Budget */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#F2EDE6]/50">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[10px] font-bold text-[#6B5C54] uppercase tracking-widest">Presupuesto Mensual</span>
              <span className="text-[10px] font-bold text-[#1C0F0A] tabular uppercase">
                {totalBudget > 0 ? `${pct}% utilizado` : "Sin presupuesto"}
              </span>
            </div>
            <div className="mb-6">
              <h3 className="text-3xl font-bold tabular tracking-tighter text-[#1C0F0A]">
                {totalBudget > 0 ? `$ ${fmt(totalBudget)}` : "$ 0"}
              </h3>
              <p className="text-[11px] text-[#6B5C54] mt-1">
                {totalBudget > 0
                  ? `Límite establecido para ${MONTHS_FULL[monthIdx]}`
                  : "Agrega categorías para establecer un presupuesto"}
              </p>
            </div>
            {totalBudget > 0 && (
              <>
                <div className="w-full h-1.5 bg-[#F2EDE6] rounded-full overflow-hidden mb-6">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: pct > 100 ? "#C4522A" : "#1C0F0A",
                    }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-[#6B5C54]">
                  <div className="flex flex-col">
                    <span className="opacity-60">Gastado</span>
                    <span className="text-[#1C0F0A] tabular">$ {fmt(totalSpent)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`opacity-60 ${available >= 0 ? "text-[#3A7D5E]" : "text-[#C4522A]"}`}>
                      {available >= 0 ? "Disponible" : "Excedido"}
                    </span>
                    <span className={`tabular ${available >= 0 ? "text-[#3A7D5E]" : "text-[#C4522A]"}`}>
                      $ {fmt(Math.abs(available))}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Summary Card */}
          <div className="bg-[#1C0F0A] p-6 rounded-2xl text-white relative overflow-hidden">
            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-90">Resumen del mes</span>
              <MaterialIcon name="insights" className="text-[20px] opacity-80" />
            </div>
            <div className="relative z-10 mb-6">
              <h3 className="text-3xl font-bold tabular tracking-tighter">$ {fmt(totalSpent)}</h3>
              <p className="text-[10px] opacity-80 mt-1">Total gastado en {MONTHS_FULL[monthIdx]}</p>
            </div>
            <div className="w-full h-[1px] bg-white/20 mb-6 relative z-10" />
            <div className="flex flex-col gap-3 relative z-10">
              <div className="flex justify-between text-[11px]">
                <span className="opacity-70">Transacciones</span>
                <span className="font-bold tabular">{monthTxs.filter((tx) => tx.transaction_type !== "transfer_credit").length}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="opacity-70">Categorías activas</span>
                <span className="font-bold tabular">{budgets.length}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="opacity-70">Promedio por gasto</span>
                <span className="font-bold tabular">
                  $ {fmt(monthTxs.filter((tx) => tx.transaction_type !== "transfer_credit").length > 0
                    ? Math.round(totalSpent / monthTxs.filter((tx) => tx.transaction_type !== "transfer_credit").length)
                    : 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Grid */}
        {categoryCards.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {categoryCards.map((cat) => {
              const barWidth = Math.min(cat.percent, 100);
              return (
                <button
                  key={cat.category}
                  onClick={() => goToTransactions(cat.category)}
                  className="bg-[#F2EDE6] p-4 rounded-xl h-[150px] flex flex-col justify-between text-left hover:bg-[#EBE5DD] transition-colors group relative"
                  style={cat.isExceeded ? { borderTop: "2px solid rgba(196,82,42,0.2)" } : undefined}
                >
                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteBudget(cat.category); }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-white/60"
                  >
                    <MaterialIcon name="close" className="text-[14px] text-[#6B5C54]" />
                  </button>

                  <div className="flex justify-between items-start">
                    <MaterialIcon name={cat.icon} className="text-[24px]" filled={cat.isExceeded}
                      style={{ color: cat.color } as React.CSSProperties} />
                    {cat.isExceeded ? (
                      <span className="text-[8px] font-bold bg-[#C4522A] text-white px-1.5 py-0.5 rounded uppercase">Excedido</span>
                    ) : (
                      <span className="text-[10px] font-bold text-[#9E8E86] tabular">{cat.percent}%</span>
                    )}
                  </div>
                  <div>
                    <p className="text-[12px] font-bold mb-0.5">{cat.category}</p>
                    <div className="flex justify-between items-end mb-2">
                      <span className={`text-[17px] font-bold tabular ${cat.isExceeded ? "text-[#C4522A]" : ""}`}>
                        $ {fmt(cat.spent)}
                      </span>
                      <span className="text-[9px] text-[#6B5C54] tabular">/ $ {fmt(cat.budget)}</span>
                    </div>
                    <div className="w-full h-1 bg-white rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: cat.isExceeded ? "#C4522A" : (cat.percent > 70 ? "#1C0F0A" : "#6B5C54"),
                        }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Add Button */}
            {availableCategories.length > 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-transparent border-2 border-dashed border-[#8B716A]/30 hover:border-[#C4522A] transition-all rounded-xl h-[150px] flex flex-col items-center justify-center group"
              >
                <MaterialIcon name="add_circle" className="text-3xl text-[#8B716A]/50 group-hover:text-[#C4522A] mb-1" />
                <span className="text-[10px] font-bold text-[#6B5C54] uppercase tracking-widest group-hover:text-[#1C0F0A]">Agregar</span>
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {categoryCards.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16">
            <MaterialIcon name="account_balance_wallet" className="text-[48px] text-[#8B716A]/40" />
            <p className="text-sm text-[#6B5C54]">No tienes categorías de presupuesto aún.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2.5 bg-[#1C0F0A] text-white text-sm font-bold rounded-lg hover:bg-[#2C1F1A] transition-colors"
            >
              Agregar primera categoría
            </button>
          </div>
        )}
      </div>

      {/* Right Panel */}
      <aside className="hidden xl:flex fixed right-0 top-0 h-full w-[272px] bg-[#F2EDE6] p-6 pt-10 flex-col z-50">
        {/* Period Selector */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-[#6B5C54] tracking-[0.2em] uppercase">Período</span>
            <MaterialIcon name="calendar_today" className="text-lg text-[#6B5C54]" />
          </div>
          <div className="flex items-center justify-between bg-white/40 p-4 rounded-xl">
            <div className="flex flex-col">
              <h4 className="text-lg font-bold text-[#1C0F0A]">{MONTHS_FULL[monthIdx]} {yearVal}</h4>
              {isCurrentMonth && (
                <span className="text-[9px] font-bold text-[#C4522A] bg-[#C4522A]/10 px-2 py-0.5 rounded mt-1 w-fit uppercase">Mes activo</span>
              )}
            </div>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="p-1 text-[#6B5C54] hover:text-[#1C0F0A]">
                <MaterialIcon name="chevron_left" className="text-[24px]" />
              </button>
              <button onClick={nextMonth} className="p-1 text-[#6B5C54] hover:text-[#1C0F0A]">
                <MaterialIcon name="chevron_right" className="text-[24px]" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Ranking */}
        {ranking.length > 0 && (
          <div className="mb-auto">
            <h5 className="text-[10px] font-bold text-[#6B5C54] uppercase tracking-widest mb-6">Estado por categoría</h5>
            <div className="space-y-4">
              {ranking.map((r) => (
                <button key={r.name} onClick={() => goToTransactions(r.name)}
                  className="flex items-center gap-3 w-full hover:bg-white/30 rounded-lg px-2 py-1 -mx-2 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: r.percentage > 100 ? "#C4522A" : r.color }} />
                  <span className="text-sm text-[#1C0F0A] font-medium">{r.name}</span>
                  <span className={`text-sm font-bold tabular ml-auto ${
                    r.percentage > 100 ? "text-[#C4522A]" :
                    r.percentage >= 70 ? "text-[#1C0F0A]" : ""
                  }`}>
                    {r.percentage}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Projection Card */}
        {isCurrentMonth && totalBudget > 0 && (
          <div className="bg-[#FAF7F2] p-6 rounded-2xl mt-6">
            <div className="flex items-center gap-2 mb-4">
              <MaterialIcon name="insights" className="text-sm text-[#C4522A]" />
              <span className="text-[10px] font-bold text-[#6B5C54] uppercase tracking-widest">Proyección mensual</span>
            </div>
            <div className="mb-5">
              <h6 className="text-2xl font-bold tabular tracking-tighter text-[#1C0F0A]">$ {fmt(projection.total)}</h6>
              <p className="text-[11px] text-[#6B5C54] mt-1.5 leading-relaxed">
                {projection.savings > 0 ? (
                  <>Estimamos un <span className="text-[#3A7D5E] font-bold">ahorro de $ {fmt(projection.savings)}</span> al final del mes.</>
                ) : (
                  <>Proyección indica un <span className="text-[#C4522A] font-bold">exceso de $ {fmt(Math.abs(projection.savings))}</span> al final del mes.</>
                )}
              </p>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-1 flex-1 rounded-full ${i <= projection.progress ? "bg-[#C4522A]" : "bg-white"}`} />
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-[400px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-[#1C0F0A]">Agregar categoría</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-[#F2EDE6] rounded-full">
                <MaterialIcon name="close" className="text-[#6B5C54]" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-[#6B5C54] uppercase tracking-wider block mb-2">Categoría</label>
                <div className="flex flex-wrap gap-2">
                  {availableCategories.map((cat) => {
                    const meta = CATEGORY_META[cat];
                    return (
                      <button key={cat} onClick={() => setNewCategory(cat)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-full transition-colors ${
                          newCategory === cat
                            ? "bg-[#1C0F0A] text-white"
                            : "bg-[#F2EDE6] text-[#6B5C54] hover:bg-[#E5DDD5]"
                        }`}>
                        <MaterialIcon name={meta?.icon ?? "category"} className="text-[14px]" />
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#6B5C54] uppercase tracking-wider block mb-2">Presupuesto mensual (CLP)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="Ej: 200000"
                  className="w-full px-4 py-3 bg-[#F2EDE6] rounded-lg text-sm font-bold text-[#1C0F0A] placeholder:text-[#9E8E86] outline-none focus:ring-2 focus:ring-[#1C0F0A]/20"
                />
                {newBudget && (
                  <p className="text-[11px] text-[#6B5C54] mt-1">
                    $ {parseInt(newBudget || "0", 10).toLocaleString("es-CL")}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 text-sm font-bold text-[#6B5C54] bg-[#F2EDE6] rounded-lg hover:bg-[#E5DDD5] transition-colors">
                Cancelar
              </button>
              <button onClick={handleAddBudget} disabled={!newCategory || !newBudget}
                className="flex-1 py-2.5 text-sm font-bold text-white bg-[#1C0F0A] rounded-lg hover:bg-[#2C1F1A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Budget Modal */}
      {editCategory && (
        <EditModal
          category={editCategory}
          currentBudget={budgets.find((b) => b.category === editCategory)?.budget ?? 0}
          onSave={(amount) => handleEditBudget(editCategory, amount)}
          onClose={() => setEditCategory(null)}
        />
      )}
    </>
  );
}

// ─── Edit Modal ─────────────────────────────────────────────────────────────

function EditModal({ category, currentBudget, onSave, onClose }: {
  category: string; currentBudget: number; onSave: (amount: number) => void; onClose: () => void;
}) {
  const [value, setValue] = useState(String(currentBudget));

  function handleSave() {
    const amount = parseInt(value.replace(/\D/g, ""), 10);
    if (amount > 0) onSave(amount);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-[360px] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-[#1C0F0A] mb-4">Editar {category}</h3>
        <input type="text" inputMode="numeric" value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
          className="w-full px-4 py-3 bg-[#F2EDE6] rounded-lg text-sm font-bold text-[#1C0F0A] outline-none focus:ring-2 focus:ring-[#1C0F0A]/20 mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-bold text-[#6B5C54] bg-[#F2EDE6] rounded-lg hover:bg-[#E5DDD5]">Cancelar</button>
          <button onClick={handleSave} className="flex-1 py-2.5 text-sm font-bold text-white bg-[#1C0F0A] rounded-lg hover:bg-[#2C1F1A]">Guardar</button>
        </div>
      </div>
    </div>
  );
}
