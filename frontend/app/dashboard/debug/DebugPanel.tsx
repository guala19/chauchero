"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCLP } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParseResult {
  amount: string;
  type: string;
  description: string;
  confidence: number;
  date: string;
}

interface EmailResult {
  message_id: string;
  sender: string;
  subject: string;
  date: string;
  has_html_body: boolean;
  parser_found: string | null;
  parse_result: ParseResult | null;
  parse_error: string | null;
}

interface ScanResponse {
  gmail_query: string;
  emails_found: number;
  last_sync_at: string | null;
  results: EmailResult[];
}

interface SyncResponse {
  success: boolean;
  message: string;
  stats: {
    emails_fetched: number;
    transactions_created: number;
    transactions_skipped: number;
    parsing_errors: number;
    unsupported_banks: number;
  };
}

type Status = "idle" | "loading" | "done" | "error";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-block size-2 rounded-full shrink-0",
        ok ? "bg-ch-green" : "bg-ch-red"
      )}
    />
  );
}

function StatusBadge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "amber" | "blue" | "muted" }) {
  const styles = {
    green: "bg-ch-green-dim text-ch-green",
    red:   "bg-ch-red-dim text-ch-red",
    amber: "bg-ch-amber-dim text-ch-amber",
    blue:  "bg-ch-blue-dim text-ch-blue",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full", styles[color])}>
      {children}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 90 ? "var(--ch-green)" : value >= 70 ? "var(--ch-amber)" : "var(--ch-red)";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-[11px] font-mono" style={{ color }}>{value}%</span>
    </div>
  );
}

// ─── Email row ────────────────────────────────────────────────────────────────

function EmailRow({ email, index }: { email: EmailResult; index: number }) {
  const [open, setOpen] = useState(false);

  const status = email.parse_result
    ? "parsed"
    : email.parser_found
    ? "error"
    : "no_parser";

  const statusConfig = {
    parsed:    { label: "Parseado",      color: "green"  as const },
    error:     { label: "Error parse",   color: "red"    as const },
    no_parser: { label: "Sin parser",    color: "muted"  as const },
  };
  const { label, color } = statusConfig[status];

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left grid grid-cols-[32px_1fr_120px_100px_80px] gap-3 items-center px-5 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
      >
        <span className="text-[11px] font-mono text-muted-foreground">#{index + 1}</span>

        <div className="min-w-0">
          <p className="text-[13px] font-medium text-foreground truncate">{email.subject || "(sin asunto)"}</p>
          <p className="text-[11px] text-muted-foreground truncate">{email.sender}</p>
        </div>

        <span className="text-[11px] text-muted-foreground truncate">{email.date.slice(0, 10)}</span>

        <StatusBadge color={color}>{label}</StatusBadge>

        {email.parse_result ? (
          <span className="text-[13px] font-semibold font-mono text-ch-green text-right">
            {formatCLP(Number(email.parse_result.amount))}
          </span>
        ) : <span />}
      </button>

      {open && (
        <div className="px-5 pb-4 pt-1 grid grid-cols-2 gap-4 bg-muted/30">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Correo</p>
            <Row label="ID" value={email.message_id} mono />
            <Row label="Remitente" value={email.sender} />
            <Row label="Asunto" value={email.subject} />
            <Row label="Fecha" value={email.date} />
            <Row label="HTML body" value={email.has_html_body ? "Sí" : "No"} ok={email.has_html_body} />
            <Row label="Parser" value={email.parser_found ?? "—"} ok={!!email.parser_found} />
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Resultado</p>
            {email.parse_result ? (
              <>
                <Row label="Monto"       value={formatCLP(Number(email.parse_result.amount))} ok />
                <Row label="Tipo"        value={email.parse_result.type} />
                <Row label="Descripción" value={email.parse_result.description} />
                <Row label="Fecha tx"    value={email.parse_result.date.slice(0, 19)} />
                <div className="flex items-center gap-3 py-1">
                  <span className="text-[11px] text-muted-foreground w-28 shrink-0">Confianza</span>
                  <ConfidenceBar value={email.parse_result.confidence} />
                </div>
              </>
            ) : email.parse_error ? (
              <div className="rounded-md bg-ch-red-dim border border-destructive/20 px-3 py-2">
                <p className="text-[11px] font-mono text-destructive">{email.parse_error}</p>
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground italic">
                No hay parser registrado para este banco/asunto.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono, ok }: { label: string; value: string; mono?: boolean; ok?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-0.5">
      <span className="text-[11px] text-muted-foreground w-28 shrink-0">{label}</span>
      <span className={cn("text-[11px] text-foreground break-all", mono && "font-mono")}>
        {ok !== undefined && <StatusDot ok={ok} />}{" "}
        {value}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DebugPanel({ hasSession }: { hasSession: boolean }) {
  const [scanStatus,  setScanStatus]  = useState<Status>("idle");
  const [syncStatus,  setSyncStatus]  = useState<Status>("idle");
  const [scanData,    setScanData]    = useState<ScanResponse | null>(null);
  const [syncData,    setSyncData]    = useState<SyncResponse | null>(null);
  const [scanError,   setScanError]   = useState<string | null>(null);
  const [syncError,   setSyncError]   = useState<string | null>(null);
  const [maxEmails,   setMaxEmails]   = useState(500);

  const handleScan = async () => {
    if (!hasSession) return;
    setScanStatus("loading");
    setScanData(null);
    setScanError(null);
    try {
      const res = await fetch(`/api/transactions/debug/gmail-scan?max_emails=${maxEmails}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail ?? "Error desconocido");
      setScanData(json as ScanResponse);
      setScanStatus("done");
    } catch (e: unknown) {
      setScanError(e instanceof Error ? e.message : String(e));
      setScanStatus("error");
    }
  };

  const handleSync = async () => {
    if (!hasSession) return;
    setSyncStatus("loading");
    setSyncData(null);
    setSyncError(null);
    try {
      const res = await fetch(
        "/api/transactions/sync?max_emails=200&force_full_sync=true",
        { method: "POST" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail ?? "Error desconocido");
      setSyncData(json as SyncResponse);
      setSyncStatus("done");
    } catch (e: unknown) {
      setSyncError(e instanceof Error ? e.message : String(e));
      setSyncStatus("error");
    }
  };

  const parsed   = scanData?.results.filter((r) => r.parse_result) ?? [];
  const errors   = scanData?.results.filter((r) => !r.parse_result && r.parser_found) ?? [];
  const noParser = scanData?.results.filter((r) => !r.parser_found) ?? [];

  return (
    <div className="space-y-5">
      {/* Session status */}
      <Card className="flex-row items-center gap-3 px-5 py-4">
        <StatusDot ok={hasSession} />
        <span className="text-sm text-foreground">
          {hasSession ? "Sesión activa" : "Sin sesión — inicia sesión primero"}
        </span>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Scan (dry run) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">1 · Escanear Gmail</CardTitle>
            <CardDescription className="text-[12px]">
              Busca correos y prueba el parser. <strong>No guarda nada en la BD.</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-[12px] text-muted-foreground">Máx. correos</label>
              <Input
                type="number"
                min={1} max={2000}
                value={maxEmails}
                onChange={(e) => setMaxEmails(Number(e.target.value))}
                className="w-20 h-8 text-[12px] font-mono"
              />
            </div>
            <Button
              onClick={handleScan}
              disabled={!hasSession || scanStatus === "loading"}
              className="w-full"
            >
              {scanStatus === "loading" ? "Escaneando…" : "Escanear"}
            </Button>
          </CardContent>
        </Card>

        {/* Sync (saves to DB) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">2 · Sincronizar y guardar</CardTitle>
            <CardDescription className="text-[12px]">
              Hace sync completo (force_full_sync). <strong>Guarda transacciones en la BD.</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleSync}
              disabled={!hasSession || syncStatus === "loading"}
              variant="secondary"
              className="w-full bg-ch-green text-white hover:bg-ch-green/90"
            >
              {syncStatus === "loading" ? "Sincronizando…" : "Sincronizar ahora"}
            </Button>

            {syncData && (
              <div className="rounded-md bg-muted border border-border p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <StatusDot ok={syncData.success} />
                  <span className="text-[12px] font-medium text-foreground">{syncData.message}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                  {Object.entries(syncData.stats).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">{k.replace(/_/g, " ")}</span>
                      <span className="text-[11px] font-mono font-semibold text-foreground">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {syncError && (
              <div className="rounded-md bg-ch-red-dim border border-destructive/20 px-3 py-2">
                <p className="text-[11px] font-mono text-destructive">{syncError}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scan error */}
      {scanError && (
        <Card className="bg-ch-red-dim border-destructive/20 px-5 py-4">
          <p className="text-sm font-semibold text-destructive mb-1">Error al escanear Gmail</p>
          <p className="text-[12px] font-mono text-destructive">{scanError}</p>
        </Card>
      )}

      {/* Scan results */}
      {scanData && (
        <div className="space-y-4">
          <Card className="px-5 py-4 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Query Gmail usada</p>
            <code className="text-[11px] font-mono text-ch-blue break-all leading-relaxed block">
              {scanData.gmail_query}
            </code>
          </Card>

          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Emails encontrados", value: scanData.emails_found,  color: "text-foreground" },
              { label: "Parseados OK",        value: parsed.length,          color: "text-ch-green" },
              { label: "Error de parse",      value: errors.length,          color: "text-ch-red" },
              { label: "Sin parser",          value: noParser.length,        color: "text-muted-foreground" },
            ].map((s) => (
              <Card key={s.label} className="px-4 py-3 text-center">
                <p className={cn("text-2xl font-bold font-mono", s.color)}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
              </Card>
            ))}
          </div>

          {scanData.results.length === 0 ? (
            <Card className="px-5 py-16 text-center">
              <p className="text-sm font-medium text-foreground">No se encontraron correos</p>
              <p className="text-[12px] text-muted-foreground mt-1 max-w-sm mx-auto">
                La query de Gmail no devolvió resultados.
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="grid grid-cols-[32px_1fr_120px_100px_80px] gap-3 px-5 py-3 border-b border-border bg-muted/50">
                {["#", "Correo", "Fecha", "Estado", "Monto"].map((h) => (
                  <span key={h} className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {h}
                  </span>
                ))}
              </div>

              {scanData.results.map((email, i) => (
                <EmailRow key={email.message_id} email={email} index={i} />
              ))}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
