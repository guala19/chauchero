"use client";

import { useState } from "react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { budgetData, CATEGORY_COLORS } from "@/lib/budget-data";

function fmt(n: number): string {
  return Math.abs(n).toLocaleString("es-CL");
}

export default function BudgetPage() {
  const [month] = useState("Marzo 2026");
  const d = budgetData;
  const pct = Math.round((d.totalSpent / d.totalBudget) * 100);
  const available = d.totalBudget - d.totalSpent;

  return (
    <>
      {/* Main content */}
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
              <span className="text-[10px] font-bold text-[#1C0F0A] tabular uppercase">{pct}% utilizado</span>
            </div>
            <div className="mb-6">
              <h3 className="text-3xl font-bold tabular tracking-tighter text-[#1C0F0A]">$ {fmt(d.totalBudget)}</h3>
              <p className="text-[11px] text-[#6B5C54] mt-1">Límite establecido para {d.month}</p>
            </div>
            <div className="w-full h-1.5 bg-[#F2EDE6] rounded-full overflow-hidden mb-6">
              <div className="h-full bg-[#1C0F0A] rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-[#6B5C54]">
              <div className="flex flex-col">
                <span className="opacity-60">Gastado</span>
                <span className="text-[#1C0F0A] tabular">$ {fmt(d.totalSpent)}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="opacity-60 text-[#3A7D5E]">Disponible</span>
                <span className="text-[#3A7D5E] tabular">$ {fmt(available)}</span>
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
              <h3 className="text-3xl font-bold tabular tracking-tighter">$ {fmt(d.yappa.total)}</h3>
              <p className="text-[10px] opacity-80 mt-1">Total ahorros automáticos</p>
            </div>
            <div className="w-full h-[1px] bg-white/20 mb-6 relative z-10" />
            <div className="flex flex-col gap-1.5 relative z-10">
              {d.yappa.history.map((h) => (
                <div
                  key={h.month}
                  className={`flex justify-between text-[11px] px-3 ${
                    h.isCurrent
                      ? "font-bold bg-[#9A3A1A]/40 py-1.5 rounded-lg"
                      : "font-medium opacity-80"
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
          {d.categories.map((cat) => {
            const colors = CATEGORY_COLORS[cat.colorKey];
            const catPct = Math.round((cat.spent / cat.budget) * 100);
            const isExceeded = cat.spent > cat.budget;
            const barWidth = Math.min(catPct, 100);

            return (
              <div
                key={cat.name}
                className={`bg-[#F2EDE6] p-4 rounded-xl h-[150px] flex flex-col justify-between ${
                  isExceeded ? "border-t-2 border-[#C4522A]/20" : ""
                }`}
              >
                <div className="flex justify-between items-start">
                  <MaterialIcon name={cat.icon} className="text-[24px]" filled={isExceeded}
                    style={{ color: colors.icon } as React.CSSProperties} />
                  {isExceeded ? (
                    <span className="text-[8px] font-bold bg-[#C4522A] text-white px-1.5 py-0.5 rounded uppercase">Excedido</span>
                  ) : (
                    <span className="text-[10px] font-bold text-[#9E8E86] tabular">{catPct}%</span>
                  )}
                </div>
                <div>
                  <p className="text-[12px] font-bold mb-0.5">{cat.name}</p>
                  <div className="flex justify-between items-end mb-2">
                    <span className={`text-[17px] font-bold tabular ${isExceeded ? "text-[#C4522A]" : ""}`}>
                      $ {fmt(cat.spent)}
                    </span>
                    <span className="text-[9px] text-[#6B5C54] tabular">/ $ {fmt(cat.budget)}</span>
                  </div>
                  <div className="w-full h-1 bg-white rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: isExceeded ? "#C4522A" : (catPct > 70 ? "#1C0F0A" : "#6B5C54"),
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add Button */}
          <button className="bg-transparent border-2 border-dashed border-[#8B716A]/30 hover:border-[#C4522A] transition-all rounded-xl h-[150px] flex flex-col items-center justify-center group">
            <MaterialIcon name="add_circle" className="text-3xl text-[#8B716A]/50 group-hover:text-[#C4522A] mb-1" />
            <span className="text-[10px] font-bold text-[#6B5C54] uppercase tracking-widest group-hover:text-[#1C0F0A]">Agregar</span>
          </button>
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
              <h4 className="text-lg font-bold text-[#1C0F0A]">{month}</h4>
              <span className="text-[9px] font-bold text-[#C4522A] bg-[#C4522A]/10 px-2 py-0.5 rounded mt-1 w-fit uppercase">Mes activo</span>
            </div>
            <div className="flex gap-1">
              <button className="p-1 text-[#6B5C54] hover:text-[#1C0F0A]">
                <MaterialIcon name="chevron_left" className="text-[24px]" />
              </button>
              <button className="p-1 text-[#6B5C54] hover:text-[#1C0F0A]">
                <MaterialIcon name="chevron_right" className="text-[24px]" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Ranking */}
        <div className="mb-auto">
          <h5 className="text-[10px] font-bold text-[#6B5C54] uppercase tracking-widest mb-6">Estado por categoría</h5>
          <div className="space-y-4">
            {d.ranking.map((r) => (
              <div key={r.name} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: r.percentage > 100 ? "#C4522A" : r.dotColor }} />
                <span className="text-sm text-[#1C0F0A] font-medium">{r.name}</span>
                <span className={`text-sm font-bold tabular ml-auto ${
                  r.percentage > 100 ? "text-[#C4522A]" :
                  r.percentage >= 70 ? "text-[#1C0F0A]" : ""
                }`}>
                  {r.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Projection Card */}
        <div className="bg-[#FAF7F2] p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <MaterialIcon name="insights" className="text-sm text-[#C4522A]" />
            <span className="text-[10px] font-bold text-[#6B5C54] uppercase tracking-widest">Proyección mensual</span>
          </div>
          <div className="mb-5">
            <h6 className="text-2xl font-bold tabular tracking-tighter text-[#1C0F0A]">$ {fmt(d.projection.total)}</h6>
            <p className="text-[11px] text-[#6B5C54] mt-1.5 leading-relaxed">
              Estimamos un <span className="text-[#C4522A] font-bold">ahorro de $ {fmt(d.projection.savings)}</span> extra al final del mes.
            </p>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${i <= d.projection.monthProgress ? "bg-[#C4522A]" : "bg-white"}`}
              />
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
