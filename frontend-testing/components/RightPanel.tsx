"use client";

import { useState } from "react";
import { RECENT_TRANSACTIONS, BANKS } from "@/lib/mock-data";
import { formatCLP } from "@/lib/format";
import { MaterialIcon } from "./MaterialIcon";

export default function RightPanel() {
  const [selectedTx, setSelectedTx] = useState<number | null>(null);

  return (
    <aside className="fixed right-0 top-0 h-full w-[272px] bg-[var(--surface-container)] border-l border-[var(--outline)] p-6 flex flex-col gap-10 overflow-y-auto z-40">
      {/* Recent Movements */}
      <section className="space-y-6 animate-slide-in">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--on-surface)]">
            Movimientos recientes
          </h3>
          <a
            href="#"
            className="text-[var(--primary)] text-xs font-semibold hover:underline"
          >
            Ver todos
          </a>
        </div>
        <div className="space-y-1">
          {RECENT_TRANSACTIONS.map((tx) => (
            <div
              key={tx.id}
              onClick={() => setSelectedTx(selectedTx === tx.id ? null : tx.id)}
              className={`flex items-center gap-4 group cursor-pointer p-2 -mx-2 rounded-lg transition-colors ${
                selectedTx === tx.id
                  ? "bg-[var(--surface)]"
                  : "hover:bg-[var(--surface)]"
              }`}
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${tx.dotColor}`} />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-[var(--on-surface)] truncate">
                  {tx.description}
                </h4>
                <p className="text-[10px] text-[var(--tertiary-text)] tabular">
                  {tx.date}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-semibold tabular ${
                    tx.amount > 0
                      ? "text-[var(--success-text)]"
                      : "text-[var(--on-surface)]"
                  }`}
                >
                  {tx.amount > 0 ? "+" : "-"}$ {Math.abs(tx.amount).toLocaleString("es-CL")}
                </span>
                <span className="text-[var(--tertiary-text)]/40 opacity-0 group-hover:opacity-100 transition-opacity text-lg">
                  &#8250;
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bank summary card */}
      <section className="p-6 bg-[var(--surface)] rounded-2xl ghost-border space-y-3 animate-slide-in stagger-2">
        <h4 className="text-[13px] font-semibold text-[var(--on-surface)]">
          Banco de Chile
        </h4>
        <div className="space-y-1">
          <p className="text-[11px] text-[var(--tertiary-text)] tabular">
            142 transacciones sincronizadas
          </p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--success-text)]" />
            <p className="text-[11px] text-[var(--tertiary-text)]">
              Conectado desde febrero 2026
            </p>
          </div>
        </div>
      </section>

      {/* Connected Banks */}
      <section className="space-y-6 animate-slide-in stagger-3">
        <h3 className="text-sm font-semibold text-[var(--on-surface)]">
          Bancos conectados
        </h3>
        <div className="space-y-3">
          {BANKS.map((bank) =>
            bank.connected ? (
              <div
                key={bank.name}
                className="p-4 bg-[var(--surface)] rounded-2xl ghost-border flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center p-2"
                    style={{ backgroundColor: bank.color ?? "#ccc" }}
                  >
                    <span className="text-white font-bold text-xs">
                      {bank.code}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--on-surface)]">
                      {bank.name}
                    </p>
                    <p className="text-[10px] text-[var(--success-text)] font-bold tracking-tighter uppercase">
                      Conectado
                    </p>
                  </div>
                </div>
                <MaterialIcon
                  name="check_circle"
                  filled
                  className="text-[var(--success-text)]"
                />
              </div>
            ) : (
              <div
                key={bank.name}
                className="p-4 bg-[var(--surface)]/50 rounded-2xl border border-dashed border-[var(--outline)] flex items-center gap-3 opacity-60"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--surface-container)] flex items-center justify-center">
                  <MaterialIcon
                    name="add"
                    className="text-[var(--tertiary-text)]"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--on-surface-variant)]">
                    {bank.name}
                  </p>
                  <p className="text-[10px] text-[var(--tertiary-text)] font-medium">
                    Proximamente
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      </section>
    </aside>
  );
}
