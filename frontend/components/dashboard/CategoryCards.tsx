"use client";

import { ShoppingCart, Car, UtensilsCrossed, Layers } from "lucide-react";
import { formatCLPCompact } from "@/lib/format";
import type { LucideIcon } from "lucide-react";

export interface CategoryData {
  name: string;
  amount: number;
  count: number;
  percent: number;
  color: string;
}

const COLOR_MAP: Record<string, { iconBg: string; iconText: string; barFill: string; Icon: LucideIcon }> = {
  orange: {
    iconBg: "bg-[#fdf2e9]",
    iconText: "text-orange-600",
    barFill: "bg-orange-400",
    Icon: ShoppingCart,
  },
  blue: {
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
    barFill: "bg-blue-400",
    Icon: Car,
  },
  rose: {
    iconBg: "bg-rose-100",
    iconText: "text-rose-600",
    barFill: "bg-rose-400",
    Icon: UtensilsCrossed,
  },
  slate: {
    iconBg: "bg-[var(--outline)]",
    iconText: "text-[var(--on-surface-variant)]",
    barFill: "bg-muted-foreground/40",
    Icon: Layers,
  },
  green: {
    iconBg: "bg-[var(--success-bg)]",
    iconText: "text-[var(--success-text)]",
    barFill: "bg-ch-green",
    Icon: Layers,
  },
};

export default function CategoryCards({ categories }: { categories: CategoryData[] }) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-foreground">
          Resumen por categoría
        </h3>
        <a
          href="/dashboard/transactions"
          className="text-primary text-sm font-semibold hover:underline underline-offset-4"
        >
          Ver detalle
        </a>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {categories.map((cat) => {
          const colors = COLOR_MAP[cat.color] ?? COLOR_MAP.slate;
          const Icon = colors.Icon;
          return (
            <div
              key={cat.name}
              className="p-5 bg-secondary rounded-2xl ghost-border space-y-4 hover:scale-[1.02] transition-transform cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-full ${colors.iconBg} flex items-center justify-center ${colors.iconText}`}>
                <Icon className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  {cat.name}
                </p>
                <h4 className="text-lg font-semibold tabular mt-1">
                  {formatCLPCompact(cat.amount)}
                </h4>
                <div className="w-full bg-background h-1 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`${colors.barFill} h-full rounded-full transition-all duration-700`}
                    style={{ width: `${cat.percent}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 tabular">
                  {cat.count} transaccion{cat.count !== 1 ? "es" : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
