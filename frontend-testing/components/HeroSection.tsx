"use client";

import { HERO_DATA } from "@/lib/mock-data";
import { formatCLP } from "@/lib/format";

export default function HeroSection() {
  return (
    <section className="space-y-4 animate-fade-in">
      <span className="text-[var(--on-surface-variant)] text-sm font-medium tracking-wide">
        Gastos de marzo
      </span>
      <div className="flex items-baseline gap-4">
        <h2
          className="text-5xl font-semibold tabular text-[var(--on-surface)]"
          style={{ letterSpacing: "-0.02em" }}
        >
          {formatCLP(HERO_DATA.gastoMes)}
        </h2>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--success-bg)] text-[var(--success-text)] rounded-full text-xs font-semibold tabular">
          <span>&#8593;</span>
          {HERO_DATA.variacionPercent.toFixed(1).replace(".", ",")}% vs febrero
        </div>
      </div>
      <div>
        <p className="text-[var(--success-text)] text-sm font-medium tabular">
          Ingresos del mes: {formatCLP(HERO_DATA.ingresoMes)}
        </p>
        <p className="text-[var(--tertiary-text)] text-sm mt-1">
          {HERO_DATA.transacciones} transacciones
        </p>
      </div>
    </section>
  );
}
