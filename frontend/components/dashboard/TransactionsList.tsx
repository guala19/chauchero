"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCLP, formatDate, formatCardNumber } from "@/lib/format";
import TransactionDrawer, {
  type Transaction,
} from "@/components/ui/TransactionDrawer";

// ─── Types ────────────────────────────────────────────────────────────────────

export type { ApiTransaction } from "@/lib/api";
import type { ApiTransaction } from "@/lib/api";

type FilterTab = "all" | "debit" | "transfer" | "income";

const PAGE_SIZE = 10;

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all",      label: "Todas" },
  { id: "debit",    label: "Gastos" },
  { id: "transfer", label: "Transferencias" },
  { id: "income",   label: "Ingresos" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowStyle(type: ApiTransaction["transaction_type"]) {
  if (type === "transfer_credit")
    return { Icon: ArrowDownLeft, bg: "bg-[var(--green-dim)]", fg: "text-[var(--green)]" };
  if (type === "transfer_debit")
    return { Icon: ArrowUpRight, bg: "bg-[var(--red-dim)]", fg: "text-[var(--red)]" };
  return { Icon: CreditCard, bg: "bg-[var(--blue-dim)]", fg: "text-[var(--blue)]" };
}

function typeBadge(type: ApiTransaction["transaction_type"]) {
  if (type === "transfer_credit")
    return { label: "Ingreso",       bg: "bg-[var(--green-dim)]", fg: "text-[var(--green)]" };
  if (type === "transfer_debit")
    return { label: "Transferencia", bg: "bg-[var(--red-dim)]",   fg: "text-[var(--red)]" };
  return   { label: "Gasto",        bg: "bg-[var(--blue-dim)]",  fg: "text-[var(--blue)]" };
}

function toDrawerTx(tx: ApiTransaction): Transaction {
  const typeMap = {
    debit:          "expense"  as const,
    transfer_debit: "transfer" as const,
    transfer_credit:"income"   as const,
  };
  const isIncome = tx.transaction_type === "transfer_credit";
  return {
    id:          tx.id,
    description: tx.description,
    amount:      isIncome ? tx.amount : -tx.amount,
    type:        typeMap[tx.transaction_type],
    date:        formatDate(tx.transaction_date),
    bank:        "Banco de Chile",
    confidence:  tx.parser_confidence,
  };
}

// ─── Pagination helper ────────────────────────────────────────────────────────

function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++)
    pages.push(i);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TransactionsList({
  transactions,
}: {
  transactions: ApiTransaction[];
}) {
  const [tab,      setTab]      = useState<FilterTab>("all");
  const [page,     setPage]     = useState(1);
  const [selected, setSelected] = useState<ApiTransaction | null>(null);
  const [notes,    setNotes]    = useState<Record<string, string>>(() =>
    Object.fromEntries(transactions.filter((t) => t.notes).map((t) => [t.id, t.notes!]))
  );

  const filtered = useMemo(() => {
    if (tab === "all")      return transactions;
    if (tab === "debit")    return transactions.filter((t) => t.transaction_type === "debit");
    if (tab === "transfer") return transactions.filter((t) =>
      t.transaction_type === "transfer_debit" || t.transaction_type === "transfer_credit"
    );
    if (tab === "income")   return transactions.filter((t) => t.transaction_type === "transfer_credit");
    return transactions;
  }, [tab, transactions]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const counts = useMemo(() => ({
    all:      transactions.length,
    debit:    transactions.filter((t) => t.transaction_type === "debit").length,
    transfer: transactions.filter((t) => t.transaction_type.startsWith("transfer")).length,
    income:   transactions.filter((t) => t.transaction_type === "transfer_credit").length,
  }), [transactions]);

  const handleTabChange = useCallback((id: FilterTab) => {
    setTab(id);
    setPage(1);
  }, []);

  const handleSaveNote = useCallback((id: string, note: string) => {
    setNotes((prev) => ({ ...prev, [id]: note }));
    // TODO: PATCH /transactions/{id} to persist
  }, []);

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (transactions.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Transacciones</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Sin transacciones aún</p>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] flex flex-col items-center justify-center py-20 gap-4">
          <div className="size-14 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center">
            <RefreshCw className="size-6 text-[var(--text-muted)]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--text-primary)]">Sin transacciones</p>
            <p className="text-[13px] text-[var(--text-muted)] mt-1">
              Pulsa el botón <strong>Sincronizar</strong> en la barra superior<br />
              para analizar tus correos de Banco de Chile.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main view ───────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Transacciones</h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              {transactions.length} transacciones · Banco de Chile
            </p>
          </div>
          <span className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[var(--green-dim)] text-[var(--green)] mt-1">
            Parser activo
          </span>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius)] text-[12px] font-medium transition-colors duration-150",
                tab === t.id
                  ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              {t.label}
              <span className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums",
                tab === t.id
                  ? "bg-[var(--blue)] text-white"
                  : "bg-[var(--bg-overlay)] text-[var(--text-muted)]"
              )}>
                {counts[t.id]}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
            {["Descripción", "Tipo", "Fecha", "Tarjeta", "Monto"].map((h) => (
              <span key={h} className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {pageItems.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-[var(--text-muted)]">
              Sin transacciones en esta categoría.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {pageItems.map((tx) => {
                const { Icon, bg, fg } = rowStyle(tx.transaction_type);
                const badge = typeBadge(tx.transaction_type);
                const isIncome = tx.transaction_type === "transfer_credit";
                return (
                  <button
                    key={tx.id}
                    onClick={() => setSelected(tx)}
                    className="w-full text-left grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 hover:bg-[var(--bg-elevated)] transition-colors duration-150"
                  >
                    {/* Description */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("size-9 rounded-full flex items-center justify-center shrink-0", bg)}>
                        <Icon className={cn("size-4", fg)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                          {tx.description}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] truncate">
                          {tx.email_subject ?? tx.transaction_type}
                        </p>
                      </div>
                    </div>

                    {/* Type */}
                    <div>
                      <span className={cn("inline-block text-[11px] font-medium px-2.5 py-1 rounded-full", badge.bg, badge.fg)}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Date */}
                    <span className="text-[12px] text-[var(--text-muted)]">
                      {formatDate(tx.transaction_date)}
                    </span>

                    {/* Card */}
                    <span className="text-[12px] font-mono text-[var(--text-muted)]">
                      —
                    </span>

                    {/* Amount */}
                    <span className={cn(
                      "text-[13px] font-semibold font-mono tabular-nums",
                      isIncome ? "text-[var(--green)]" : "text-[var(--red)]"
                    )}>
                      {isIncome ? "+" : "−"} {formatCLP(tx.amount)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--border)] bg-[var(--bg-elevated)]">
            <span className="text-[12px] text-[var(--text-muted)]">
              {filtered.length === 0
                ? "0 resultados"
                : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} de ${filtered.length}`}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className={cn(
                  "size-8 flex items-center justify-center rounded-[var(--radius)] border border-[var(--border)] transition-colors",
                  safePage === 1
                    ? "opacity-30 cursor-not-allowed text-[var(--text-muted)]"
                    : "hover:bg-[var(--bg-base)] text-[var(--text-secondary)]"
                )}
              >
                <ChevronLeft className="size-3.5" />
              </button>

              {pageNumbers(safePage, totalPages).map((n, i) =>
                n === "…" ? (
                  <span key={`ellipsis-${i}`} className="size-8 flex items-center justify-center text-[12px] text-[var(--text-muted)]">
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={cn(
                      "size-8 flex items-center justify-center rounded-[var(--radius)] text-[12px] font-medium transition-colors border",
                      n === safePage
                        ? "bg-[var(--blue)] text-white border-[var(--blue)]"
                        : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {n}
                  </button>
                )
              )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className={cn(
                  "size-8 flex items-center justify-center rounded-[var(--radius)] border border-[var(--border)] transition-colors",
                  safePage === totalPages
                    ? "opacity-30 cursor-not-allowed text-[var(--text-muted)]"
                    : "hover:bg-[var(--bg-base)] text-[var(--text-secondary)]"
                )}
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer */}
      <TransactionDrawer
        transaction={selected ? toDrawerTx(selected) : null}
        note={selected ? (notes[selected.id] ?? "") : ""}
        onClose={() => setSelected(null)}
        onSaveNote={handleSaveNote}
      />
    </>
  );
}
