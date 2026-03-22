export const MONTHLY_DATA = [
  { month: "OCT", gastos: 180_000 },
  { month: "NOV", gastos: 160_000 },
  { month: "DIC", gastos: 220_000 },
  { month: "ENE", gastos: 280_000 },
  { month: "FEB", gastos: 320_000 },
  { month: "MAR", gastos: 310_000 },
];

export const CATEGORY_DATA = [
  { name: "Otros", amount: 325_700, count: 7, percent: 38, color: "slate", icon: "category" as const },
  { name: "Supermercado", amount: 245_000, count: 5, percent: 29, color: "orange", icon: "shopping_cart" as const },
  { name: "Restaurantes", amount: 184_220, count: 4, percent: 22, color: "rose", icon: "restaurant" as const },
  { name: "Transporte", amount: 92_400, count: 8, percent: 11, color: "blue", icon: "directions_car" as const },
];

export type Transaction = {
  id: number;
  description: string;
  date: string;
  amount: number;
  dotColor: string;
};

export const RECENT_TRANSACTIONS: Transaction[] = [
  { id: 1, description: "Jumbo Bilbao", date: "14 Mar \u00b7 12:45", amount: -42_100, dotColor: "bg-orange-400" },
  { id: 2, description: "Uber *Trip", date: "13 Mar \u00b7 21:20", amount: -8_400, dotColor: "bg-blue-400" },
  { id: 3, description: "Transferencia Recibida", date: "12 Mar \u00b7 09:15", amount: 150_000, dotColor: "bg-[#3A7D5E]" },
  { id: 4, description: "Starbucks Reserve", date: "12 Mar \u00b7 08:30", amount: -4_800, dotColor: "bg-rose-400" },
  { id: 5, description: "Netflix Chile", date: "10 Mar \u00b7 02:00", amount: -10_990, dotColor: "bg-[#9E8E86]" },
  { id: 6, description: "Unimarc Los Militares", date: "09 Mar \u00b7 18:45", amount: -12_320, dotColor: "bg-orange-400" },
];

export const HERO_DATA = {
  gastoMes: 847_320,
  ingresoMes: 450_000,
  transacciones: 12,
  variacionPercent: 15.3,
};

export const BANKS = [
  { name: "Banco de Chile", code: "CHILE", connected: true, color: "#002e67" },
  { name: "Santander Chile", code: null, connected: false, color: null },
  { name: "Banco Bci", code: null, connected: false, color: null },
];

export const NAV_ITEMS = [
  { label: "Inicio", icon: "home", href: "/", active: true },
  { label: "Transacciones", icon: "receipt_long", href: "/transactions", active: false },
  { label: "Cuentas", icon: "account_balance_wallet", href: "/accounts", active: false },
  { label: "Anal\u00edticas", icon: "leaderboard", href: "/analytics", active: false },
  { label: "Configuraci\u00f3n", icon: "settings", href: "/settings", active: false },
];
