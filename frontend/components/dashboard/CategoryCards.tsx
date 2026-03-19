"use client";

import { formatCLPCompact } from "@/lib/format";

export interface CategoryData {
  name: string;
  amount: number;
  count: number;
  percent: number;
  color: string;
}

const COLOR_MAP: Record<string, { barFill: string }> = {
  orange: { barFill: "bg-ch-amber" },
  blue:   { barFill: "bg-ch-blue" },
  rose:   { barFill: "bg-ch-red" },
  slate:  { barFill: "bg-muted-foreground/40" },
  green:  { barFill: "bg-ch-green" },
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
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {categories.map((cat) => {
          const colors = COLOR_MAP[cat.color] ?? COLOR_MAP.slate;
          return (
            <div
              key={cat.name}
              className="p-4 bg-secondary rounded-xl ghost-border space-y-3 hover:scale-[1.02] transition-transform cursor-pointer"
            >
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {cat.name}
                </p>
                <h4 className="text-base font-semibold tabular mt-0.5">
                  {formatCLPCompact(cat.amount)}
                </h4>
                <div className="w-full bg-background h-1 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`${colors.barFill} h-full rounded-full transition-all duration-700`}
                    style={{ width: `${cat.percent}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 tabular">
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
