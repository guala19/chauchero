export function formatCLP(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("es-CL", { maximumFractionDigits: 0 });
  return `${amount < 0 ? "-" : ""}$ ${formatted}`;
}

export function formatCLPCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$ ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$ ${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$ ${abs.toLocaleString("es-CL")}`;
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
