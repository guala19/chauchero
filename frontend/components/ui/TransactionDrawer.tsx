"use client";

import { useEffect, useRef, useState } from "react";
import {
  X, Save, Check, CreditCard, Calendar,
  Tag, ShieldCheck, Building2, StickyNote,
  TrendingUp, TrendingDown, ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCLP, formatCardNumber } from "@/lib/format";
import { getConfidenceLevel } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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
    color: "var(--ch-green)",
    colorDim: "var(--ch-green-dim)",
    gradient: "linear-gradient(135deg, var(--ch-green-dim) 0%, transparent 100%)",
    border: "var(--ch-green)",
    sign: "+",
  },
  expense: {
    label: "Gasto",
    Icon: TrendingDown,
    color: "var(--ch-red)",
    colorDim: "var(--ch-red-dim)",
    gradient: "linear-gradient(135deg, var(--ch-red-dim) 0%, transparent 100%)",
    border: "var(--ch-red)",
    sign: "−",
  },
  transfer: {
    label: "Transferencia",
    Icon: ArrowLeftRight,
    color: "var(--ch-blue)",
    colorDim: "var(--ch-blue-dim)",
    gradient: "linear-gradient(135deg, var(--ch-blue-dim) 0%, transparent 100%)",
    border: "var(--ch-blue)",
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
      <div className="flex items-center gap-2 mb-2.5">
        <StickyNote className="size-3.5 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Nota personal
        </span>
      </div>

      <Card className="overflow-hidden">
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
          className="w-full p-3 text-[13px] leading-relaxed text-foreground bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/50">
          <span className="text-[10px] text-muted-foreground">⌘↵ para guardar</span>
          <Button
            size="sm"
            variant={saved ? "outline" : isDirty ? "default" : "ghost"}
            onClick={handleSave}
            disabled={!isDirty && !saved}
            className={cn(
              "h-7 text-xs gap-1.5",
              saved && "border-ch-green/30 bg-ch-green-dim text-ch-green hover:bg-ch-green-dim"
            )}
          >
            {saved ? <><Check className="size-3" /> Guardado</> : <><Save className="size-3" /> Guardar</>}
          </Button>
        </div>
      </Card>
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
    <div className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/50 border border-border">
      <div className="size-7 rounded-md bg-muted flex items-center justify-center shrink-0">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground tracking-wide mb-0.5">{label}</p>
        <p className={cn(
          "text-[13px] font-medium text-foreground truncate",
          mono && "font-mono"
        )}>
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
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

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
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCloseRef.current(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mounted]);

  useEffect(() => {
    document.body.style.overflow = mounted ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mounted]);

  if (!mounted || !transaction) return null;

  const cfg = TYPE_CONFIG[transaction.type];
  const { Icon } = cfg;
  const isPositive = transaction.amount > 0;
  const confidence = transaction.confidence ?? 0;
  const confLevel = getConfidenceLevel(confidence);
  const confColor = confidence >= 80 ? "var(--ch-green)" : confidence >= 50 ? "var(--ch-amber)" : "var(--ch-red)";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-350"
        style={{ opacity: open ? 1 : 0 }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed top-0 right-0 bottom-0 z-[51] w-[min(460px,100vw)] flex flex-col bg-card border-l border-border shadow-2xl"
        style={{
          transition: "transform 350ms cubic-bezier(0.32,0,0.15,1)",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* TOP: gradient hero */}
        <div
          className="shrink-0 border-b border-border p-6 pt-7 relative overflow-hidden"
          style={{ background: cfg.gradient }}
        >
          {/* Decorative orb */}
          <div
            className="absolute -top-10 -right-10 size-40 rounded-full opacity-10 blur-[40px] pointer-events-none"
            style={{ backgroundColor: cfg.color }}
          />

          {/* Close button */}
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 size-8 bg-background/50"
          >
            <X className="size-4" />
          </Button>

          {/* Type pill */}
          <Badge
            variant="secondary"
            className="mb-4 gap-1.5"
            style={{ backgroundColor: cfg.colorDim, color: cfg.color }}
          >
            <Icon className="size-3" />
            {cfg.label}
          </Badge>

          {/* Description */}
          <p className="text-[15px] font-semibold text-foreground mb-1 leading-snug pr-10">
            {transaction.description}
          </p>
          <p className="text-[12px] text-muted-foreground mb-5">
            {transaction.date}
            {transaction.bank && ` · ${transaction.bank}`}
          </p>

          {/* Amount */}
          <div>
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase mb-1">Monto</p>
            <p
              className="text-[42px] font-bold leading-none font-mono tabular-nums tracking-tight"
              style={{ color: cfg.color }}
            >
              {isPositive ? "+" : "−"}{formatCLP(Math.abs(transaction.amount))}
            </p>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Details grid */}
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2.5">
              Detalles
            </p>
            <div className="grid grid-cols-2 gap-2">
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
                <div className="col-span-2">
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

          {/* Confidence */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5">
                  Confianza del parser
                </p>
                <p className="text-[12px]" style={{ color: confColor }}>
                  {confLevel.label}
                </p>
              </div>
              <span
                className="text-[28px] font-bold font-mono leading-none"
                style={{ color: confColor }}
              >
                {confidence}%
              </span>
            </div>

            {/* Track */}
            <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  backgroundColor: confColor,
                  transformOrigin: "left center",
                  transition: "transform 900ms cubic-bezier(0.34,1.56,0.64,1) 200ms",
                  transform: open ? `scaleX(${confidence / 100})` : "scaleX(0)",
                }}
              />
            </div>

            <div className="flex justify-between mt-1.5">
              {["0", "25", "50", "75", "100"].map((v) => (
                <span key={v} className="text-[9px] text-muted-foreground font-mono">
                  {v}
                </span>
              ))}
            </div>
          </Card>

          {/* Notes */}
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
