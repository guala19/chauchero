"use client";

import { useState } from "react";
import { X, AlertTriangle, RefreshCw, Target } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertType = "warning" | "recurring" | "goal";

interface Alert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
}

// ─── Mock alerts — replace with API ───────────────────────────────────────────

const INITIAL_ALERTS: Alert[] = [
  {
    id: "1",
    type: "warning",
    title: "Límite de categoría al 85%",
    description: "Alimentación: $ 85.000 de $ 100.000 del presupuesto mensual.",
  },
  {
    id: "2",
    type: "recurring",
    title: "Pago recurrente próximo",
    description: "Netflix · $ 9.900 programado para el 15 de marzo.",
  },
  {
    id: "3",
    type: "goal",
    title: "Meta de ahorro alcanzada",
    description: "Completaste tu meta de ahorro de febrero. ¡Buen trabajo!",
  },
];

// ─── Styles per alert type ────────────────────────────────────────────────────

const ALERT_STYLES: Record<AlertType, { icon: React.ElementType; border: string; iconBg: string; iconColor: string }> = {
  warning: {
    icon:      AlertTriangle,
    border:    "border-[var(--amber)]/30",
    iconBg:    "bg-[var(--amber-dim)]",
    iconColor: "text-[var(--amber)]",
  },
  recurring: {
    icon:      RefreshCw,
    border:    "border-[var(--blue)]/30",
    iconBg:    "bg-[var(--blue-dim)]",
    iconColor: "text-[var(--blue)]",
  },
  goal: {
    icon:      Target,
    border:    "border-[var(--green)]/30",
    iconBg:    "bg-[var(--green-dim)]",
    iconColor: "text-[var(--green)]",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AlertsSection() {
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);

  const dismiss = (id: string) =>
    setAlerts((prev) => prev.filter((a) => a.id !== id));

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Section label */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Alertas
        </h2>
        {alerts.length > 0 && (
          <button
            onClick={() => setAlerts([])}
            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150"
          >
            Descartar todas
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {alerts.map((alert) => {
          const { icon: Icon, border, iconBg, iconColor } = ALERT_STYLES[alert.type];
          return (
            <div
              key={alert.id}
              className={cn(
                "relative flex items-start gap-3 p-4",
                "bg-[var(--bg-surface)] border rounded-[var(--radius-xl)]",
                "animate-fade-in",
                border
              )}
            >
              {/* Icon */}
              <div className={cn("size-8 rounded-[var(--radius)] flex items-center justify-center shrink-0", iconBg)}>
                <Icon className={cn("size-4", iconColor)} />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-[12px] font-semibold text-[var(--text-primary)] leading-snug">
                  {alert.title}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">
                  {alert.description}
                </p>
              </div>

              {/* Dismiss */}
              <button
                onClick={() => dismiss(alert.id)}
                className={cn(
                  "absolute top-3 right-3",
                  "size-5 rounded-full flex items-center justify-center",
                  "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                  "hover:bg-[var(--bg-elevated)] transition-all duration-150"
                )}
                aria-label="Descartar alerta"
              >
                <X className="size-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
