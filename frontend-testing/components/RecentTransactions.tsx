"use client";

import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { RECENT_TRANSACTIONS } from "@/lib/mock-data";
import { formatCLP } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RecentTransactions() {
  return (
    <Card className="animate-fade-in stagger-4 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-[18px] font-semibold text-foreground">Transacciones recientes</h3>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Últimos movimientos</p>
        </div>
        <Button variant="ghost" size="sm" className="text-[13px] text-primary hover:text-primary/80">
          Ver todas
        </Button>
      </div>

      <div className="space-y-1">
        {RECENT_TRANSACTIONS.map((tx) => {
          const isIncome = tx.type === "credit";
          return (
            <div
              key={tx.id}
              className="group flex items-center justify-between rounded-md px-3 py-3 -mx-3 transition-colors duration-150 hover:bg-secondary cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-8 items-center justify-center rounded-full ${
                    isIncome ? "bg-ch-green-dim" : "bg-ch-red-dim"
                  }`}
                >
                  {isIncome ? (
                    <ArrowDownLeft size={14} className="text-ch-green" />
                  ) : (
                    <ArrowUpRight size={14} className="text-ch-red" />
                  )}
                </div>
                <div>
                  <p className="text-[14px] font-medium text-foreground">{tx.description}</p>
                  <p className="text-[11px] text-muted-foreground">{tx.category}</p>
                </div>
              </div>

              <div className="text-right">
                <p
                  className={`num text-[14px] font-semibold ${
                    isIncome ? "text-ch-green" : "text-foreground"
                  }`}
                >
                  {isIncome ? "+" : ""}{formatCLP(tx.amount)}
                </p>
                <p className="text-[11px] text-muted-foreground">{tx.date}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
