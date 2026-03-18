"use client";

import { TrendingDown, TrendingUp, Wallet, ArrowDownUp } from "lucide-react";
import { formatCLP, formatPercent } from "@/lib/format";
import { KPI_DATA } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";

function delta(current: number, previous: number) {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

const kpis = [
  {
    label: "Gasto del mes",
    value: KPI_DATA.gastoMes,
    previous: KPI_DATA.gastoMesAnterior,
    icon: TrendingDown,
    invert: true,
    color: "red" as const,
  },
  {
    label: "Ingreso del mes",
    value: KPI_DATA.ingresoMes,
    previous: KPI_DATA.ingresoMesAnterior,
    icon: TrendingUp,
    invert: false,
    color: "green" as const,
  },
  {
    label: "Balance",
    value: KPI_DATA.balance,
    previous: KPI_DATA.balanceAnterior,
    icon: Wallet,
    invert: false,
    color: "blue" as const,
  },
  {
    label: "Transacciones",
    value: KPI_DATA.transacciones,
    previous: KPI_DATA.transaccionesAnterior,
    icon: ArrowDownUp,
    invert: true,
    isCount: true,
    color: "amber" as const,
  },
];

const iconStyles = {
  red:   { bg: "bg-ch-red-dim",   text: "text-ch-red" },
  green: { bg: "bg-ch-green-dim", text: "text-ch-green" },
  blue:  { bg: "bg-ch-blue-dim",  text: "text-ch-blue" },
  amber: { bg: "bg-ch-amber-dim", text: "text-ch-amber" },
};

export default function KpiCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, i) => {
        const change = delta(kpi.value, kpi.previous);
        const isPositive = kpi.invert ? change < 0 : change > 0;
        const Icon = kpi.icon;
        const style = iconStyles[kpi.color];

        return (
          <Card
            key={kpi.label}
            className={`animate-fade-in stagger-${i + 1} group relative overflow-hidden p-6 transition-all duration-150 hover:-translate-y-0.5`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-medium text-muted-foreground">{kpi.label}</span>
              <div className={`flex size-8 items-center justify-center rounded-md ${style.bg}`}>
                <Icon size={16} className={style.text} />
              </div>
            </div>

            <p className="num text-[28px] font-bold leading-none tracking-tight text-foreground">
              {kpi.isCount ? kpi.value : formatCLP(kpi.value)}
            </p>

            <div className="mt-3 flex items-center gap-1.5">
              <span
                className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] font-semibold ${
                  isPositive
                    ? "bg-ch-green-dim text-ch-green"
                    : "bg-ch-red-dim text-ch-red"
                }`}
              >
                {formatPercent(change)}
              </span>
              <span className="text-[11px] text-muted-foreground">vs mes anterior</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
