import type { BudgetPreferences } from "./budget-data";

const COOKIE_NAME = "ch-budgets";
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function readBudgets(): BudgetPreferences | null {
  try {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${COOKIE_NAME}=`));
    if (!match) return null;
    return JSON.parse(decodeURIComponent(match.split("=")[1]));
  } catch {
    return null;
  }
}

export function writeBudgets(prefs: BudgetPreferences): void {
  const encoded = encodeURIComponent(JSON.stringify(prefs));
  document.cookie = `${COOKIE_NAME}=${encoded}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}
