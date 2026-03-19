"use client";

import Link from "next/link";
import { formatCLP } from "@/lib/format";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export interface CategoryData {
  name: string;
  amount: number;
  count: number;
  percent: number;
  color: string;
  icon: string;
}

const COLOR_MAP: Record<string, { iconBg: string; iconText: string; barFill: string }> = {
  slate: {
    iconBg: "bg-[var(--outline)]",
    iconText: "text-[var(--on-surface-variant)]",
    barFill: "bg-[var(--on-surface-variant)]/40",
  },
  orange: {
    iconBg: "bg-[#fdf2e9]",
    iconText: "text-orange-600",
    barFill: "bg-orange-400",
  },
  rose: {
    iconBg: "bg-rose-100",
    iconText: "text-rose-600",
    barFill: "bg-rose-400",
  },
  blue: {
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
    barFill: "bg-blue-400",
  },
};

export default function CategoryCards({ categories }: { categories: CategoryData[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-[var(--on-surface)]">
          Resumen por categoría
        </h3>
        <Link
          href="/dashboard/transactions"
          className="text-[var(--on-surface-variant)] text-sm font-semibold hover:text-[var(--on-surface)] hover:underline underline-offset-4 transition-colors"
        >
          Ver detalle
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((cat) => {
          const colors = COLOR_MAP[cat.color] ?? COLOR_MAP.slate;
          return (
            <div
              key={cat.name}
              className="p-5 bg-[var(--surface-container)] rounded-2xl ghost-border space-y-4 hover:scale-[1.02] transition-transform cursor-pointer"
            >
              <div
                className={`w-10 h-10 rounded-full ${colors.iconBg} flex items-center justify-center ${colors.iconText}`}
              >
                <MaterialIcon name={cat.icon} />
              </div>
              <div>
                <p className="text-xs text-[var(--on-surface-variant)] font-medium">
                  {cat.name}
                </p>
                <h4 className="text-lg font-semibold tabular mt-1">
                  {formatCLP(cat.amount)}
                </h4>
                <div className="w-full bg-[var(--surface)] h-1 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`${colors.barFill} h-full rounded-full transition-all duration-700`}
                    style={{ width: `${cat.percent}%` }}
                  />
                </div>
                <p className="text-[10px] text-[var(--tertiary-text)] mt-2 tabular">
                  {cat.count} transacciones
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
