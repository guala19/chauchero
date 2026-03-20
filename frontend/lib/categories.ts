import type { ApiTransaction } from "@/lib/api";

export interface CategoryInfo {
  name: string;
  icon: string;
  colorKey: string;
  dot: string;
  pillBg: string;
  pillText: string;
}

const RULES: { pattern: RegExp; info: CategoryInfo }[] = [
  { pattern: /supermercado|lider|jumbo|unimarc|santa isabel|tottus|acuenta/i, info: { name: "Supermercado", icon: "shopping_cart", colorKey: "supermercado", dot: "#B87A3D", pillBg: "#F5EDE0", pillText: "#8B5E2A" } },
  { pattern: /restaurant|restoran|starbucks|mcdonalds|burger|pizza|sushi|cafe|coffe/i, info: { name: "Restaurantes", icon: "restaurant", colorKey: "restaurantes", dot: "#B86B7A", pillBg: "#F5E8EC", pillText: "#8C4A5A" } },
  { pattern: /uber|cabify|metro|transantiago|bip!|copec|shell|enex|gasolina|estacion/i, info: { name: "Transporte", icon: "commute", colorKey: "transporte", dot: "#5B8FA8", pillBg: "#E8F0F4", pillText: "#3D6B82" } },
  { pattern: /farmacia|ahumada|cruz verde|salcobrand/i, info: { name: "Farmacia", icon: "local_pharmacy", colorKey: "farmacia", dot: "#7BA8A2", pillBg: "#E8F2F0", pillText: "#4D7A74" } },
  { pattern: /netflix|spotify|youtube|disney|hbo|amazon prime|apple/i, info: { name: "Suscripciones", icon: "subscriptions", colorKey: "suscripciones", dot: "#8B7BA8", pillBg: "#EFEBF4", pillText: "#635580" } },
  { pattern: /rappi|pedidosya|uber eats|cornershop/i, info: { name: "Delivery", icon: "delivery_dining", colorKey: "delivery", dot: "#B87A3D", pillBg: "#F5EDE0", pillText: "#8B5E2A" } },
  { pattern: /enel|aguas|engie|vtr|movistar|claro|wom|entel/i, info: { name: "Servicios", icon: "bolt", colorKey: "servicios", dot: "#9E8E86", pillBg: "#F2EDE6", pillText: "#6B5C54" } },
];

const TRANSFER_IN: CategoryInfo = { name: "Transferencias", icon: "payments", colorKey: "transferencias", dot: "#7BA88B", pillBg: "#E8F2EC", pillText: "#4D7A5D" };
const TRANSFER_OUT: CategoryInfo = { name: "Transferencias", icon: "send_money", colorKey: "transferencias", dot: "#7BA88B", pillBg: "#E8F2EC", pillText: "#4D7A5D" };
const OTROS: CategoryInfo = { name: "Otros", icon: "more_horiz", colorKey: "otros", dot: "#9E8E86", pillBg: "#F2EDE6", pillText: "#6B5C54" };

export function inferCategory(tx: ApiTransaction): CategoryInfo {
  if (tx.transaction_type === "transfer_credit") return TRANSFER_IN;
  if (tx.transaction_type === "transfer_debit") return TRANSFER_OUT;

  if (tx.category) {
    const rule = RULES.find((r) => r.info.name.toLowerCase() === tx.category!.toLowerCase());
    if (rule) return rule.info;
  }

  for (const rule of RULES) {
    if (rule.pattern.test(tx.description)) return rule.info;
  }

  return OTROS;
}
