import type { Metadata } from "next";
import UnderConstruction from "@/components/ui/UnderConstruction";

export const metadata: Metadata = { title: "Configuración" };

export default function SettingsPage() {
  return (
    <UnderConstruction
      title="Configuración"
      description="Personaliza tu cuenta, gestiona permisos de Gmail, notificaciones y preferencias de sincronización."
    />
  );
}
