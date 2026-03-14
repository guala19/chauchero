"use client";

import { useState } from "react";
import { formatCLPCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "gastos" | "ingresos" | "ambos";

// ─── Mock data — replace with API ─────────────────────────────────────────────

const DATA = [
  { label: "1 mar",  gastos: 12000,  ingresos: 0 },
  { label: "2 mar",  gastos: 5000,   ingresos: 0 },
  { label: "3 mar",  gastos: 23000,  ingresos: 150000 },
  { label: "4 mar",  gastos: 8000,   ingresos: 0 },
  { label: "5 mar",  gastos: 8500,   ingresos: 850000 },
  { label: "6 mar",  gastos: 45000,  ingresos: 0 },
  { label: "7 mar",  gastos: 15000,  ingresos: 0 },
  { label: "8 mar",  gastos: 9900,   ingresos: 0 },
  { label: "9 mar",  gastos: 57230,  ingresos: 100000 },
  { label: "10 mar", gastos: 45890,  ingresos: 250000 },
  { label: "11 mar", gastos: 2000,   ingresos: 0 },
];

// ─── SVG geometry ─────────────────────────────────────────────────────────────

const PAD  = { top: 20, right: 20, bottom: 36, left: 58 };
const VW   = 760;
const VH   = 200;
const CW   = VW - PAD.left - PAD.right;
const CH   = VH - PAD.top  - PAD.bottom;

function buildPoints(values: number[], max: number) {
  const step = CW / (values.length - 1);
  return values.map((v, i) => ({
    x: PAD.left + i * step,
    y: PAD.top + CH - (v / max) * CH,
  }));
}

function smoothLine(pts: { x: number; y: number }[]): string {
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const cpx = ((pts[i - 1].x + pts[i].x) / 2).toFixed(1);
    d += ` C ${cpx} ${pts[i - 1].y.toFixed(1)} ${cpx} ${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
  }
  return d;
}

function smoothArea(pts: { x: number; y: number }[]): string {
  const bottom = (PAD.top + CH).toFixed(1);
  const line   = smoothLine(pts);
  return `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${bottom} L ${PAD.left} ${bottom} Z`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SpendingChart() {
  const [mode, setMode]         = useState<ViewMode>("gastos");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const step        = CW / (DATA.length - 1);
  const gastosMax   = Math.max(...DATA.map(d => d.gastos), 1);
  const ingresosMax = Math.max(...DATA.map(d => d.ingresos), 1);
  const combinedMax = Math.max(gastosMax, ingresosMax);

  const activeMax =
    mode === "gastos"   ? gastosMax :
    mode === "ingresos" ? ingresosMax :
    combinedMax;

  const maxForPts = mode === "ambos" ? combinedMax : activeMax;

  const gastosPts   = buildPoints(DATA.map(d => d.gastos),   maxForPts);
  const ingresoPts  = buildPoints(DATA.map(d => d.ingresos), maxForPts);

  const hoverData = hoverIdx !== null ? DATA[hoverIdx] : null;
  const hoverX    = hoverIdx !== null ? PAD.left + hoverIdx * step : null;

  const Y_TICKS = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Evolución del mes
        </h2>

        {/* Toggle */}
        <div className="flex items-center gap-0.5 bg-[var(--bg-elevated)] rounded-[var(--radius)] p-0.5">
          {(["gastos", "ingresos", "ambos"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setMode(v)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded-[var(--radius-sm)] transition-all duration-150 capitalize",
                mode === v
                  ? v === "gastos"
                    ? "bg-[var(--red)]   text-white shadow-sm"
                    : v === "ingresos"
                    ? "bg-[var(--green)] text-white shadow-sm"
                    : "bg-[var(--blue)]  text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tooltip bar ── */}
      <div className={cn(
        "px-5 py-2 border-b border-[var(--border-subtle)] flex items-center gap-4 text-[11px] transition-opacity duration-150 shrink-0",
        hoverData ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <span className="text-[var(--text-muted)] font-medium">{hoverData?.label}</span>
        {mode !== "ingresos" && (
          <span className="font-mono text-[var(--red)]">
            Gastos: {formatCLPCompact(hoverData?.gastos ?? 0)}
          </span>
        )}
        {mode !== "gastos" && (
          <span className="font-mono text-[var(--green)]">
            Ingresos: {formatCLPCompact(hoverData?.ingresos ?? 0)}
          </span>
        )}
      </div>

      {/* ── Chart ── */}
      <div className="px-2 pt-1 pb-0 flex-1">
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full"
          style={{ height: VH }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="ch-grad-red"   x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="var(--red)"   stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--red)"   stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="ch-grad-green" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="var(--green)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--green)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines + Y labels */}
          {Y_TICKS.map((frac) => {
            const y = PAD.top + CH * (1 - frac);
            return (
              <g key={frac}>
                <line
                  x1={PAD.left} y1={y}
                  x2={PAD.left + CW} y2={y}
                  stroke="var(--border)"
                  strokeWidth={0.5}
                />
                <text
                  x={PAD.left - 6}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill="var(--text-muted)"
                  fontSize={9}
                >
                  {frac === 0 ? "$ 0" : formatCLPCompact(activeMax * frac)}
                </text>
              </g>
            );
          })}

          {/* X axis labels — every other point */}
          {DATA.map((d, i) => {
            if (i % 2 !== 0) return null;
            return (
              <text
                key={i}
                x={PAD.left + i * step}
                y={PAD.top + CH + 24}
                textAnchor="middle"
                fill="var(--text-muted)"
                fontSize={9}
              >
                {d.label}
              </text>
            );
          })}

          {/* Hover vertical line */}
          {hoverX !== null && (
            <line
              x1={hoverX} y1={PAD.top}
              x2={hoverX} y2={PAD.top + CH}
              stroke="var(--text-muted)"
              strokeWidth={1}
              strokeDasharray="3 3"
              strokeOpacity={0.4}
            />
          )}

          {/* Gastos area + stroke */}
          {mode !== "ingresos" && (
            <>
              <path d={smoothArea(gastosPts)} fill="url(#ch-grad-red)" />
              <path
                d={smoothLine(gastosPts)}
                fill="none"
                stroke="var(--red)"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Ingresos area + stroke */}
          {mode !== "gastos" && (
            <>
              <path d={smoothArea(ingresoPts)} fill="url(#ch-grad-green)" />
              <path
                d={smoothLine(ingresoPts)}
                fill="none"
                stroke="var(--green)"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Hover dots */}
          {hoverIdx !== null && mode !== "ingresos" && (
            <circle
              cx={gastosPts[hoverIdx].x}
              cy={gastosPts[hoverIdx].y}
              r={4}
              fill="var(--red)"
              stroke="var(--bg-surface)"
              strokeWidth={2}
            />
          )}
          {hoverIdx !== null && mode !== "gastos" && (
            <circle
              cx={ingresoPts[hoverIdx].x}
              cy={ingresoPts[hoverIdx].y}
              r={4}
              fill="var(--green)"
              stroke="var(--bg-surface)"
              strokeWidth={2}
            />
          )}

          {/* Invisible hit rects for hover */}
          {DATA.map((_, i) => (
            <rect
              key={i}
              x={PAD.left + i * step - step / 2}
              y={PAD.top}
              width={step}
              height={CH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
