"use client";

import Link from "next/link";
import { ArrowUpRight, ArrowDownLeft, CreditCard, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCLP, formatDate } from "@/lib/format";
import type { ApiTransaction } from "@/components/dashboard/TransactionsList";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowStyle(type: ApiTransaction["transaction_type"]) {
  if (type === "transfer_credit")
    return { Icon: ArrowDownLeft, bg: "bg-[var(--green-dim)]", fg: "text-[var(--green)]" };
  if (type === "transfer_debit")
    return { Icon: ArrowUpRight,  bg: "bg-[var(--red-dim)]",   fg: "text-[var(--red)]" };
  return   { Icon: CreditCard,    bg: "bg-[var(--blue-dim)]",  fg: "text-[var(--blue)]" };
}

function categoryLabel(type: ApiTransaction["transaction_type"], category: string | null): string {
  if (category) return category;
  if (type === "transfer_credit") return "Ingreso";
  if (type === "transfer_debit")  return "Transferencia";
  return "Gasto";
}

function categoryStyle(type: ApiTransaction["transaction_type"]) {
  if (type === "transfer_credit")
    return { bg: "bg-[var(--green-dim)]", fg: "text-[var(--green)]" };
  if (type === "transfer_debit")
    return { bg: "bg-[var(--red-dim)]",   fg: "text-[var(--red)]" };
  return { bg: "bg-[var(--blue-dim)]", fg: "text-[var(--blue)]" };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecentTransactions({ transactions }: { transactions: ApiTransaction[] }) {
  if (transactions.length === 0) {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Transacciones Recientes</h2>
          <Link href="/dashboard/transactions" className="flex items-center gap-1 text-xs text-[var(--blue)] hover:underline">
            Ver todas <ChevronRight className="size-3" />
          </Link>
        </div>
        <div className="px-5 py-12 text-center text-sm text-[var(--text-muted)]">
          Sincroniza para ver tus transacciones.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Transacciones Recientes</h2>
        <Link href="/dashboard/transactions" className="flex items-center gap-1 text-xs text-[var(--blue)] hover:underline transition-colors">
          Ver todas <ChevronRight className="size-3" />
        </Link>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-5 py-2.5 border-b border-[var(--border-subtle)]">
        {["Descripción", "Categoría", "Fecha", "Monto"].map((h) => (
          <span key={h} className="text-[11px] font-medium text-[var(--text-muted)]">{h}</span>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-[var(--border-subtle)]">
        {transactions.map((tx) => {
          const { Icon, bg, fg } = rowStyle(tx.transaction_type);
          const { bg: catBg, fg: catFg } = categoryStyle(tx.transaction_type);
          const isCredit = tx.transaction_type === "transfer_credit";
          return (
            <div
              key={tx.id}
              className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 items-center px-5 py-3.5 hover:bg-[var(--bg-elevated)] transition-colors duration-150"
            >
              {/* Description */}
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn("size-9 rounded-full flex items-center justify-center shrink-0", bg)}>
                  <Icon className={cn("size-4", fg)} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{tx.description}</p>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">{tx.email_subject ?? "Banco de Chile"}</p>
                </div>
              </div>

              {/* Category badge */}
              <div>
                <span className={cn("inline-block text-[11px] font-medium px-2.5 py-1 rounded-full", catBg, catFg)}>
                  {categoryLabel(tx.transaction_type, tx.category)}
                </span>
              </div>

              {/* Date */}
              <span className="text-[12px] text-[var(--text-muted)]">{formatDate(tx.transaction_date)}</span>

              {/* Amount */}
              <span className={cn("text-[13px] font-semibold font-mono tabular-nums", isCredit ? "text-[var(--green)]" : "text-[var(--red)]")}>
                {isCredit ? "+ " : ""}{formatCLP(tx.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
