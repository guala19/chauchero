export const MONTHLY_DATA = [
  { month: "Oct", gastos: 892_000, ingresos: 1_800_000 },
  { month: "Nov", gastos: 1_045_000, ingresos: 1_800_000 },
  { month: "Dic", gastos: 1_320_000, ingresos: 2_100_000 },
  { month: "Ene", gastos: 980_000, ingresos: 1_800_000 },
  { month: "Feb", gastos: 1_150_000, ingresos: 1_850_000 },
  { month: "Mar", gastos: 760_000, ingresos: 1_800_000 },
];

export const CATEGORY_DATA = [
  { name: "Alimentación", amount: 285_000, color: "#6C5CE7" },
  { name: "Transporte", amount: 142_000, color: "#3B82F6" },
  { name: "Entretenimiento", amount: 98_000, color: "#00B67A" },
  { name: "Servicios", amount: 135_000, color: "#F5A623" },
  { name: "Otros", amount: 100_000, color: "#E5484D" },
];

export const RECENT_TRANSACTIONS = [
  { id: 1, description: "Uber Eats", category: "Alimentación", amount: -12_500, date: "Hoy, 14:35", type: "debit" as const },
  { id: 2, description: "Transferencia recibida", category: "Ingreso", amount: 450_000, date: "Hoy, 10:20", type: "credit" as const },
  { id: 3, description: "Spotify Premium", category: "Entretenimiento", amount: -5_490, date: "Ayer, 08:00", type: "debit" as const },
  { id: 4, description: "Supermercado Líder", category: "Alimentación", amount: -34_890, date: "Ayer, 19:12", type: "debit" as const },
  { id: 5, description: "Metro de Santiago", category: "Transporte", amount: -790, date: "12 mar, 07:45", type: "debit" as const },
  { id: 6, description: "Netflix", category: "Entretenimiento", amount: -6_990, date: "11 mar, 08:00", type: "debit" as const },
  { id: 7, description: "Farmacia Ahumada", category: "Otros", amount: -8_200, date: "10 mar, 16:30", type: "debit" as const },
];

export const KPI_DATA = {
  gastoMes: 760_000,
  gastoMesAnterior: 1_150_000,
  ingresoMes: 1_800_000,
  ingresoMesAnterior: 1_850_000,
  balance: 1_040_000,
  balanceAnterior: 700_000,
  transacciones: 47,
  transaccionesAnterior: 62,
};
