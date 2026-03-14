"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCLP } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
        ok ? "bg-[var(--green)]" : "bg-[var(--red)]"
      )}
    />
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "amber" | "blue" | "muted" }) {
  const styles = {
    green: "bg-[var(--green-dim)] text-[var(--green)]",
    red:   "bg-[var(--red-dim)] text-[var(--red)]",
    amber: "bg-[var(--amber-dim)] text-[var(--amber)]",
    blue:  "bg-[var(--blue-dim)] text-[var(--blue)]",
    muted: "bg-[var(--bg-elevated)] text-[var(--text-muted)]",
  };
  return (
    <span className={cn("inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full", styles[color])}>
      {children}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 90 ? "var(--green)" : value >= 70 ? "var(--amber)" : "var(--red)";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
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
    : email.parser_found === null
    ? "no_parser"
    : "no_parser";

  const statusConfig = {
    parsed:    { label: "Parseado",      color: "green"  as const },
    error:     { label: "Error parse",   color: "red"    as const },
    no_parser: { label: "Sin parser",    color: "muted"  as const },
  };
  const { label, color } = statusConfig[status];

  return (
    <div className="border-b border-[var(--border-subtle)] last:border-0">
      {/* Summary row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left grid grid-cols-[32px_1fr_120px_100px_80px] gap-3 items-center px-5 py-3 hover:bg-[var(--bg-elevated)] transition-colors"
      >
        <span className="text-[11px] font-mono text-[var(--text-muted)]">#{index + 1}</span>

        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{email.subject || "(sin asunto)"}</p>
          <p className="text-[11px] text-[var(--text-muted)] truncate">{email.sender}</p>
        </div>

        <span className="text-[11px] text-[var(--text-muted)] truncate">{email.date.slice(0, 10)}</span>

        <Badge color={color}>{label}</Badge>

        {email.parse_result && (
          <span className="text-[13px] font-semibold font-mono text-[var(--green)] text-right">
            {formatCLP(Number(email.parse_result.amount))}
          </span>
        )}
        {!email.parse_result && <span />}
      </button>

      {/* Detail panel */}
      {open && (
        <div className="px-5 pb-4 pt-1 grid grid-cols-2 gap-4 bg-[var(--bg-elevated)]">
          {/* Left: raw info */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Correo</p>
            <Row label="ID" value={email.message_id} mono />
            <Row label="Remitente" value={email.sender} />
            <Row label="Asunto" value={email.subject} />
            <Row label="Fecha" value={email.date} />
            <Row label="HTML body" value={email.has_html_body ? "Sí" : "No"} ok={email.has_html_body} />
            <Row label="Parser" value={email.parser_found ?? "—"} ok={!!email.parser_found} />
          </div>

          {/* Right: parse result or error */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Resultado</p>
            {email.parse_result ? (
              <>
                <Row label="Monto"       value={formatCLP(Number(email.parse_result.amount))} ok />
                <Row label="Tipo"        value={email.parse_result.type} />
                <Row label="Descripción" value={email.parse_result.description} />
                <Row label="Fecha tx"    value={email.parse_result.date.slice(0, 19)} />
                <div className="flex items-center gap-3 py-1">
                  <span className="text-[11px] text-[var(--text-muted)] w-28 shrink-0">Confianza</span>
                  <ConfidenceBar value={email.parse_result.confidence} />
                </div>
              </>
            ) : email.parse_error ? (
              <div className="rounded-[var(--radius)] bg-[var(--red-dim)] border border-[var(--red)]/20 px-3 py-2">
                <p className="text-[11px] font-mono text-[var(--red)]">{email.parse_error}</p>
              </div>
            ) : (
              <p className="text-[12px] text-[var(--text-muted)] italic">
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
      <span className="text-[11px] text-[var(--text-muted)] w-28 shrink-0">{label}</span>
      <span className={cn("text-[11px] text-[var(--text-primary)] break-all", mono && "font-mono")}>
        {ok !== undefined && <StatusDot ok={ok} />}{" "}
        {value}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DebugPanel({ token }: { token: string | null }) {
  const [scanStatus,  setScanStatus]  = useState<Status>("idle");
  const [syncStatus,  setSyncStatus]  = useState<Status>("idle");
  const [scanData,    setScanData]    = useState<ScanResponse | null>(null);
  const [syncData,    setSyncData]    = useState<SyncResponse | null>(null);
  const [scanError,   setScanError]   = useState<string | null>(null);
  const [syncError,   setSyncError]   = useState<string | null>(null);
  const [maxEmails,   setMaxEmails]   = useState(500);

  const handleScan = async () => {
    if (!token) return;
    setScanStatus("loading");
    setScanData(null);
    setScanError(null);
    try {
      const res = await fetch(`${API_URL}/transactions/debug/gmail-scan?token=${token}&max_emails=${maxEmails}`);
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
    if (!token) return;
    setSyncStatus("loading");
    setSyncData(null);
    setSyncError(null);
    try {
      const res = await fetch(
        `${API_URL}/transactions/sync?token=${token}&max_emails=200&force_full_sync=true`,
        { method: "POST" }
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

      {/* Token status */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] px-5 py-4 flex items-center gap-3">
        <StatusDot ok={!!token} />
        <span className="text-sm text-[var(--text-primary)]">
          {token ? "Sesión activa — token encontrado" : "Sin sesión — inicia sesión primero"}
        </span>
        {token && (
          <code className="ml-auto text-[11px] font-mono text-[var(--text-muted)] truncate max-w-xs">
            {token.slice(0, 30)}…
          </code>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Scan (dry run) */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">1 · Escanear Gmail</h2>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
              Busca correos y prueba el parser. <strong>No guarda nada en la BD.</strong>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-[12px] text-[var(--text-muted)]">Máx. correos</label>
            <input
              type="number"
              min={1} max={2000}
              value={maxEmails}
              onChange={(e) => setMaxEmails(Number(e.target.value))}
              className="w-16 px-2 py-1 text-[12px] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] font-mono"
            />
          </div>
          <button
            onClick={handleScan}
            disabled={!token || scanStatus === "loading"}
            className={cn(
              "w-full py-2 px-4 rounded-[var(--radius)] text-sm font-medium transition-all",
              !token || scanStatus === "loading"
                ? "opacity-50 cursor-not-allowed bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                : "bg-[var(--blue)] text-white hover:opacity-90"
            )}
          >
            {scanStatus === "loading" ? "Escaneando…" : "Escanear"}
          </button>
        </div>

        {/* Sync (saves to DB) */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">2 · Sincronizar y guardar</h2>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
              Hace sync completo (force_full_sync). <strong>Guarda transacciones en la BD.</strong>
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={!token || syncStatus === "loading"}
            className={cn(
              "w-full py-2 px-4 rounded-[var(--radius)] text-sm font-medium transition-all mt-auto",
              !token || syncStatus === "loading"
                ? "opacity-50 cursor-not-allowed bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                : "bg-[var(--green)] text-white hover:opacity-90"
            )}
          >
            {syncStatus === "loading" ? "Sincronizando…" : "Sincronizar ahora"}
          </button>

          {/* Sync result */}
          {syncData && (
            <div className="rounded-[var(--radius)] bg-[var(--bg-elevated)] border border-[var(--border)] p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <StatusDot ok={syncData.success} />
                <span className="text-[12px] font-medium text-[var(--text-primary)]">{syncData.message}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                {Object.entries(syncData.stats).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-[11px] text-[var(--text-muted)]">{k.replace(/_/g, " ")}</span>
                    <span className="text-[11px] font-mono font-semibold text-[var(--text-primary)]">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {syncError && (
            <div className="rounded-[var(--radius)] bg-[var(--red-dim)] border border-[var(--red)]/20 px-3 py-2">
              <p className="text-[11px] font-mono text-[var(--red)]">{syncError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Scan error */}
      {scanError && (
        <div className="rounded-[var(--radius-xl)] bg-[var(--red-dim)] border border-[var(--red)]/20 px-5 py-4">
          <p className="text-sm font-semibold text-[var(--red)] mb-1">Error al escanear Gmail</p>
          <p className="text-[12px] font-mono text-[var(--red)]">{scanError}</p>
        </div>
      )}

      {/* Scan results */}
      {scanData && (
        <div className="space-y-4">
          {/* Query used */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] px-5 py-4 space-y-2">
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Query Gmail usada</p>
            <code className="text-[11px] font-mono text-[var(--blue)] break-all leading-relaxed block">
              {scanData.gmail_query}
            </code>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Emails encontrados", value: scanData.emails_found,  color: "text-[var(--text-primary)]" },
              { label: "Parseados OK",        value: parsed.length,          color: "text-[var(--green)]" },
              { label: "Error de parse",      value: errors.length,          color: "text-[var(--red)]" },
              { label: "Sin parser",          value: noParser.length,        color: "text-[var(--text-muted)]" },
            ].map((s) => (
              <div key={s.label} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] px-4 py-3 text-center">
                <p className={cn("text-2xl font-bold font-mono", s.color)}>{s.value}</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Email list */}
          {scanData.results.length === 0 ? (
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] px-5 py-16 text-center">
              <p className="text-sm font-medium text-[var(--text-primary)]">No se encontraron correos</p>
              <p className="text-[12px] text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
                La query de Gmail no devolvió resultados. Revisa que tengas correos de bancochile.cl en tu Gmail y que
                los asuntos contengan palabras como "cargo", "transferencia", "comprobante", etc.
              </p>
            </div>
          ) : (
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[32px_1fr_120px_100px_80px] gap-3 px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
                {["#", "Correo", "Fecha", "Estado", "Monto"].map((h) => (
                  <span key={h} className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    {h}
                  </span>
                ))}
              </div>

              {/* Rows */}
              {scanData.results.map((email, i) => (
                <EmailRow key={email.message_id} email={email} index={i} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
