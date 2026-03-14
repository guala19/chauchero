"use client";

import { useState } from "react";
import { CATEGORY_DATA } from "@/lib/mock-data";
import { formatCLP, formatCLPCompact } from "@/lib/format";

const TOTAL = CATEGORY_DATA.reduce((sum, c) => sum + c.amount, 0);
const SIZE = 180;
const STROKE = 28;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CategoryDonut() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  let cumulativePercent = 0;
  const segments = CATEGORY_DATA.map((cat, i) => {
    const percent = cat.amount / TOTAL;
    const offset = CIRCUMFERENCE * (1 - cumulativePercent);
    const length = CIRCUMFERENCE * percent;
    cumulativePercent += percent;

    return { ...cat, percent, offset, length, index: i };
  });

  return (
    <div className="animate-fade-in stagger-3 rounded-[14px] border border-border-subtle bg-bg-surface p-6">
      <div className="mb-6">
        <h3 className="text-[18px] font-semibold text-text-primary">Gastos por categoría</h3>
        <p className="mt-0.5 text-[13px] text-text-secondary">Distribución de marzo</p>
      </div>

      <div className="flex flex-col items-center">
        {/* Donut */}
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="-rotate-90"
            style={{ width: SIZE, height: SIZE }}
          >
            {/* Background ring */}
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--border-subtle)"
              strokeWidth={STROKE}
            />
            {/* Segments */}
            {segments.map((seg) => (
              <circle
                key={seg.name}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={seg.color}
                strokeWidth={STROKE}
                strokeDasharray={`${seg.length} ${CIRCUMFERENCE - seg.length}`}
                strokeDashoffset={seg.offset}
                className="transition-opacity duration-150"
                style={{
                  opacity: hoveredIndex === null || hoveredIndex === seg.index ? 1 : 0.3,
                  cursor: "pointer",
                }}
                onMouseEnter={() => setHoveredIndex(seg.index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            ))}
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
              {hoveredIndex !== null ? CATEGORY_DATA[hoveredIndex].name : "Total"}
            </span>
            <span className="num text-[18px] font-bold text-text-primary mt-0.5">
              {hoveredIndex !== null
                ? formatCLPCompact(CATEGORY_DATA[hoveredIndex].amount)
                : formatCLPCompact(TOTAL)}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 w-full space-y-2.5">
          {CATEGORY_DATA.map((cat, i) => {
            const percent = ((cat.amount / TOTAL) * 100).toFixed(1);
            return (
              <div
                key={cat.name}
                className="flex items-center justify-between cursor-default transition-opacity duration-150"
                style={{ opacity: hoveredIndex === null || hoveredIndex === i ? 1 : 0.4 }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-[13px] text-text-secondary">{cat.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="num text-[13px] font-medium text-text-primary">{formatCLP(cat.amount)}</span>
                  <span className="num text-[11px] text-text-muted w-10 text-right">{percent}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
