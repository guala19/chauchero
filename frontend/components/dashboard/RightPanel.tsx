"use client";

import Link from "next/link";
import { CheckCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCLP, formatDate } from "@/lib/format";
import type { ApiTransaction } from "@/lib/api";
import { SUPPORTED_BANKS } from "@/lib/constants";

function dotColor(type: ApiTransaction["transaction_type"], category: string | null): string {
  if (type === "transfer_credit") return "bg-ch-green";
  if (type === "transfer_debit") return "bg-ch-blue";
  if (category?.toLowerCase().includes("supermercado") || category?.toLowerCase().includes("alimenta")) return "bg-ch-amber";
  if (category?.toLowerCase().includes("transport")) return "bg-ch-blue";
  if (category?.toLowerCase().includes("restaur")) return "bg-ch-red";
  return "bg-muted-foreground";
}

export default function RightPanel({
  transactions,
  totalCount,
}: {
  transactions: ApiTransaction[];
  totalCount: number;
}) {
  return (
    <aside className="hidden xl:flex fixed right-0 top-0 h-full w-[var(--right-panel-w)] bg-secondary border-l border-border p-6 pt-8 flex-col gap-8 overflow-y-auto z-50"
      style={{ "--right-panel-w": "272px" } as React.CSSProperties}
    >
      {/* Recent Movements */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Movimientos recientes
          </h3>
          <Link
            href="/dashboard/transactions"
            className="text-primary text-xs font-semibold hover:underline"
          >
            Ver todos
          </Link>
        </div>
        <div className="space-y-0.5">
          {transactions.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">
              Sincroniza para ver transacciones
            </p>
          ) : (
            transactions.map((tx) => {
              const isCredit = tx.transaction_type === "transfer_credit";
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 group cursor-pointer p-2 -mx-2 rounded-lg hover:bg-background transition-colors"
                >
                  <div className={cn("w-2 h-2 rounded-full shrink-0", dotColor(tx.transaction_type, tx.category))} />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground truncate">
                      {tx.description}
                    </h4>
                    <p className="text-xs text-muted-foreground tabular">
                      {formatDate(tx.transaction_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-semibold tabular",
                        isCredit ? "text-ch-green" : "text-foreground"
                      )}
                    >
                      {isCredit ? "+" : "-"}{formatCLP(tx.amount)}
                    </span>
                    <span className="text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                      ›
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Bank summary */}
      {totalCount > 0 && (
        <section className="p-5 bg-background rounded-2xl ghost-border space-y-3">
          <h4 className="text-[13px] font-semibold text-foreground">
            Banco de Chile
          </h4>
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground tabular">
              {totalCount} transacciones sincronizadas
            </p>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-ch-green" />
              <p className="text-[11px] text-muted-foreground">
                Conectado desde febrero 2026
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Connected banks */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Bancos conectados
        </h3>
        <div className="space-y-2">
          {/* Active bank */}
          <div className="p-4 bg-background rounded-2xl ghost-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#002e67] flex items-center justify-center p-2">
                <span className="text-white font-bold text-xs">CHILE</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Banco de Chile</p>
                <p className="text-[10px] text-ch-green font-bold tracking-tighter uppercase">Conectado</p>
              </div>
            </div>
            <CheckCircle className="size-5 text-ch-green fill-ch-green stroke-background" />
          </div>

          {/* Upcoming banks */}
          {SUPPORTED_BANKS.slice(1, 3).map((bank) => (
            <div
              key={bank.id}
              className="p-4 bg-background/50 rounded-2xl border border-dashed border-border flex items-center gap-3 opacity-60"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Plus className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{bank.name}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Próximamente</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
