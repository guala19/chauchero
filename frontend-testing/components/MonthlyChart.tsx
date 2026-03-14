"use client";

import { useState } from "react";
import { MONTHLY_DATA } from "@/lib/mock-data";
import { formatCLPCompact } from "@/lib/format";

const BAR_COLORS = {
  gastos: "var(--red)",
  ingresos: "var(--green)",
};

export default function MonthlyChart() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxValue = Math.max(...MONTHLY_DATA.flatMap((d) => [d.gastos, d.ingresos]));
  const ceilMax = Math.ceil(maxValue / 500_000) * 500_000;
  const gridLines = 4;
  const chartHeight = 220;

  return (
    <div className="animate-fade-in stagger-2 rounded-[14px] border border-border-subtle bg-bg-surface p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-[18px] font-semibold text-text-primary">Resumen mensual</h3>
          <p className="mt-0.5 text-[13px] text-text-secondary">Últimos 6 meses</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BAR_COLORS.gastos }} />
            <span className="text-[11px] font-medium text-text-secondary">Gastos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BAR_COLORS.ingresos }} />
            <span className="text-[11px] font-medium text-text-secondary">Ingresos</span>
          </div>
        </div>
      </div>

      <div className="relative" style={{ height: chartHeight + 30 }}>
        {/* Y-axis grid */}
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const value = (ceilMax / gridLines) * (gridLines - i);
          const y = (i / gridLines) * chartHeight;
          return (
            <div key={i} className="absolute left-0 right-0" style={{ top: y }}>
              <div className="border-t border-border-subtle" />
              <span className="num absolute -left-0 -top-3 text-[10px] text-text-muted">
                {formatCLPCompact(value)}
              </span>
            </div>
          );
        })}

        {/* Bars */}
        <div className="absolute inset-0 flex items-end justify-around pl-12" style={{ height: chartHeight }}>
          {MONTHLY_DATA.map((d, i) => {
            const gastosH = (d.gastos / ceilMax) * chartHeight;
            const ingresosH = (d.ingresos / ceilMax) * chartHeight;
            const isHovered = hoveredIndex === i;

            return (
              <div
                key={d.month}
                className="group relative flex flex-col items-center gap-1"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="flex items-end gap-1">
                  <div
                    className="w-5 rounded-t-[3px] transition-all duration-150"
                    style={{
                      height: gastosH,
                      backgroundColor: BAR_COLORS.gastos,
                      opacity: isHovered ? 1 : 0.75,
                    }}
                  />
                  <div
                    className="w-5 rounded-t-[3px] transition-all duration-150"
                    style={{
                      height: ingresosH,
                      backgroundColor: BAR_COLORS.ingresos,
                      opacity: isHovered ? 1 : 0.75,
                    }}
                  />
                </div>

                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-10 rounded-[6px] bg-bg-overlay border border-border px-3 py-2 shadow-sm whitespace-nowrap">
                    <p className="num text-[11px] text-text-secondary">
                      Gastos: <span className="text-text-primary font-medium">{formatCLPCompact(d.gastos)}</span>
                    </p>
                    <p className="num text-[11px] text-text-secondary">
                      Ingresos: <span className="text-text-primary font-medium">{formatCLPCompact(d.ingresos)}</span>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-around pl-12" style={{ top: chartHeight + 8 }}>
          {MONTHLY_DATA.map((d) => (
            <span key={d.month} className="text-[11px] font-medium text-text-muted">
              {d.month}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
