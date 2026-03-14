import type { Metadata } from "next";
import UnderConstruction from "@/components/ui/UnderConstruction";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <UnderConstruction
      title="Analytics"
      description="Visualiza tus patrones de gasto, categorías más usadas y evolución mensual de tu presupuesto."
    />
  );
}
