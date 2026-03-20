"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { readBudgets, writeBudgets } from "@/lib/budget-cookies";
import { computeBudgetSummary, type BudgetSummary } from "@/lib/budget-compute";
import { DEFAULT_BUDGETS, CATEGORY_COLORS, CATEGORY_ICONS, type BudgetPreferences } from "@/lib/budget-data";
import type { ApiTransaction } from "@/lib/api";

function fmt(n: number): string {
  return Math.abs(n).toLocaleString("es-CL");
}

// ─── Inline Edit Component ───────────────────────────────────────────────────

function InlineEdit({
  value,
  onSave,
  className,
}: {
  value: number;
  onSave: (v: number) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        defaultValue={value}
        onBlur={(e) => {
          const v = parseInt(e.target.value);
          if (v > 0) onSave(v);
          setEditing(false);
        }}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className={`bg-transparent border-b-2 border-[#C4522A] outline-none tabular ${className}`}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`cursor-pointer hover:text-[#C4522A] transition-colors ${className}`}
      title="Click para editar"
    >
      $ {fmt(value)}
    </span>
  );
}

// ─── Setup Flow ──────────────────────────────────────────────────────────────

function SetupFlow({ onSave }: { onSave: (prefs: BudgetPreferences) => void }) {
  const [prefs, setPrefs] = useState<BudgetPreferences>({ ...DEFAULT_BUDGETS });

  return (
    <div className="max-w-2xl mx-auto py-12 space-y-8">
      <div className="text-center space-y-2">
        <MaterialIcon name="savings" className="text-[48px] text-[#C4522A]" />
        <h2 className="text-2xl font-bold text-[#1C0F0A]">Configura tu presupuesto</h2>
        <p className="text-sm text-[#6B5C54]">Define cuánto quieres gastar por categoría cada mes.</p>
      </div>

      {/* Monthly total */}
      <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
        <label className="text-[10px] font-bold text-[#6B5C54] uppercase tracking-widest">Presupuesto mensual total</label>
        <input
          type="number"
          value={prefs.monthlyTotal}
          onChange={(e) => setPrefs({ ...prefs, monthlyTotal: parseInt(e.target.value) || 0 })}
          className="w-full text-3xl font-bold tabular tracking-tighter text-[#1C0F0A] bg-transparent border-b-2 border-[#E8DDD6] focus:border-[#C4522A] outline-none py-2"
        />
      </div>

      {/* Per category */}
      <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
        <label className="text-[10px] font-bold text-[#6B5C54] uppercase tracking-widest">Por categoría</label>
        <div className="space-y-3">
          {prefs.categories.map((cat, i) => {
            const colorKey = cat.name.toLowerCase();
            const colors = CATEGORY_COLORS[colorKey] ?? CATEGORY_COLORS.otros;
            const icon = CATEGORY_ICONS[colorKey] ?? "more_horiz";
            return (
              <div key={cat.name} className="flex items-center gap-4">
                <MaterialIcon name={icon} style={{ color: colors.icon }} className="text-[20px]" />
                <span className="text-sm font-medium text-[#1C0F0A] w-32">{cat.name}</span>
                <div className="flex-1 relative">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-sm text-[#9E8E86]">$</span>
                  <input
                    type="number"
                    value={cat.budget}
                    onChange={(e) => {
                      const updated = [...prefs.categories];
                      updated[i] = { ...cat, budget: parseInt(e.target.value) || 0 };
                      setPrefs({ ...prefs, categories: updated });
                    }}
                    className="w-full pl-4 text-sm font-bold tabular text-[#1C0F0A] bg-transparent border-b border-[#E8DDD6] focus:border-[#C4522A] outline-none py-1"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => onSave(prefs)}
        className="w-full py-3 bg-[#C4522A] text-white rounded-lg font-bold text-sm hover:bg-[#9A3A1A] transition-colors"
      >
        Guardar presupuesto
      </button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BudgetPage({ transactions }: { transactions: ApiTransaction[] }) {
  const [budgets, setBudgets] = useState<BudgetPreferences | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatBudget, setNewCatBudget] = useState("");

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });

  useEffect(() => {
    const saved = readBudgets();
    if (saved) {
      setBudgets(saved);
    } else {
      setShowSetup(true);
    }
    setMounted(true);
  }, []);

  const summary = useMemo<BudgetSummary | null>(() => {
    if (!budgets) return null;
    return computeBudgetSummary(transactions, budgets, selectedMonth.year, selectedMonth.month);
  }, [transactions, budgets, selectedMonth]);

  const isCurrentMonth = now.getFullYear() === selectedMonth.year && now.getMonth() === selectedMonth.month;

  const monthLabel = new Date(selectedMonth.year, selectedMonth.month).toLocaleDateString("es-CL", { month: "long" });
  const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  function save(updated: BudgetPreferences) {
    setBudgets(updated);
    writeBudgets(updated);
  }

  function handleSetupSave(prefs: BudgetPreferences) {
    save(prefs);
    setShowSetup(false);
  }

  function updateTotal(newTotal: number) {
    if (!budgets) return;
    save({ ...budgets, monthlyTotal: newTotal });
  }

  function updateCategoryBudget(name: string, newBudget: number) {
    if (!budgets) return;
    save({
      ...budgets,
      categories: budgets.categories.map((c) =>
        c.name === name ? { ...c, budget: newBudget } : c
      ),
    });
  }

  function removeCategory(name: string) {
    if (!budgets) return;
    save({
      ...budgets,
      categories: budgets.categories.filter((c) => c.name !== name),
    });
  }

  function addCategory() {
    if (!budgets || !newCatName.trim() || !newCatBudget) return;
    save({
      ...budgets,
      categories: [...budgets.categories, { name: newCatName.trim(), budget: parseInt(newCatBudget) || 0 }],
    });
    setNewCatName("");
    setNewCatBudget("");
    setAddingCategory(false);
  }

  function prevMonth() {
    setSelectedMonth((s) => {
      const m = s.month === 0 ? 11 : s.month - 1;
      const y = s.month === 0 ? s.year - 1 : s.year;
      return { year: y, month: m };
    });
  }

  function nextMonth() {
    setSelectedMonth((s) => {
      const m = s.month === 11 ? 0 : s.month + 1;
      const y = s.month === 11 ? s.year + 1 : s.year;
      return { year: y, month: m };
    });
  }

  if (!mounted) return null;
  if (showSetup) return <SetupFlow onSave={handleSetupSave} />;
  if (!budgets || !summary) return null;

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
              <span className="text-[10px] font-bold text-[#1C0F0A] tabular uppercase">{summary.percentage}% utilizado</span>
            </div>
            <div className="mb-6">
              <h3 className="text-3xl font-bold tabular tracking-tighter text-[#1C0F0A]">
                <InlineEdit value={budgets.monthlyTotal} onSave={updateTotal} className="text-3xl font-bold tracking-tighter" />
              </h3>
              <p className="text-[11px] text-[#6B5C54] mt-1">Límite establecido para {monthLabelCap}</p>
            </div>
            <div className="w-full h-1.5 bg-[#F2EDE6] rounded-full overflow-hidden mb-6">
              <div className="h-full bg-[#1C0F0A] rounded-full transition-all duration-500" style={{ width: `${Math.min(summary.percentage, 100)}%` }} />
            </div>
            <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-[#6B5C54]">
              <div className="flex flex-col">
                <span className="opacity-60">Gastado</span>
                <span className="text-[#1C0F0A] tabular">$ {fmt(summary.totalSpent)}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="opacity-60 text-[#3A7D5E]">Disponible</span>
                <span className="text-[#3A7D5E] tabular">$ {fmt(summary.available)}</span>
              </div>
            </div>
          </div>

          {/* Tu Yappa */}
          <div className="bg-[#E8906E] p-6 rounded-2xl text-white relative overflow-hidden">
            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-90">Tu Yappa</span>
              <MaterialIcon name="savings" filled className="text-[20px]" />
            </div>
            <div className="relative z-10 mb-6">
              <h3 className="text-3xl font-bold tabular tracking-tighter">$ {fmt(summary.yappa.total)}</h3>
              <p className="text-[10px] opacity-80 mt-1">Total ahorros automáticos</p>
            </div>
            <div className="w-full h-[1px] bg-white/20 mb-6 relative z-10" />
            <div className="flex flex-col gap-1.5 relative z-10">
              {summary.yappa.history.map((h) => (
                <div
                  key={h.month}
                  className={`flex justify-between text-[11px] px-3 ${
                    h.isCurrent ? "font-bold bg-[#9A3A1A]/40 py-1.5 rounded-lg" : "font-medium opacity-80"
                  }`}
                >
                  <span>{h.month}</span>
                  <span className="tabular">+$ {fmt(h.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-3 gap-4">
          {summary.categories.map((cat) => {
            const isExceeded = cat.status === "exceeded";
            const barPct = Math.min(cat.percentage, 100);

            return (
              <div
                key={cat.name}
                className={`bg-[#F2EDE6] p-4 rounded-xl h-[150px] flex flex-col justify-between relative group ${
                  isExceeded ? "border-t-2 border-[#C4522A]/20" : ""
                }`}
              >
                {/* Remove button */}
                <button
                  onClick={() => removeCategory(cat.name)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[#9E8E86] hover:text-[#C4522A]"
                >
                  <MaterialIcon name="close" className="text-[16px]" />
                </button>

                <div className="flex justify-between items-start">
                  <MaterialIcon name={cat.icon} className="text-[24px]" filled={isExceeded} style={{ color: cat.iconColor }} />
                  {isExceeded ? (
                    <span className="text-[8px] font-bold bg-[#C4522A] text-white px-1.5 py-0.5 rounded uppercase">Excedido</span>
                  ) : (
                    <span className="text-[10px] font-bold text-[#9E8E86] tabular">{cat.percentage}%</span>
                  )}
                </div>
                <div>
                  <p className="text-[12px] font-bold mb-0.5">{cat.name}</p>
                  <div className="flex justify-between items-end mb-2">
                    <span className={`text-[17px] font-bold tabular ${isExceeded ? "text-[#C4522A]" : ""}`}>
                      $ {fmt(cat.spent)}
                    </span>
                    <span className="text-[9px] text-[#6B5C54] tabular cursor-pointer hover:text-[#C4522A]"
                      onClick={() => {
                        const val = prompt(`Nuevo presupuesto para ${cat.name}:`, String(cat.budget));
                        if (val) updateCategoryBudget(cat.name, parseInt(val) || cat.budget);
                      }}
                    >
                      / $ {fmt(cat.budget)}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-white rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${barPct}%`,
                        backgroundColor: isExceeded ? "#C4522A" : (cat.percentage > 70 ? "#1C0F0A" : "#6B5C54"),
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add Category */}
          {addingCategory ? (
            <div className="bg-[#F2EDE6] p-4 rounded-xl h-[150px] flex flex-col justify-between">
              <input
                type="text"
                placeholder="Nombre"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="text-sm font-bold bg-transparent border-b border-[#E8DDD6] focus:border-[#C4522A] outline-none"
                autoFocus
              />
              <input
                type="number"
                placeholder="Presupuesto"
                value={newCatBudget}
                onChange={(e) => setNewCatBudget(e.target.value)}
                className="text-sm tabular bg-transparent border-b border-[#E8DDD6] focus:border-[#C4522A] outline-none"
              />
              <div className="flex gap-2">
                <button onClick={addCategory} className="text-[10px] font-bold text-[#C4522A]">Guardar</button>
                <button onClick={() => setAddingCategory(false)} className="text-[10px] font-bold text-[#9E8E86]">Cancelar</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingCategory(true)}
              className="bg-transparent border-2 border-dashed border-[#8B716A]/30 hover:border-[#C4522A] transition-all rounded-xl h-[150px] flex flex-col items-center justify-center group"
            >
              <MaterialIcon name="add_circle" className="text-3xl text-[#8B716A]/50 group-hover:text-[#C4522A] mb-1" />
              <span className="text-[10px] font-bold text-[#6B5C54] uppercase tracking-widest group-hover:text-[#1C0F0A]">Agregar</span>
            </button>
          )}
        </div>
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
              <h4 className="text-lg font-bold text-[#1C0F0A]">{monthLabelCap} {selectedMonth.year}</h4>
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
        <div className="mb-auto">
          <h5 className="text-[10px] font-bold text-[#6B5C54] uppercase tracking-widest mb-6">Estado por categoría</h5>
          <div className="space-y-4">
            {summary.ranking.length === 0 ? (
              <p className="text-xs text-[#9E8E86]">Sin gastos este mes</p>
            ) : (
              summary.ranking.map((r) => (
                <div key={r.name} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: r.dotColor }} />
                  <span className="text-sm text-[#1C0F0A] font-medium">{r.name}</span>
                  <span className={`text-sm font-bold tabular ml-auto ${
                    r.percentage > 100 ? "text-[#C4522A]" : r.percentage >= 70 ? "text-[#1C0F0A]" : ""
                  }`}>
                    {r.percentage}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Projection Card */}
        <div className="bg-[#FAF7F2] p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <MaterialIcon name="insights" className="text-sm text-[#C4522A]" />
            <span className="text-[10px] font-bold text-[#6B5C54] uppercase tracking-widest">Proyección mensual</span>
          </div>
          <div className="mb-5">
            <h6 className="text-2xl font-bold tabular tracking-tighter text-[#1C0F0A]">$ {fmt(summary.projection.total)}</h6>
            {summary.projection.savings > 0 ? (
              <p className="text-[11px] text-[#6B5C54] mt-1.5 leading-relaxed">
                Estimamos un <span className="text-[#C4522A] font-bold">ahorro de $ {fmt(summary.projection.savings)}</span> extra al final del mes.
              </p>
            ) : (
              <p className="text-[11px] text-[#6B5C54] mt-1.5 leading-relaxed">
                Al ritmo actual, podrías <span className="text-[#C4522A] font-bold">exceder el presupuesto</span>.
              </p>
            )}
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${i <= summary.projection.weekProgress ? "bg-[#C4522A]" : "bg-white"}`}
              />
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
