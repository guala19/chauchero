"use client";

import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { RECENT_TRANSACTIONS } from "@/lib/mock-data";
import { formatCLP } from "@/lib/format";

export default function RecentTransactions() {
  return (
    <div className="animate-fade-in stagger-4 rounded-[14px] border border-border-subtle bg-bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-[18px] font-semibold text-text-primary">Transacciones recientes</h3>
          <p className="mt-0.5 text-[13px] text-text-secondary">Últimos movimientos</p>
        </div>
        <button className="text-[13px] font-medium text-ch-blue hover:brightness-125 transition-all duration-150">
          Ver todas
        </button>
      </div>

      <div className="space-y-1">
        {RECENT_TRANSACTIONS.map((tx) => {
          const isIncome = tx.type === "credit";
          return (
            <div
              key={tx.id}
              className="group flex items-center justify-between rounded-[6px] px-3 py-3 -mx-3 transition-colors duration-150 hover:bg-bg-elevated cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    isIncome ? "bg-green-dim" : "bg-red-dim"
                  }`}
                >
                  {isIncome ? (
                    <ArrowDownLeft size={14} className="text-ch-green" />
                  ) : (
                    <ArrowUpRight size={14} className="text-ch-red" />
                  )}
                </div>
                <div>
                  <p className="text-[14px] font-medium text-text-primary">{tx.description}</p>
                  <p className="text-[11px] text-text-muted">{tx.category}</p>
                </div>
              </div>

              <div className="text-right">
                <p
                  className={`num text-[14px] font-semibold ${
                    isIncome ? "text-ch-green" : "text-text-primary"
                  }`}
                >
                  {isIncome ? "+" : ""}{formatCLP(tx.amount)}
                </p>
                <p className="text-[11px] text-text-muted">{tx.date}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
