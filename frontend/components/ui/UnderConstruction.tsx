import Link from "next/link";
import { Construction, ArrowLeft } from "lucide-react";

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
      {/* Icon */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-2xl bg-[var(--amber)] opacity-10 blur-xl scale-150" />
        <div className="relative size-16 rounded-2xl bg-[var(--amber-dim)] border border-[var(--amber)]/20 flex items-center justify-center">
          <Construction className="size-8 text-[var(--amber)]" strokeWidth={1.5} />
        </div>
      </div>

      {/* Text */}
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
        {title}
      </h2>
      <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed">
        {description ?? "Esta sección está en construcción. Vuelve pronto."}
      </p>

      {/* Status pill */}
      <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--amber-dim)] border border-[var(--amber)]/20">
        <span className="size-1.5 rounded-full bg-[var(--amber)] animate-pulse" />
        <span className="text-[11px] font-medium text-[var(--amber)]">En desarrollo</span>
      </div>

      {/* Back link */}
      <Link
        href={backHref}
        className="mt-8 inline-flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150"
      >
        <ArrowLeft className="size-3.5" />
        {backLabel}
      </Link>
    </div>
  );
}
