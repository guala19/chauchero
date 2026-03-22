"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Link de verificación inválido.");
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: "POST",
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(data.message);
        } else {
          setStatus("error");
          setMessage(data.detail || "Error al verificar el email");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("No se pudo conectar con el servidor");
      });
  }, [token]);

  return (
    <div className="text-center space-y-4">
      {status === "loading" && (
        <>
          <div className="size-12 border-4 border-border border-t-primary rounded-full animate-spin-slow mx-auto" />
          <h2 className="text-lg font-semibold">Verificando email...</h2>
        </>
      )}

      {status === "success" && (
        <>
          <span className="material-symbols-outlined text-[48px] text-primary">verified</span>
          <h2 className="text-lg font-semibold">Email verificado</h2>
          <p className="text-sm text-muted-foreground">{message}</p>
          <Link
            href="/dashboard"
            className="inline-block text-sm font-semibold text-primary hover:underline mt-4"
          >
            Ir al dashboard
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <span className="material-symbols-outlined text-[48px] text-destructive">error</span>
          <h2 className="text-lg font-semibold">Error de verificación</h2>
          <p className="text-sm text-muted-foreground">{message}</p>
          <Link
            href="/login"
            className="inline-block text-sm font-semibold text-primary hover:underline mt-4"
          >
            Volver al login
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-foreground">
      <div className="mb-10 text-center">
        <h1 className="text-[32px] font-bold tracking-tight lowercase">
          chauchero<span className="text-primary">.</span>
        </h1>
      </div>

      <main className="w-full max-w-[420px] bg-secondary rounded-2xl py-11 px-10">
        <Suspense fallback={<div className="text-center text-muted-foreground">Cargando...</div>}>
          <VerifyEmailContent />
        </Suspense>
      </main>
    </div>
  );
}
