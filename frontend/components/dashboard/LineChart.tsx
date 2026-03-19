"use client";

import { useState } from "react";
import { formatCLPCompact } from "@/lib/format";

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
    x: (i / (data.length - 1)) * width,
    y: height - (d.total / niceMax) * height,
  }));

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

export default function LineChart({ months }: { months: MonthData[] }) {
  const [activeFilter, setActiveFilter] = useState("6M");
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  if (months.length === 0) {
    return (
      <div className="bg-secondary rounded-2xl p-6 ghost-border h-[240px] flex items-center justify-center text-sm text-muted-foreground">
        Sincroniza para ver la evolución de gastos
      </div>
    );
  }

  const W = 800;
  const H = 200;
  const { linePath, areaPath, points, niceMax } = dataToPath(months, W, H);

  const yLabels = [
    { label: formatCLPCompact(niceMax), val: niceMax },
    { label: formatCLPCompact(niceMax * 0.75), val: niceMax * 0.75 },
    { label: formatCLPCompact(niceMax * 0.5), val: niceMax * 0.5 },
    { label: formatCLPCompact(niceMax * 0.25), val: niceMax * 0.25 },
    { label: "$ 0", val: 0 },
  ];

  return (
    <section className="bg-secondary rounded-2xl p-6 ghost-border space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-foreground">
          Evolución de gastos
        </h3>
        <div className="flex p-0.5 bg-background rounded-lg gap-0.5 border border-border">
          {TIME_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${
                activeFilter === f
                  ? "bg-secondary text-primary shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        {/* Y-axis */}
        <div className="flex flex-col justify-between text-[10px] text-muted-foreground tabular pb-6 h-[187px] shrink-0">
          {yLabels.map((y) => (
            <span key={y.label}>{y.label}</span>
          ))}
        </div>

        {/* Chart */}
        <div className="h-[187px] w-full relative flex-1">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between py-[2px] pointer-events-none">
            {yLabels.map((_, i) => (
              <div key={i} className="border-t border-dashed border-border/40 w-full" />
            ))}
          </div>

          <svg className="w-full h-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineChartGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="var(--ch-green)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--ch-green)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#lineChartGradient)" />
            <path d={linePath} fill="none" stroke="var(--ch-green)" strokeLinecap="round" strokeWidth={3} />
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={hoveredPoint === i ? 6 : i === points.length - 1 ? 5 : 4}
                fill={i === points.length - 1 || hoveredPoint === i ? "var(--ch-green)" : "var(--card)"}
                stroke="var(--ch-green)"
                strokeWidth={2}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(i)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            ))}
          </svg>

          {/* Tooltip */}
          {hoveredPoint !== null && (
            <div
              className="absolute -top-7 px-2 py-0.5 bg-foreground text-background text-[10px] font-semibold tabular rounded-md pointer-events-none"
              style={{
                left: `${(hoveredPoint / (months.length - 1)) * 100}%`,
                transform: "translateX(-50%)",
              }}
            >
              {formatCLPCompact(months[hoveredPoint].total)}
            </div>
          )}

          {/* X-axis */}
          <div className="absolute bottom-0 inset-x-0 flex items-end justify-between px-1 pt-3 border-b border-border/40 pb-1.5">
            {months.map((d, i) => (
              <span
                key={d.label}
                className={`text-[10px] font-medium ${
                  i === months.length - 1
                    ? "text-primary font-bold"
                    : "text-muted-foreground"
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
