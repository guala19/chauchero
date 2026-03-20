export const CATEGORY_COLORS = {
  supermercado:    { bar: "#B87A3D", icon: "#B87A3D" },
  restaurantes:    { bar: "#B86B7A", icon: "#B86B7A" },
  transporte:      { bar: "#5B8FA8", icon: "#5B8FA8" },
  suscripciones:   { bar: "#8B7BA8", icon: "#8B7BA8" },
  ocio:            { bar: "#A89B7B", icon: "#A89B7B" },
  salud:           { bar: "#7BA8A2", icon: "#7BA8A2" },
  transferencias:  { bar: "#7BA88B", icon: "#7BA88B" },
  otros:           { bar: "#9E8E86", icon: "#9E8E86" },
} as const;

export const budgetData = {
  totalBudget: 1200000,
  totalSpent: 847320,
  month: "Marzo",

  yappa: {
    total: 284500,
    history: [
      { month: "Marzo", amount: 42100, isCurrent: true },
      { month: "Febrero", amount: 38500, isCurrent: false },
      { month: "Enero", amount: 45000, isCurrent: false },
    ],
  },

  categories: [
    { name: "Supermercado", icon: "shopping_cart", spent: 320000, budget: 450000, colorKey: "supermercado" as const, status: "normal" as const },
    { name: "Restaurantes", icon: "restaurant", spent: 185200, budget: 150000, colorKey: "restaurantes" as const, status: "exceeded" as const },
    { name: "Transporte", icon: "directions_car", spent: 128000, budget: 140000, colorKey: "transporte" as const, status: "normal" as const },
    { name: "Suscripciones", icon: "subscriptions", spent: 42900, budget: 90000, colorKey: "suscripciones" as const, status: "normal" as const },
    { name: "Ocio", icon: "local_cafe", spent: 45000, budget: 200000, colorKey: "ocio" as const, status: "normal" as const },
    { name: "Salud", icon: "health_and_safety", spent: 28500, budget: 50000, colorKey: "salud" as const, status: "normal" as const },
    { name: "Transferencias", icon: "swap_horiz", spent: 200000, budget: 250000, colorKey: "transferencias" as const, status: "normal" as const },
    { name: "Otros", icon: "more_horiz", spent: 15400, budget: 100000, colorKey: "otros" as const, status: "normal" as const },
  ],

  projection: {
    total: 1140000,
    savings: 60000,
    monthProgress: 3,
  },

  ranking: [
    { name: "Restaurantes", percentage: 123, dotColor: "#B86B7A" },
    { name: "Transporte", percentage: 91, dotColor: "#5B8FA8" },
    { name: "Supermercado", percentage: 71, dotColor: "#B87A3D" },
    { name: "Suscripciones", percentage: 48, dotColor: "#8B7BA8" },
    { name: "Otros", percentage: 15, dotColor: "#9E8E86" },
  ],
};
