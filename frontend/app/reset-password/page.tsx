"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          new_password: password,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Error al restablecer la contraseña");
        return;
      }

      setSuccess(true);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <span className="material-symbols-outlined text-[48px] text-destructive">error</span>
        <h2 className="text-lg font-semibold">Link inválido</h2>
        <p className="text-sm text-muted-foreground">
          Este link no contiene un token válido. Solicita un nuevo link de reset.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block text-sm font-semibold text-primary hover:underline mt-4"
        >
          Solicitar nuevo link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <span className="material-symbols-outlined text-[48px] text-primary">check_circle</span>
        <h2 className="text-lg font-semibold">Contraseña restablecida</h2>
        <p className="text-sm text-muted-foreground">
          Tu contraseña fue cambiada exitosamente. Ya puedes iniciar sesión.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm font-semibold text-primary hover:underline mt-4"
        >
          Ir al login
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] mb-1">
          Nueva contraseña
        </h2>
        <p className="text-muted-foreground text-[13px]">
          Ingresa tu nueva contraseña.
        </p>
      </div>

      {error && (
        <div className="mb-6 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground ml-0.5">
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 8 caracteres"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-foreground focus:border-foreground transition-all outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground ml-0.5">
            Confirmar contraseña
          </label>
          <input
            type="password"
            placeholder="Repite la contraseña"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-12 px-4 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-foreground focus:border-foreground transition-all outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:opacity-90 active:opacity-80 transition-all active:scale-[0.99] tracking-[0.01em] disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? "Restableciendo..." : "Restablecer contraseña"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-foreground">
      <div className="mb-10 text-center">
        <h1 className="text-[32px] font-bold tracking-tight lowercase">
          chauchero<span className="text-primary">.</span>
        </h1>
      </div>

      <main className="w-full max-w-[420px] bg-secondary rounded-2xl py-11 px-10">
        <Suspense fallback={<div className="text-center text-muted-foreground">Cargando...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </main>
    </div>
  );
}
