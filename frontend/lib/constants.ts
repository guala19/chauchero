import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  TrendingUp,
  Settings,
  Bug,
  type LucideIcon,
} from "lucide-react";

// ─── Navigation ──────────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Transacciones",
    href: "/dashboard/transactions",
    icon: ArrowLeftRight,
  },
  {
    label: "Cuentas",
    href: "/dashboard/accounts",
    icon: CreditCard,
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: TrendingUp,
  },
  {
    label: "Configuración",
    href: "/dashboard/settings",
    icon: Settings,
  },
  {
    label: "Debug",
    href: "/dashboard/debug",
    icon: Bug,
  },
] as const;

// ─── Transaction Types ────────────────────────────────────────────────────────

export type TransactionType = "income" | "expense" | "transfer";

export const TRANSACTION_STYLES: Record<
  TransactionType,
  { text: string; bg: string; border: string; hex: string }
> = {
  income: {
    text: "text-ch-green",
    bg: "bg-ch-green-dim",
    border: "border-ch-green/20",
    hex: "#22C55E",
  },
  expense: {
    text: "text-ch-red",
    bg: "bg-ch-red-dim",
    border: "border-ch-red/20",
    hex: "#EF4444",
  },
  transfer: {
    text: "text-ch-blue",
    bg: "bg-ch-blue-dim",
    border: "border-ch-blue/20",
    hex: "#818CF8",
  },
};

// ─── Confidence Levels ────────────────────────────────────────────────────────

export interface ConfidenceLevel {
  label: string;
  text: string;
  bg: string;
}

export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 80) return { label: "Alta", text: "text-ch-green", bg: "bg-ch-green-dim" };
  if (score >= 50) return { label: "Media", text: "text-ch-amber", bg: "bg-ch-amber-dim" };
  return { label: "Baja", text: "text-ch-red", bg: "bg-ch-red-dim" };
}

// ─── Banks ───────────────────────────────────────────────────────────────────

export interface Bank {
  id: string;
  name: string;
  color: string;
  logoInitials: string;
}

export const SUPPORTED_BANKS: Bank[] = [
  { id: "banco_chile", name: "Banco de Chile", color: "#E31837", logoInitials: "BC" },
  { id: "santander",   name: "Santander",      color: "#EC0000", logoInitials: "SN" },
  { id: "bci",         name: "BCI",            color: "#003087", logoInitials: "BCI" },
  { id: "scotiabank",  name: "Scotiabank",     color: "#EC111A", logoInitials: "SB" },
  { id: "itau",        name: "Itaú",           color: "#F08C00", logoInitials: "IT" },
  { id: "bice",        name: "Bice",           color: "#004B87", logoInitials: "BI" },
];

// ─── App Config ───────────────────────────────────────────────────────────────

export const APP = {
  name: "Chauchero",
  tagline: "Tu dinero, claro.",
  defaultSyncLimit: 50,
  syncLimitOptions: [10, 50, 100, 200] as const,
} as const;

// ─── Color Palette Reference ──────────────────────────────────────────────────

export const COLORS = {
  green: "#22C55E",
  red:   "#EF4444",
  blue:  "#818CF8",
  amber: "#F0A500",
} as const;
