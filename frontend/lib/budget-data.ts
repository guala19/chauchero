export interface BudgetPreferences {
  monthlyTotal: number;
  categories: { name: string; budget: number }[];
}

export const DEFAULT_BUDGETS: BudgetPreferences = {
  monthlyTotal: 800000,
  categories: [
    { name: "Supermercado", budget: 250000 },
    { name: "Restaurantes", budget: 100000 },
    { name: "Transporte", budget: 80000 },
    { name: "Suscripciones", budget: 50000 },
    { name: "Farmacia", budget: 30000 },
    { name: "Delivery", budget: 40000 },
    { name: "Transferencias", budget: 200000 },
    { name: "Otros", budget: 50000 },
  ],
};

export const CATEGORY_COLORS: Record<string, { bar: string; icon: string }> = {
  supermercado:   { bar: "#B87A3D", icon: "#B87A3D" },
  restaurantes:   { bar: "#B86B7A", icon: "#B86B7A" },
  transporte:     { bar: "#5B8FA8", icon: "#5B8FA8" },
  suscripciones:  { bar: "#8B7BA8", icon: "#8B7BA8" },
  ocio:           { bar: "#A89B7B", icon: "#A89B7B" },
  salud:          { bar: "#7BA8A2", icon: "#7BA8A2" },
  farmacia:       { bar: "#7BA8A2", icon: "#7BA8A2" },
  delivery:       { bar: "#B87A3D", icon: "#B87A3D" },
  servicios:      { bar: "#9E8E86", icon: "#9E8E86" },
  transferencias: { bar: "#7BA88B", icon: "#7BA88B" },
  otros:          { bar: "#9E8E86", icon: "#9E8E86" },
};

export const CATEGORY_ICONS: Record<string, string> = {
  supermercado: "shopping_cart",
  restaurantes: "restaurant",
  transporte: "directions_car",
  farmacia: "local_pharmacy",
  suscripciones: "subscriptions",
  delivery: "delivery_dining",
  servicios: "bolt",
  transferencias: "swap_horiz",
  otros: "more_horiz",
};
