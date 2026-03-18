"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard error]", error);
  }, [error]);

  const isAuthError =
    error.message.includes("401") ||
    error.message.toLowerCase().includes("token") ||
    error.message.toLowerCase().includes("sesión");

  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] p-8 max-w-md w-full text-center space-y-4">
        <div className="mx-auto size-12 rounded-xl bg-[var(--red-dim)] flex items-center justify-center">
          <AlertCircle className="size-6 text-[var(--red)]" />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {isAuthError ? "Sesión expirada" : "Algo salió mal"}
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {isAuthError
              ? "Tu sesión ha expirado. Vuelve a iniciar sesión para continuar."
              : "Hubo un error al cargar esta página. Puede ser un problema temporal."}
          </p>
        </div>

        {error.message && !isAuthError && (
          <div className="rounded-[var(--radius)] bg-[var(--bg-elevated)] border border-[var(--border)] px-3 py-2">
            <p className="text-[11px] font-mono text-[var(--text-muted)] break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-3 pt-2">
          {isAuthError ? (
            <a
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius)] bg-[var(--blue)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Iniciar sesión
            </a>
          ) : (
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius)] bg-[var(--blue)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="size-3.5" />
              Reintentar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
