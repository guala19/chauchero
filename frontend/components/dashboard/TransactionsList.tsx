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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    return { Icon: ArrowDownLeft, bg: "bg-ch-green-dim", fg: "text-ch-green" };
  if (type === "transfer_debit")
    return { Icon: ArrowUpRight, bg: "bg-ch-red-dim", fg: "text-ch-red" };
  return { Icon: CreditCard, bg: "bg-ch-blue-dim", fg: "text-ch-blue" };
}

function typeBadge(type: ApiTransaction["transaction_type"]) {
  if (type === "transfer_credit")
    return { label: "Ingreso",       cls: "bg-ch-green-dim text-ch-green" };
  if (type === "transfer_debit")
    return { label: "Transferencia", cls: "bg-ch-red-dim text-ch-red" };
  return   { label: "Gasto",        cls: "bg-ch-blue-dim text-ch-blue" };
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
  }, []);

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (transactions.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transacciones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Sin transacciones aún</p>
        </div>
        <Card className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="size-14 rounded-full bg-muted flex items-center justify-center">
            <RefreshCw className="size-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Sin transacciones</p>
            <p className="text-[13px] text-muted-foreground mt-1">
              Pulsa el botón <strong>Sincronizar</strong> en la barra superior<br />
              para analizar tus correos de Banco de Chile.
            </p>
          </div>
        </Card>
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
            <h1 className="text-2xl font-bold text-foreground">Transacciones</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {transactions.length} transacciones · Banco de Chile
            </p>
          </div>
          <Badge variant="secondary" className="bg-ch-green-dim text-ch-green mt-1">
            Parser activo
          </Badge>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[12px] font-medium transition-colors duration-150 cursor-pointer",
                tab === t.id
                  ? "bg-secondary text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              <span className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums",
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {counts[t.id]}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-border bg-muted/50">
            {["Descripción", "Tipo", "Fecha", "Tarjeta", "Monto"].map((h) => (
              <span key={h} className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {pageItems.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              Sin transacciones en esta categoría.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pageItems.map((tx) => {
                const { Icon, bg, fg } = rowStyle(tx.transaction_type);
                const badge = typeBadge(tx.transaction_type);
                const isIncome = tx.transaction_type === "transfer_credit";
                return (
                  <button
                    key={tx.id}
                    onClick={() => setSelected(tx)}
                    className="w-full text-left grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 hover:bg-muted/50 transition-colors duration-150 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("size-9 rounded-full flex items-center justify-center shrink-0", bg)}>
                        <Icon className={cn("size-4", fg)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">
                          {tx.description}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {tx.email_subject ?? tx.transaction_type}
                        </p>
                      </div>
                    </div>

                    <div>
                      <Badge variant="secondary" className={cn("text-[11px] font-medium", badge.cls)}>
                        {badge.label}
                      </Badge>
                    </div>

                    <span className="text-[12px] text-muted-foreground">
                      {formatDate(tx.transaction_date)}
                    </span>

                    <span className="text-[12px] font-mono text-muted-foreground">
                      —
                    </span>

                    <span className={cn(
                      "text-[13px] font-semibold font-mono tabular-nums",
                      isIncome ? "text-ch-green" : "text-ch-red"
                    )}>
                      {isIncome ? "+" : "−"} {formatCLP(tx.amount)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-muted/50">
            <span className="text-[12px] text-muted-foreground">
              {filtered.length === 0
                ? "0 resultados"
                : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} de ${filtered.length}`}
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                <ChevronLeft className="size-3.5" />
              </Button>

              {pageNumbers(safePage, totalPages).map((n, i) =>
                n === "…" ? (
                  <span key={`ellipsis-${i}`} className="size-8 flex items-center justify-center text-[12px] text-muted-foreground">
                    …
                  </span>
                ) : (
                  <Button
                    key={n}
                    variant={n === safePage ? "default" : "outline"}
                    size="icon"
                    className="size-8 text-[12px]"
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </Button>
                )
              )}

              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <TransactionDrawer
        transaction={selected ? toDrawerTx(selected) : null}
        note={selected ? (notes[selected.id] ?? "") : ""}
        onClose={() => setSelected(null)}
        onSaveNote={handleSaveNote}
      />
    </>
  );
}
