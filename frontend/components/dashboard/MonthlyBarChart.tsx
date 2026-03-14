"use client";

import { useState } from "react";
import { formatCLPCompact } from "@/lib/format";

export interface MonthData {
  label: string;   // "Mar"
  total: number;   // total gastos ese mes
  month: string;   // "mar 2026" (tooltip)
}

// ─── SVG constants ────────────────────────────────────────────────────────────

const VW = 560;
const VH = 200;
const PAD = { top: 28, right: 16, bottom: 28, left: 56 };
const CW = VW - PAD.left - PAD.right;
const CH = VH - PAD.top - PAD.bottom;

function toY(val: number, maxVal: number) {
  if (maxVal === 0) return PAD.top + CH;
  return PAD.top + CH - (val / maxVal) * CH;
}

function barLeft(i: number, count: number, barW: number) {
  const slotW = CW / count;
  return PAD.left + i * slotW + (slotW - barW) / 2;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MonthlyBarChart({ months }: { months: MonthData[] }) {
  const lastWithData = months.reduceRight((found, m, i) => found !== -1 ? found : m.total > 0 ? i : -1, -1);
  const defaultIdx = lastWithData >= 0 ? lastWithData : months.length - 1;
  const [hoverIdx, setHoverIdx] = useState<number | null>(defaultIdx);

  const activeIdx = hoverIdx ?? defaultIdx;
  const maxVal = Math.max(...months.map((m) => m.total), 1);
  // Round max up to a nice number
  const niceMax = Math.ceil(maxVal / 50000) * 50000 || 50000;
  const yTicks = [niceMax * 0.25, niceMax * 0.5, niceMax * 0.75].map(Math.round);

  const slotW = CW / months.length;
  const barW = slotW * 0.55;

  const rangeLabel =
    months.length >= 2
      ? `${months[0].label} – ${months[months.length - 1].label} ${new Date().getFullYear()}`
      : "";

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Gastos Mensuales
        </h2>
        <span className="text-xs text-[var(--text-muted)] border border-[var(--border)] px-2.5 py-1.5 rounded-[var(--radius)]">
          {rangeLabel}
        </span>
      </div>

      {/* Chart */}
      <div className="px-4 pt-3 pb-2">
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full"
          style={{ height: VH }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Y-axis grid + labels */}
          {yTicks.map((val) => {
            const y = toY(val, niceMax);
            return (
              <g key={val}>
                <line
                  x1={PAD.left} y1={y}
                  x2={PAD.left + CW} y2={y}
                  stroke="var(--border)"
                  strokeWidth={0.5}
                />
                <text
                  x={PAD.left - 6} y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill="var(--text-muted)"
                  fontSize={9}
                >
                  {val >= 1000 ? `${val / 1000}K` : val}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {months.map((month, i) => {
            const x = barLeft(i, months.length, barW);
            const isActive = i === activeIdx;
            const barH = month.total > 0 ? Math.max((month.total / niceMax) * CH, 3) : 3;
            const barY = toY(month.total, niceMax);
            const fill =
              month.total === 0
                ? "var(--bg-overlay)"
                : isActive
                ? "var(--blue)"
                : "var(--bg-overlay)";
            return (
              <g key={i} onMouseEnter={() => setHoverIdx(i)} style={{ cursor: "pointer" }}>
                <rect
                  x={x} y={barY}
                  width={barW} height={barH}
                  fill={fill}
                  rx={3} ry={3}
                />
              </g>
            );
          })}

          {/* Tooltip */}
          {(() => {
            const m = months[activeIdx];
            if (!m) return null;
            const tx = barLeft(activeIdx, months.length, barW) + barW / 2;
            const ty = toY(m.total, niceMax) - 14;
            const label = m.total > 0 ? formatCLPCompact(m.total) : "Sin gastos";
            const tw = label.length * 6.2 + 20;
            return (
              <g>
                <rect x={tx - tw / 2} y={ty - 22} width={tw} height={24} fill="#1E293B" rx={4} />
                <text
                  x={tx} y={ty - 7}
                  textAnchor="middle"
                  fill="white"
                  fontSize={10}
                  fontWeight="600"
                >
                  {label}
                </text>
                <polygon
                  points={`${tx - 5},${ty + 2} ${tx + 5},${ty + 2} ${tx},${ty + 7}`}
                  fill="#1E293B"
                />
              </g>
            );
          })()}

          {/* X-axis labels */}
          {months.map((month, i) => (
            <text
              key={i}
              x={barLeft(i, months.length, barW) + barW / 2}
              y={PAD.top + CH + 18}
              textAnchor="middle"
              fill={i === activeIdx ? "var(--text-primary)" : "var(--text-muted)"}
              fontSize={10}
              fontWeight={i === activeIdx ? "600" : "400"}
            >
              {month.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
