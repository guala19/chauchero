import Link from "next/link";
import { Construction, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UnderConstructionProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export default function UnderConstruction({
  title,
  description,
  backHref = "/dashboard",
  backLabel = "Volver al dashboard",
}: UnderConstructionProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-2xl bg-ch-amber opacity-10 blur-xl scale-150" />
        <div className="relative size-16 rounded-2xl bg-ch-amber-dim border border-ch-amber/20 flex items-center justify-center">
          <Construction className="size-8 text-ch-amber" strokeWidth={1.5} />
        </div>
      </div>

      <h2 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
        {description ?? "Esta sección está en construcción. Vuelve pronto."}
      </p>

      <Badge variant="outline" className="mt-5 gap-2 bg-ch-amber-dim border-ch-amber/20 text-ch-amber">
        <span className="size-1.5 rounded-full bg-ch-amber animate-pulse" />
        En desarrollo
      </Badge>

      <Link
        href={backHref}
        className="mt-8 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
      >
        <ArrowLeft className="size-3.5" />
        {backLabel}
      </Link>
    </div>
  );
}
