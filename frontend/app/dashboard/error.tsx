"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const isAuthError =
    error.message.includes("401") ||
    error.message.toLowerCase().includes("token") ||
    error.message.toLowerCase().includes("sesión");

  // On auth errors, attempt a silent refresh before showing the error
  useEffect(() => {
    if (!isAuthError) return;

    let cancelled = false;
    setRefreshing(true);

    fetch("/api/auth/refresh-expired", { method: "POST" })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          // Token refreshed — retry the page
          reset();
        } else {
          setRefreshing(false);
        }
      })
      .catch(() => {
        if (!cancelled) setRefreshing(false);
      });

    return () => { cancelled = true; };
  }, [isAuthError, reset]);

  useEffect(() => {
    if (!isAuthError) {
      console.error("[dashboard error]", error);
    }
  }, [error, isAuthError]);

  // Show a brief loading state while attempting refresh
  if (refreshing) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <Card className="p-8 max-w-md w-full text-center space-y-4">
        <div className="mx-auto size-12 rounded-xl bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="size-6 text-destructive" />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {isAuthError ? "Sesión expirada" : "Algo salió mal"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isAuthError
              ? "Tu sesión ha expirado. Vuelve a iniciar sesión para continuar."
              : "Hubo un error al cargar esta página. Puede ser un problema temporal."}
          </p>
        </div>

        {error.message && !isAuthError && (
          <div className="rounded-md bg-muted border border-border px-3 py-2">
            <p className="text-[11px] font-mono text-muted-foreground break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-3 pt-2">
          {isAuthError ? (
            <Button onClick={() => router.push("/")} className="gap-2">
              <LogIn className="size-3.5" />
              Iniciar sesión
            </Button>
          ) : (
            <Button onClick={reset} variant="outline" className="gap-2">
              <RefreshCw className="size-3.5" />
              Reintentar
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
