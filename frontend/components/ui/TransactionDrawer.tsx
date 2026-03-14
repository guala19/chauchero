"use client";

import { useEffect, useRef, useState } from "react";
import {
  X, Save, Check, CreditCard, Calendar,
  Tag, ShieldCheck, Building2, StickyNote,
  TrendingUp, TrendingDown, ArrowLeftRight,
} from "lucide-react";
import { formatCLP, formatCardNumber } from "@/lib/format";
import { getConfidenceLevel } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  date: string;
  last4?: string;
  bank?: string;
  confidence?: number;
  authCode?: string;
}

interface TransactionDrawerProps {
  transaction: Transaction | null;
  note: string;
  onClose: () => void;
  onSaveNote: (id: string, note: string) => void;
}

// ─── Palette per type ─────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  income: {
    label: "Ingreso",
    Icon: TrendingUp,
    color: "#16C784",
    colorDim: "rgba(22,199,132,0.12)",
    colorMid: "rgba(22,199,132,0.06)",
    gradient: "linear-gradient(135deg, rgba(22,199,132,0.18) 0%, rgba(22,199,132,0.04) 100%)",
    border: "rgba(22,199,132,0.25)",
    sign: "+",
  },
  expense: {
    label: "Gasto",
    Icon: TrendingDown,
    color: "#EF4444",
    colorDim: "rgba(239,68,68,0.12)",
    colorMid: "rgba(239,68,68,0.06)",
    gradient: "linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(239,68,68,0.04) 100%)",
    border: "rgba(239,68,68,0.25)",
    sign: "−",
  },
  transfer: {
    label: "Transferencia",
    Icon: ArrowLeftRight,
    color: "#5B7FFF",
    colorDim: "rgba(91,127,255,0.12)",
    colorMid: "rgba(91,127,255,0.06)",
    gradient: "linear-gradient(135deg, rgba(91,127,255,0.18) 0%, rgba(91,127,255,0.04) 100%)",
    border: "rgba(91,127,255,0.25)",
    sign: "↔",
  },
} as const;

// ─── Notes Section ────────────────────────────────────────────────────────────

function NotesSection({
  txId,
  initialNote,
  onSave,
}: {
  txId: string;
  initialNote: string;
  onSave: (id: string, note: string) => void;
}) {
  const [draft, setDraft] = useState(initialNote);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(initialNote);
    setSaved(false);
  }, [txId, initialNote]);

  const handleSave = () => {
    onSave(txId, draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const isDirty = draft !== initialNote;

  return (
    <div>
      {/* Label */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <StickyNote size={13} style={{ color: "var(--text-muted)" }} />
        <span style={{
          fontSize: 10,
          textTransform: "uppercase" as const,
          letterSpacing: "0.12em",
          fontWeight: 600,
          color: "var(--text-muted)",
        }}>
          Nota personal
        </span>
      </div>

      {/* Textarea */}
      <div style={{
        borderRadius: 12,
        border: "1px solid var(--border)",
        backgroundColor: "var(--bg-base)",
        overflow: "hidden",
      }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              handleSave();
            }
          }}
          placeholder="Escribe un comentario para esta transacción…"
          rows={4}
          style={{
            width: "100%",
            padding: "12px 14px",
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--text-primary)",
            backgroundColor: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
          }}
        />
        {/* Footer bar inside textarea box */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderTop: "1px solid var(--border)",
          backgroundColor: "var(--bg-elevated)",
        }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
            ⌘↵ para guardar
          </span>
          <button
            onClick={handleSave}
            disabled={!isDirty && !saved}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              height: 28,
              padding: "0 12px",
              borderRadius: 8,
              border: "none",
              cursor: isDirty ? "pointer" : "not-allowed",
              fontSize: 12,
              fontWeight: 500,
              transition: "all 200ms ease",
              backgroundColor: saved
                ? "rgba(22,199,132,0.15)"
                : isDirty
                ? "#5B7FFF"
                : "transparent",
              color: saved
                ? "#16C784"
                : isDirty
                ? "white"
                : "var(--text-muted)",
              opacity: !isDirty && !saved ? 0.5 : 1,
            }}
          >
            {saved
              ? <><Check size={12} /> Guardado</>
              : <><Save size={12} /> Guardar</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Chip ──────────────────────────────────────────────────────────────

function DetailChip({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 14px",
      borderRadius: 10,
      backgroundColor: "var(--bg-elevated)",
      border: "1px solid var(--border)",
    }}>
      <div style={{
        width: 28,
        height: 28,
        borderRadius: 7,
        backgroundColor: "var(--bg-overlay)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={13} style={{ color: "var(--text-secondary)" }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2, letterSpacing: "0.06em" }}>
          {label}
        </p>
        <p style={{
          fontSize: 13,
          fontWeight: 500,
          color: "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap" as const,
          fontFamily: mono ? "var(--font-geist-mono), monospace" : "inherit",
        }}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

export default function TransactionDrawer({
  transaction,
  note,
  onClose,
  onSaveNote,
}: TransactionDrawerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (transaction) {
      setMounted(true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setOpen(true))
      );
    } else {
      setOpen(false);
      timerRef.current = setTimeout(() => setMounted(false), 350);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [transaction]);

  useEffect(() => {
    if (!mounted) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mounted, onClose]);

  useEffect(() => {
    document.body.style.overflow = mounted ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mounted]);

  if (!mounted || !transaction) return null;

  const cfg = TYPE_CONFIG[transaction.type];
  const { Icon } = cfg;
  const isPositive = transaction.amount > 0;
  const confidence = transaction.confidence ?? 95;
  const confLevel = getConfidenceLevel(confidence);
  const confColor = confidence >= 80 ? "#16C784" : confidence >= 50 ? "#F0A500" : "#EF4444";

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          transition: "opacity 350ms ease",
          opacity: open ? 1 : 0,
        }}
      />

      {/* ── Panel ── */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 51,
          width: "min(460px, 100vw)",
          display: "flex",
          flexDirection: "column",
          // Lighter surface — clearly distinct from the dark base
          backgroundColor: "#1A1C27",
          borderLeft: `1px solid ${cfg.border}`,
          boxShadow: `-24px 0 64px rgba(0,0,0,0.5), -1px 0 0 rgba(255,255,255,0.04)`,
          transition: "transform 350ms cubic-bezier(0.32,0,0.15,1)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          overflow: "hidden",
        }}
      >

        {/* ── TOP: gradient hero ── */}
        <div style={{
          flexShrink: 0,
          background: cfg.gradient,
          borderBottom: `1px solid ${cfg.border}`,
          padding: "28px 24px 24px",
          position: "relative",
          overflow: "hidden",
        }}>

          {/* Decorative blurred orb */}
          <div style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: "50%",
            backgroundColor: cfg.color,
            opacity: 0.08,
            filter: "blur(40px)",
            pointerEvents: "none",
          }} />

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              backgroundColor: "rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "rgba(255,255,255,0.5)",
              transition: "all 150ms ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.12)";
              e.currentTarget.style.color = "rgba(255,255,255,0.9)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
              e.currentTarget.style.color = "rgba(255,255,255,0.5)";
            }}
          >
            <X size={15} />
          </button>

          {/* Type pill */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 20,
            backgroundColor: cfg.colorDim,
            border: `1px solid ${cfg.border}`,
            marginBottom: 16,
          }}>
            <Icon size={12} style={{ color: cfg.color }} />
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: cfg.color,
              letterSpacing: "0.04em",
            }}>
              {cfg.label}
            </span>
          </div>

          {/* Description */}
          <p style={{
            fontSize: 15,
            fontWeight: 600,
            color: "rgba(255,255,255,0.9)",
            marginBottom: 4,
            lineHeight: 1.3,
          }}>
            {transaction.description}
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 20 }}>
            {transaction.date}
            {transaction.bank && ` · ${transaction.bank}`}
          </p>

          {/* Amount — big */}
          <div>
            <p style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              marginBottom: 4,
            }}>
              Monto
            </p>
            <p style={{
              fontSize: 42,
              fontWeight: 700,
              lineHeight: 1,
              color: cfg.color,
              fontFamily: "var(--font-geist-mono), monospace",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
            }}>
              {isPositive ? "+" : "−"}{formatCLP(Math.abs(transaction.amount))}
            </p>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}>

          {/* ── Details grid ── */}
          <div>
            <p style={{
              fontSize: 10,
              textTransform: "uppercase" as const,
              letterSpacing: "0.12em",
              fontWeight: 600,
              color: "var(--text-muted)",
              marginBottom: 10,
            }}>
              Detalles
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <DetailChip icon={Calendar} label="Fecha" value={transaction.date} />
              <DetailChip icon={Tag}      label="Tipo"  value={cfg.label} />
              {transaction.last4 && (
                <DetailChip
                  icon={CreditCard}
                  label="Tarjeta"
                  value={formatCardNumber(transaction.last4)}
                  mono
                />
              )}
              {transaction.bank && (
                <DetailChip icon={Building2} label="Banco" value={transaction.bank} />
              )}
              {transaction.authCode && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <DetailChip
                    icon={ShieldCheck}
                    label="Cód. autorización"
                    value={transaction.authCode}
                    mono
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Confidence ── */}
          <div style={{
            padding: "16px",
            borderRadius: 12,
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}>
              <div>
                <p style={{
                  fontSize: 10,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.12em",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: 2,
                }}>
                  Confianza del parser
                </p>
                <p style={{ fontSize: 12, color: confColor }}>
                  {confLevel.label}
                </p>
              </div>
              <span style={{
                fontSize: 28,
                fontWeight: 700,
                fontFamily: "var(--font-geist-mono), monospace",
                color: confColor,
                lineHeight: 1,
              }}>
                {confidence}%
              </span>
            </div>

            {/* Track */}
            <div style={{
              position: "relative",
              height: 6,
              borderRadius: 3,
              backgroundColor: "var(--bg-overlay)",
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute",
                inset: 0,
                borderRadius: 3,
                backgroundColor: confColor,
                transformOrigin: "left center",
                transition: "transform 900ms cubic-bezier(0.34,1.56,0.64,1) 200ms",
                transform: open ? `scaleX(${confidence / 100})` : "scaleX(0)",
              }} />
            </div>

            {/* Tick marks */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 6,
            }}>
              {["0", "25", "50", "75", "100"].map((v) => (
                <span key={v} style={{
                  fontSize: 9,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}>
                  {v}
                </span>
              ))}
            </div>
          </div>

          {/* ── Notes ── */}
          <NotesSection
            txId={transaction.id}
            initialNote={note}
            onSave={onSaveNote}
          />
        </div>
      </div>
    </>
  );
}
