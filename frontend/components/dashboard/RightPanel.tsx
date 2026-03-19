"use client";

import Link from "next/link";
import { formatCLP, formatDate } from "@/lib/format";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import type { ApiTransaction } from "@/lib/api";

function dotColor(type: ApiTransaction["transaction_type"], category: string | null): string {
  if (type === "transfer_credit") return "bg-[var(--success-text)]";
  if (type === "transfer_debit") return "bg-blue-400";
  if (category?.toLowerCase().includes("supermercado") || category?.toLowerCase().includes("alimenta")) return "bg-orange-400";
  if (category?.toLowerCase().includes("transport")) return "bg-blue-400";
  if (category?.toLowerCase().includes("restaur")) return "bg-rose-400";
  return "bg-[var(--tertiary-text)]";
}

export default function RightPanel({
  transactions,
  totalCount,
}: {
  transactions: ApiTransaction[];
  totalCount: number;
}) {
  return (
    <aside className="hidden xl:flex fixed right-0 top-0 h-full w-[272px] bg-[var(--surface-container)] border-l border-[var(--outline)] p-6 flex-col gap-10 overflow-y-auto z-50">
      {/* Recent Movements */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--on-surface)]">
            Movimientos recientes
          </h3>
          <Link
            href="/dashboard/transactions"
            className="text-[var(--on-surface-variant)] text-xs font-semibold hover:text-[var(--on-surface)] hover:underline transition-colors"
          >
            Ver todos
          </Link>
        </div>
        <div className="space-y-1">
          {transactions.length === 0 ? (
            <p className="text-xs text-[var(--tertiary-text)] py-8 text-center">
              Sincroniza para ver transacciones
            </p>
          ) : (
            transactions.map((tx) => {
              const isCredit = tx.transaction_type === "transfer_credit";
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 group cursor-pointer p-2 -mx-2 rounded-lg hover:bg-[var(--surface)] transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor(tx.transaction_type, tx.category)}`} />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-[var(--on-surface)] truncate">
                      {tx.description}
                    </h4>
                    <p className="text-[10px] text-[var(--tertiary-text)] tabular">
                      {formatDate(tx.transaction_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold tabular ${
                        isCredit ? "text-[var(--success-text)]" : "text-[var(--on-surface)]"
                      }`}
                    >
                      {isCredit ? "+" : "-"}$ {Math.abs(tx.amount).toLocaleString("es-CL")}
                    </span>
                    <span className="text-[var(--tertiary-text)]/40 opacity-0 group-hover:opacity-100 transition-opacity text-lg">
                      ›
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Bank summary card */}
      {totalCount > 0 && (
        <section className="p-6 bg-[var(--surface)] rounded-2xl ghost-border space-y-3">
          <h4 className="text-[13px] font-semibold text-[var(--on-surface)]">
            Banco de Chile
          </h4>
          <div className="space-y-1">
            <p className="text-[11px] text-[var(--tertiary-text)] tabular">
              {totalCount} transacciones sincronizadas
            </p>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--success-text)] shrink-0" />
              <p className="text-[11px] text-[var(--tertiary-text)] whitespace-nowrap">
                Conectado desde feb 2026
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Connected Banks */}
      <section className="space-y-6">
        <h3 className="text-sm font-semibold text-[var(--on-surface)]">
          Bancos conectados
        </h3>
        <div className="space-y-3">
          <div className="p-4 bg-[var(--surface)] rounded-2xl ghost-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#002e67] flex items-center justify-center p-2">
                <span className="text-white font-bold text-xs">CHILE</span>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--on-surface)]">Banco de Chile</p>
                <p className="text-[10px] text-[var(--success-text)] font-bold tracking-tighter uppercase">Conectado</p>
              </div>
            </div>
            <MaterialIcon name="check_circle" filled className="text-[var(--success-text)]" />
          </div>

          <div className="p-4 bg-[var(--surface)]/50 rounded-2xl border border-dashed border-[var(--outline)] flex items-center gap-3 opacity-60">
            <div className="w-10 h-10 rounded-lg bg-[var(--surface-container)] flex items-center justify-center">
              <MaterialIcon name="add" className="text-[var(--tertiary-text)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--on-surface-variant)]">Santander Chile</p>
              <p className="text-[10px] text-[var(--tertiary-text)] font-medium">Próximamente</p>
            </div>
          </div>

          <div className="p-4 bg-[var(--surface)]/50 rounded-2xl border border-dashed border-[var(--outline)] flex items-center gap-3 opacity-60">
            <div className="w-10 h-10 rounded-lg bg-[var(--surface-container)] flex items-center justify-center">
              <MaterialIcon name="add" className="text-[var(--tertiary-text)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--on-surface-variant)]">Banco Bci</p>
              <p className="text-[10px] text-[var(--tertiary-text)] font-medium">Próximamente</p>
            </div>
          </div>
        </div>
      </section>
    </aside>
  );
}
