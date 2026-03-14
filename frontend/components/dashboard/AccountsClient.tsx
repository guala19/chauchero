"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mail, RefreshCw, CheckCircle2, Clock,
  AlertCircle, LogOut, Building2,
} from "lucide-react";
import { formatDate, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getToken(): string {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split("; ")
      .find((r) => r.startsWith("auth-token="))
      ?.split("=")[1] ?? ""
  );
}

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
    const token = getToken();
    if (!token) return;
    setSyncState("syncing");
    setSyncMessage("");
    try {
      const res = await fetch(
        `${API_URL}/transactions/sync?token=${token}&max_emails=200`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Error en la sincronización");
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

  const handleDisconnect = useCallback(() => {
    document.cookie = "auth-token=; path=/; max-age=0; SameSite=Lax";
    router.push("/");
  }, [router]);

  if (!user) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Cuentas</h1>
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">No se pudo cargar la información de la cuenta.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Cuentas</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Gestiona tu conexión con Gmail y los bancos sincronizados
        </p>
      </div>

      {/* Google Account Card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden">
        {/* Card header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
          <div className="size-8 rounded-lg bg-[var(--green-dim)] flex items-center justify-center">
            <CheckCircle2 className="size-4 text-[var(--green)]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Cuenta de Google</h2>
            <p className="text-[11px] text-[var(--green)]">Conectada</p>
          </div>
        </div>

        {/* Account info */}
        <div className="px-5 py-4 space-y-4">
          {/* Email */}
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center">
              <Mail className="size-4 text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-[11px] text-[var(--text-muted)]">Gmail vinculado</p>
              <p className="text-[13px] font-medium text-[var(--text-primary)]">{user.email}</p>
            </div>
          </div>

          {/* Last sync */}
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center">
              <Clock className="size-4 text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-[11px] text-[var(--text-muted)]">Última sincronización</p>
              <p className="text-[13px] font-medium text-[var(--text-primary)]">
                {lastSync ? formatRelativeDate(lastSync) : "Nunca sincronizado"}
              </p>
            </div>
          </div>

          {/* Transaction count */}
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center">
              <Building2 className="size-4 text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-[11px] text-[var(--text-muted)]">Transacciones encontradas</p>
              <p className="text-[13px] font-medium text-[var(--text-primary)]">
                {transactionCount} transacciones
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 px-5 py-4 border-t border-[var(--border)] bg-[var(--bg-elevated)]">
          {/* Sync button */}
          <button
            onClick={handleSync}
            disabled={syncState === "syncing"}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius)] text-sm font-semibold transition-all",
              syncState === "syncing"
                ? "bg-[var(--blue)]/60 text-white cursor-not-allowed"
                : syncState === "success"
                  ? "bg-[var(--green-dim)] text-[var(--green)] border border-[var(--green)]/30"
                  : syncState === "error"
                    ? "bg-[var(--red-dim)] text-[var(--red)] border border-[var(--red)]/30"
                    : "bg-[var(--blue)] text-white hover:opacity-90"
            )}
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
          </button>

          {/* Disconnect */}
          <button
            onClick={handleDisconnect}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius)] text-sm font-medium text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--red)]/40 hover:text-[var(--red)] transition-colors"
          >
            <LogOut className="size-4" />
            Desconectar cuenta
          </button>
        </div>

        {/* Sync feedback message */}
        {syncMessage && (
          <div className={cn(
            "px-5 py-3 text-[12px] border-t border-[var(--border)]",
            syncState === "success" ? "text-[var(--green)] bg-[var(--green-dim)]" : "text-[var(--red)] bg-[var(--red-dim)]"
          )}>
            {syncMessage}
          </div>
        )}
      </div>

      {/* Supported banks info */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Bancos soportados</h2>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Detectamos automáticamente correos de estos bancos en tu Gmail
          </p>
        </div>
        <div className="divide-y divide-[var(--border-subtle)]">
          {[
            { name: "Banco de Chile", domain: "bancochile.cl", color: "#E31837", active: true },
            { name: "Santander",      domain: "santander.cl",  color: "#EC0000", active: false },
            { name: "BCI",            domain: "bci.cl",        color: "#003087", active: false },
            { name: "Scotiabank",     domain: "scotiabank.cl", color: "#EC111A", active: false },
          ].map((bank) => (
            <div key={bank.name} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div
                  className="size-8 rounded-lg flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                  style={{ background: bank.color }}
                >
                  {bank.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[var(--text-primary)]">{bank.name}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{bank.domain}</p>
                </div>
              </div>
              <span className={cn(
                "text-[11px] font-medium px-2.5 py-1 rounded-full",
                bank.active
                  ? "bg-[var(--green-dim)] text-[var(--green)]"
                  : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
              )}>
                {bank.active ? "Activo" : "Próximamente"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
