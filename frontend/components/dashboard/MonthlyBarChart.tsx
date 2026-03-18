"use client";

import { useState } from "react";
import { formatCLPCompact } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface MonthData {
  label: string;
  total: number;
  month: string;
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
  const niceMax = Math.ceil(maxVal / 50000) * 50000 || 50000;
  const yTicks = [niceMax * 0.25, niceMax * 0.5, niceMax * 0.75].map(Math.round);

  const slotW = CW / months.length;
  const barW = slotW * 0.55;

  const rangeLabel =
    months.length >= 2
      ? `${months[0].label} – ${months[months.length - 1].label} ${new Date().getFullYear()}`
      : "";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm">Gastos Mensuales</CardTitle>
        <Badge variant="outline" className="text-xs font-normal">
          {rangeLabel}
        </Badge>
      </CardHeader>

      <CardContent className="pt-0 pb-2">
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full"
          style={{ height: VH }}
          onMouseLeave={() => setHoverIdx(null)}
        >
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
                  fill="var(--muted-foreground)"
                  fontSize={9}
                >
                  {val >= 1000 ? `${val / 1000}K` : val}
                </text>
              </g>
            );
          })}

          {months.map((month, i) => {
            const x = barLeft(i, months.length, barW);
            const isActive = i === activeIdx;
            const barH = month.total > 0 ? Math.max((month.total / niceMax) * CH, 3) : 3;
            const barY = toY(month.total, niceMax);
            const fill =
              month.total === 0
                ? "var(--muted)"
                : isActive
                ? "var(--primary)"
                : "var(--muted)";
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

          {(() => {
            const m = months[activeIdx];
            if (!m) return null;
            const tx = barLeft(activeIdx, months.length, barW) + barW / 2;
            const ty = toY(m.total, niceMax) - 14;
            const label = m.total > 0 ? formatCLPCompact(m.total) : "Sin gastos";
            const tw = label.length * 6.2 + 20;
            return (
              <g>
                <rect x={tx - tw / 2} y={ty - 22} width={tw} height={24} fill="var(--popover)" rx={4} />
                <text
                  x={tx} y={ty - 7}
                  textAnchor="middle"
                  fill="var(--popover-foreground)"
                  fontSize={10}
                  fontWeight="600"
                >
                  {label}
                </text>
                <polygon
                  points={`${tx - 5},${ty + 2} ${tx + 5},${ty + 2} ${tx},${ty + 7}`}
                  fill="var(--popover)"
                />
              </g>
            );
          })()}

          {months.map((month, i) => (
            <text
              key={i}
              x={barLeft(i, months.length, barW) + barW / 2}
              y={PAD.top + CH + 18}
              textAnchor="middle"
              fill={i === activeIdx ? "var(--foreground)" : "var(--muted-foreground)"}
              fontSize={10}
              fontWeight={i === activeIdx ? "600" : "400"}
            >
              {month.label}
            </text>
          ))}
        </svg>
      </CardContent>
    </Card>
  );
}
