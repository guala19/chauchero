"use client";

import { formatCLPCompact } from "@/lib/format";

export interface DonutSegment {
  color: string;
  pct: number;
  label: string;
  amount: number;
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────

const CX = 90, CY = 90, OR = 68, IR = 46;

function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, ro: number, ri: number, a1: number, a2: number) {
  const s  = polarToXY(cx, cy, ro, a1);
  const e  = polarToXY(cx, cy, ro, a2);
  const si = polarToXY(cx, cy, ri, a1);
  const ei = polarToXY(cx, cy, ri, a2);
  const lg = a2 - a1 > 180 ? 1 : 0;
  return [
    `M ${s.x.toFixed(2)} ${s.y.toFixed(2)}`,
    `A ${ro} ${ro} 0 ${lg} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`,
    `L ${ei.x.toFixed(2)} ${ei.y.toFixed(2)}`,
    `A ${ri} ${ri} 0 ${lg} 0 ${si.x.toFixed(2)} ${si.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActivityDonut({
  segments,
  total,
  txCount,
}: {
  segments: DonutSegment[];
  total: number;
  txCount: number;
}) {
  // Empty state: single grey ring
  if (segments.length === 0 || total === 0) {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Breakdown</h3>
          <span className="text-xs text-[var(--text-muted)]">Sin datos</span>
        </div>
        <div className="flex justify-center">
          <svg viewBox="0 0 180 180" className="w-36 h-36">
            <circle cx={CX} cy={CY} r={(OR + IR) / 2} fill="none" stroke="var(--bg-elevated)" strokeWidth={OR - IR} />
            <text x={CX} y={CY + 5} textAnchor="middle" fill="var(--text-muted)" fontSize={10}>Sin gastos</text>
          </svg>
        </div>
      </div>
    );
  }

  let startDeg = 0;
  const paths = segments.map((seg) => {
    const sweep = (seg.pct / 100) * 360;
    const path  = arcPath(CX, CY, OR, IR, startDeg, startDeg + sweep);
    startDeg   += sweep;
    return { ...seg, path };
  });

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Breakdown</h3>
        <span className="text-xs text-[var(--text-muted)]">{txCount} transacciones</span>
      </div>

      {/* Donut chart */}
      <div className="flex justify-center">
        <svg viewBox="0 0 180 180" className="w-36 h-36">
          {paths.map((p, i) => (
            <path key={i} d={p.path} fill={p.color} />
          ))}
          <text x={CX} y={CY - 6} textAnchor="middle" fill="var(--text-muted)" fontSize={9}>
            Gastos
          </text>
          <text x={CX} y={CY + 8} textAnchor="middle" fill="var(--text-primary)" fontSize={11} fontWeight="700">
            {formatCLPCompact(total)}
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-3 space-y-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full shrink-0" style={{ background: seg.color }} />
              <span className="text-[11px] text-[var(--text-muted)]">{seg.label}</span>
            </div>
            <span className="text-[11px] font-mono text-[var(--text-secondary)]">
              {formatCLPCompact(seg.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
