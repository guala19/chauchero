"use client";

import Link from "next/link";
import { ArrowUpRight, ArrowDownLeft, CreditCard, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCLP, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ApiTransaction } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowStyle(type: ApiTransaction["transaction_type"]) {
  if (type === "transfer_credit")
    return { Icon: ArrowDownLeft, bg: "bg-ch-green-dim", fg: "text-ch-green" };
  if (type === "transfer_debit")
    return { Icon: ArrowUpRight,  bg: "bg-ch-red-dim",   fg: "text-ch-red" };
  return   { Icon: CreditCard,    bg: "bg-ch-blue-dim",  fg: "text-ch-blue" };
}

function categoryLabel(type: ApiTransaction["transaction_type"], category: string | null): string {
  if (category) return category;
  if (type === "transfer_credit") return "Ingreso";
  if (type === "transfer_debit")  return "Transferencia";
  return "Gasto";
}

function categoryStyle(type: ApiTransaction["transaction_type"]) {
  if (type === "transfer_credit")
    return "bg-ch-green-dim text-ch-green";
  if (type === "transfer_debit")
    return "bg-ch-red-dim text-ch-red";
  return "bg-ch-blue-dim text-ch-blue";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecentTransactions({ transactions }: { transactions: ApiTransaction[] }) {
  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm">Transacciones Recientes</CardTitle>
          <Link href="/dashboard/transactions" className="flex items-center gap-1 text-xs text-primary hover:underline">
            Ver todas <ChevronRight className="size-3" />
          </Link>
        </CardHeader>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Sincroniza para ver tus transacciones.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm">Transacciones Recientes</CardTitle>
        <Link href="/dashboard/transactions" className="flex items-center gap-1 text-xs text-primary hover:underline transition-colors">
          Ver todas <ChevronRight className="size-3" />
        </Link>
      </CardHeader>

      {/* Column headers */}
      <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-6 py-2.5 border-y border-border">
        {["Descripción", "Categoría", "Fecha", "Monto"].map((h) => (
          <span key={h} className="text-[11px] font-medium text-muted-foreground">{h}</span>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {transactions.map((tx) => {
          const { Icon, bg, fg } = rowStyle(tx.transaction_type);
          const isCredit = tx.transaction_type === "transfer_credit";
          return (
            <div
              key={tx.id}
              className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 items-center px-6 py-3.5 hover:bg-muted/50 transition-colors duration-150 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn("size-9 rounded-full flex items-center justify-center shrink-0", bg)}>
                  <Icon className={cn("size-4", fg)} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{tx.description}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{tx.email_subject ?? "Banco de Chile"}</p>
                </div>
              </div>

              <div>
                <Badge variant="secondary" className={cn("text-[11px] font-medium", categoryStyle(tx.transaction_type))}>
                  {categoryLabel(tx.transaction_type, tx.category)}
                </Badge>
              </div>

              <span className="text-[12px] text-muted-foreground">{formatDate(tx.transaction_date)}</span>

              <span className={cn("text-[13px] font-semibold font-mono tabular-nums", isCredit ? "text-ch-green" : "text-ch-red")}>
                {isCredit ? "+ " : ""}{formatCLP(tx.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
