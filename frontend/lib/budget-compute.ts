import type { ApiTransaction } from "./api";
import type { BudgetPreferences } from "./budget-data";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "./budget-data";
import { inferCategory } from "./categories";

export interface CategorySpend {
  name: string;
  icon: string;
  spent: number;
  budget: number;
  percentage: number;
  status: "normal" | "exceeded";
  barColor: string;
  iconColor: string;
  colorKey: string;
}

export interface RankingItem {
  name: string;
  percentage: number;
  dotColor: string;
}

export interface YappaMonth {
  month: string;
  amount: number;
  isCurrent: boolean;
}

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalIncome: number;
  percentage: number;
  available: number;
  categories: CategorySpend[];
  ranking: RankingItem[];
  projection: { total: number; savings: number; weekProgress: number };
  yappa: { total: number; history: YappaMonth[] };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getMonthLabel(month: number): string {
  const labels = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return labels[month] ?? "";
}

function filterMonth(txs: ApiTransaction[], year: number, month: number): ApiTransaction[] {
  return txs.filter((tx) => {
    const d = new Date(tx.transaction_date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

function sumOutflows(txs: ApiTransaction[]): number {
  return txs
    .filter((tx) => tx.transaction_type !== "transfer_credit")
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
}

function sumInflows(txs: ApiTransaction[]): number {
  return txs
    .filter((tx) => tx.transaction_type === "transfer_credit")
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
}

export function computeBudgetSummary(
  transactions: ApiTransaction[],
  prefs: BudgetPreferences,
  year: number,
  month: number,
): BudgetSummary {
  const monthTxs = filterMonth(transactions, year, month);
  const outflows = monthTxs.filter((tx) => tx.transaction_type !== "transfer_credit");
  const totalSpent = sumOutflows(monthTxs);
  const totalIncome = sumInflows(monthTxs);

  // Group outflows by inferred category
  const groups: Record<string, number> = {};
  for (const tx of outflows) {
    const cat = inferCategory(tx);
    groups[cat.name] = (groups[cat.name] ?? 0) + Number(tx.amount);
  }

  // Build category spend list
  const categories: CategorySpend[] = prefs.categories.map((budgetCat) => {
    const spent = groups[budgetCat.name] ?? 0;
    const percentage = budgetCat.budget > 0 ? Math.round((spent / budgetCat.budget) * 100) : 0;
    const colorKey = budgetCat.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const colors = CATEGORY_COLORS[colorKey] ?? CATEGORY_COLORS.otros;
    const icon = CATEGORY_ICONS[colorKey] ?? "more_horiz";

    return {
      name: budgetCat.name,
      icon,
      spent,
      budget: budgetCat.budget,
      percentage,
      status: spent >= budgetCat.budget ? "exceeded" : "normal",
      barColor: colors.bar,
      iconColor: colors.icon,
      colorKey,
    };
  });

  // Ranking: top 5 sorted by percentage descending
  const ranking: RankingItem[] = [...categories]
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5)
    .map((c) => ({
      name: c.name,
      percentage: c.percentage,
      dotColor: c.percentage > 100 ? "#C4522A" : c.barColor,
    }));

  // Projection (only meaningful for current month)
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
  const totalDays = daysInMonth(year, month);
  const elapsed = isCurrentMonth ? Math.max(now.getDate(), 1) : totalDays;
  const projectedTotal = totalSpent > 0 ? Math.round((totalSpent / elapsed) * totalDays) : 0;
  const projectedSavings = Math.max(prefs.monthlyTotal - projectedTotal, 0);
  const weekProgress = isCurrentMonth ? Math.min(Math.ceil(now.getDate() / 7), 4) : 4;

  // Yappa: last 3 months savings
  const yappaHistory: YappaMonth[] = [];
  let yappaTotal = 0;
  for (let i = 0; i < 3; i++) {
    const ym = month - i;
    const yy = ym < 0 ? year - 1 : year;
    const mm = ((ym % 12) + 12) % 12;
    const mtxs = filterMonth(transactions, yy, mm);
    const spent = sumOutflows(mtxs);
    if (spent === 0 && i > 0) continue; // skip months with no data
    const saved = Math.max(prefs.monthlyTotal - spent, 0);
    yappaTotal += saved;
    yappaHistory.push({
      month: getMonthLabel(mm),
      amount: saved,
      isCurrent: i === 0,
    });
  }

  return {
    totalBudget: prefs.monthlyTotal,
    totalSpent,
    totalIncome,
    percentage: prefs.monthlyTotal > 0 ? Math.round((totalSpent / prefs.monthlyTotal) * 100) : 0,
    available: Math.max(prefs.monthlyTotal - totalSpent, 0),
    categories,
    ranking,
    projection: { total: projectedTotal, savings: projectedSavings, weekProgress },
    yappa: { total: yappaTotal, history: yappaHistory },
  };
}
