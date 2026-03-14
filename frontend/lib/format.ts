/**
 * format.ts — Chauchero formatting utilities
 * All monetary values are in CLP (Chilean Peso)
 */

/**
 * Format a number as Chilean Peso.
 * Output: "$ 1.234.567"  or  "−$ 1.234.567" for negatives
 * Chilean format uses dot as thousands separator, no decimals.
 */
export function formatCLP(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "$ 0";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "$ 0";

  const abs = Math.abs(num);
  const formatted = abs.toLocaleString("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return num < 0 ? `−$ ${formatted}` : `$ ${formatted}`;
}

/**
 * Short amount for compact displays: "$ 1.2M" / "$ 234K" / "$ 1.234"
 */
export function formatCLPCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "−" : "";

  if (abs >= 1_000_000) {
    const val = (abs / 1_000_000).toFixed(1).replace(".", ",");
    return `${sign}$ ${val}M`;
  }
  if (abs >= 1_000) {
    const val = (abs / 1_000).toFixed(0);
    return `${sign}$ ${val}K`;
  }
  return formatCLP(amount);
}

/**
 * Format a date in Chilean locale.
 * Output: "10 mar 2026"
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format a date with time.
 * Output: "10 mar 2026, 14:35"
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Human-readable relative time.
 * Output: "hace 2 horas" / "ayer" / "10 mar 2026"
 */
export function formatRelativeDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1_000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSec < 60) return "hace un momento";
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHrs < 24) return `hace ${diffHrs}h`;
  if (diffDays === 1) return "ayer";
  if (diffDays < 7) return `hace ${diffDays} días`;
  return formatDate(d);
}

/**
 * Mask a card number showing only last 4 digits.
 * Output: "•••• •••• •••• 1234"
 */
export function formatCardNumber(last4: string | null | undefined): string {
  if (!last4) return "•••• •••• •••• ????";
  return `•••• •••• •••• ${last4.replace(/\D/g, "").slice(-4)}`;
}

/**
 * Confidence score as percentage string.
 * Output: "97%"
 */
export function formatConfidence(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  return `${Math.round(score)}%`;
}

/**
 * Transaction type label in Spanish.
 */
export function formatTransactionType(
  type: "income" | "expense" | "transfer" | string
): string {
  const labels: Record<string, string> = {
    income: "Ingreso",
    expense: "Gasto",
    transfer: "Transferencia",
  };
  return labels[type] ?? type;
}
