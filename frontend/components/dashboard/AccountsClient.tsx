"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mail, RefreshCw, CheckCircle2, Clock,
  AlertCircle, LogOut, Building2,
} from "lucide-react";
import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  email: string;
  last_sync_at: string | null;
  created_at: string;
}

interface Props {
  user: User | null;
  transactionCount: number;
}

type SyncState = "idle" | "syncing" | "success" | "error";

export default function AccountsClient({ user, transactionCount }: Props) {
  const router = useRouter();
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(user?.last_sync_at ?? null);

  const handleSync = useCallback(async () => {
    setSyncState("syncing");
    setSyncMessage("");
    try {
      const res = await fetch(
        "/api/transactions/sync?max_emails=200",
        { method: "POST" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Error en la sincronización");
      }
      const data = await res.json();
      const created = data.stats?.transactions_created ?? 0;
      setSyncMessage(
        created > 0
          ? `${created} transacción${created !== 1 ? "es" : ""} nueva${created !== 1 ? "s" : ""}`
          : "Todo al día, sin nuevas transacciones"
      );
      setSyncState("success");
      setLastSync(new Date().toISOString());
      router.refresh();
    } catch (e) {
      setSyncMessage(e instanceof Error ? e.message : "Error desconocido");
      setSyncState("error");
    }
  }, [router]);

  const handleDisconnect = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }, [router]);

  if (!user) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-foreground">Cuentas</h1>
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No se pudo cargar la información de la cuenta.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cuentas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gestiona tu conexión con Gmail y los bancos sincronizados
        </p>
      </div>

      {/* Google Account Card */}
      <Card>
        {/* Card header */}
        <CardHeader className="flex-row items-center gap-3 pb-3">
          <div className="size-8 rounded-lg bg-ch-green-dim flex items-center justify-center">
            <CheckCircle2 className="size-4 text-ch-green" />
          </div>
          <div>
            <CardTitle className="text-sm">Cuenta de Google</CardTitle>
            <CardDescription className="text-ch-green text-[11px]">Conectada</CardDescription>
          </div>
        </CardHeader>

        {/* Account info */}
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-muted flex items-center justify-center">
              <Mail className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Gmail vinculado</p>
              <p className="text-[13px] font-medium text-foreground">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-muted flex items-center justify-center">
              <Clock className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Última sincronización</p>
              <p className="text-[13px] font-medium text-foreground">
                {lastSync ? formatRelativeDate(lastSync) : "Nunca sincronizado"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-muted flex items-center justify-center">
              <Building2 className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Transacciones encontradas</p>
              <p className="text-[13px] font-medium text-foreground">
                {transactionCount} transacciones
              </p>
            </div>
          </div>
        </CardContent>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 px-6 py-4 border-t border-border bg-muted/30">
          <Button
            onClick={handleSync}
            disabled={syncState === "syncing"}
            className={cn(
              "flex-1 gap-2",
              syncState === "success" && "bg-ch-green-dim text-ch-green border border-ch-green/30 hover:bg-ch-green-dim",
              syncState === "error" && "bg-ch-red-dim text-destructive border border-destructive/30 hover:bg-ch-red-dim"
            )}
            variant={syncState === "success" || syncState === "error" ? "outline" : "default"}
          >
            {syncState === "syncing" ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : syncState === "success" ? (
              <CheckCircle2 className="size-4" />
            ) : syncState === "error" ? (
              <AlertCircle className="size-4" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {syncState === "syncing"
              ? "Sincronizando correos…"
              : syncState === "success"
                ? "Sincronización exitosa"
                : syncState === "error"
                  ? "Reintentar"
                  : "Sincronizar Gmail ahora"}
          </Button>

          <Button
            variant="outline"
            onClick={handleDisconnect}
            className="gap-2 text-muted-foreground hover:text-destructive hover:border-destructive/40"
          >
            <LogOut className="size-4" />
            Desconectar cuenta
          </Button>
        </div>

        {/* Sync feedback */}
        {syncMessage && (
          <div className={cn(
            "px-6 py-3 text-[12px] border-t border-border",
            syncState === "success" ? "text-ch-green bg-ch-green-dim" : "text-destructive bg-ch-red-dim"
          )}>
            {syncMessage}
          </div>
        )}
      </Card>

      {/* Supported banks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Bancos soportados</CardTitle>
          <CardDescription className="text-[11px]">
            Detectamos automáticamente correos de estos bancos en tu Gmail
          </CardDescription>
        </CardHeader>
        <div className="divide-y divide-border">
          {[
            { name: "Banco de Chile", domain: "bancochile.cl", color: "#E31837", active: true },
            { name: "Santander",      domain: "santander.cl",  color: "#EC0000", active: false },
            { name: "BCI",            domain: "bci.cl",        color: "#003087", active: false },
            { name: "Scotiabank",     domain: "scotiabank.cl", color: "#EC111A", active: false },
          ].map((bank) => (
            <div key={bank.name} className="flex items-center justify-between px-6 py-3.5">
              <div className="flex items-center gap-3">
                <div
                  className="size-8 rounded-lg flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                  style={{ background: bank.color }}
                >
                  {bank.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-foreground">{bank.name}</p>
                  <p className="text-[11px] text-muted-foreground">{bank.domain}</p>
                </div>
              </div>
              <Badge variant={bank.active ? "secondary" : "outline"} className={cn(
                bank.active && "bg-ch-green-dim text-ch-green"
              )}>
                {bank.active ? "Activo" : "Próximamente"}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
