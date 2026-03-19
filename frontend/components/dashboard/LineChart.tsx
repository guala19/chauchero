"use client";

import { useState, useMemo } from "react";
import { formatCLP, formatCLPCompact } from "@/lib/format";

export interface MonthData {
  label: string;
  total: number;
  month: string;
}

const TIME_FILTERS = ["1S", "1M", "3M", "6M", "1A"];

function dataToPath(data: MonthData[], width: number, height: number) {
  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const niceMax = Math.ceil(maxVal / 100000) * 100000 || 100000;
  const points = data.map((d, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * width,
    y: height - (d.total / niceMax) * height,
  }));

  if (points.length < 2) {
    return { linePath: "", areaPath: "", points, niceMax };
  }

  let path = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
    const cpx2 = prev.x + (curr.x - prev.x) * 0.6;
    path += ` C${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const areaPath = `${path} L${width} ${height} L0 ${height} Z`;
  return { linePath: path, areaPath, points, niceMax };
}

export default function LineChart({ months, selectedIdx }: { months: MonthData[]; selectedIdx?: number }) {
  const [activeFilter, setActiveFilter] = useState("6M");
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  if (months.length === 0 || months.every((m) => m.total === 0)) {
    return (
      <section className="bg-[var(--surface-container)] rounded-2xl p-6 ghost-border h-[240px] flex items-center justify-center text-sm text-[var(--tertiary-text)]">
        Sincroniza para ver la evolución de gastos
      </section>
    );
  }

  const W = 800;
  const H = 200;
  const { linePath, areaPath, points, niceMax } = dataToPath(months, W, H);

  const yLabels = [
    formatCLPCompact(niceMax),
    formatCLPCompact(niceMax * 0.75),
    formatCLPCompact(niceMax * 0.5),
    formatCLPCompact(niceMax * 0.25),
    "$ 0",
  ];

  const activePoint = hoveredPoint ?? selectedIdx ?? null;

  return (
    <section className="bg-[var(--surface-container)] rounded-2xl p-6 ghost-border space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-[var(--on-surface)]">
          Evolución de gastos
        </h3>
        <div className="flex p-1 bg-[var(--surface)] rounded-lg gap-1 border border-[var(--outline)]">
          {TIME_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeFilter === f
                  ? "bg-[var(--surface-container)] text-[var(--primary)] shadow-sm border border-[var(--outline)]"
                  : "text-[var(--tertiary-text)] hover:text-[var(--on-surface)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between text-[10px] text-[var(--tertiary-text)] tabular pb-8 h-[187px] shrink-0">
          {yLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        {/* Chart area */}
        <div className="h-[187px] w-full relative flex-1">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between py-[2px] pointer-events-none">
            {yLabels.map((_, i) => (
              <div key={i} className="border-t border-dashed border-[var(--outline)]/30 w-full" />
            ))}
          </div>

          {/* SVG */}
          <svg className="w-full h-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#3A7D5E" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3A7D5E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#chartGradient)" />
            <path d={linePath} fill="none" stroke="#3A7D5E" strokeLinecap="round" strokeWidth={3} />

            {/* Vertical indicator line for active point */}
            {activePoint !== null && points[activePoint] && (
              <line
                x1={points[activePoint].x}
                y1={0}
                x2={points[activePoint].x}
                y2={H}
                stroke="#3A7D5E"
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.3}
              />
            )}

            {points.map((p, i) => {
              const isActive = activePoint === i;
              const isLast = i === points.length - 1;
              const isFilled = isActive || isLast;
              return (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={isActive ? 6 : isFilled ? 5 : 4}
                  fill={isFilled ? "#3A7D5E" : "#ffffff"}
                  stroke="#3A7D5E"
                  strokeWidth={2}
                  className="cursor-pointer"
                  style={{ transition: "r 150ms ease, fill 150ms ease" }}
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              );
            })}
          </svg>

          {/* Tooltip */}
          {activePoint !== null && months[activePoint] && (
            <div
              className="absolute -top-8 px-3 py-1.5 bg-[var(--on-surface)] text-white text-[10px] font-semibold tabular rounded-md pointer-events-none shadow-lg"
              style={{
                left: `${(activePoint / Math.max(months.length - 1, 1)) * 100}%`,
                transform: "translateX(-50%)",
              }}
            >
              <span className="text-[8px] text-white/60 block">{months[activePoint].label}</span>
              {formatCLP(months[activePoint].total)}
            </div>
          )}

          {/* X-axis labels */}
          <div className="absolute bottom-0 inset-x-0 flex items-end justify-between px-2 pt-4 border-b border-[var(--outline)] pb-2">
            {months.map((d, i) => (
              <span
                key={d.label}
                className={`text-[10px] font-medium transition-colors ${
                  i === activePoint || (activePoint === null && i === (selectedIdx ?? months.length - 1))
                    ? "text-[var(--primary)] font-bold"
                    : "text-[var(--tertiary-text)]"
                }`}
              >
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
