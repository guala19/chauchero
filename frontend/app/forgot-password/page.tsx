"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Error al enviar el email");
        return;
      }

      setSent(true);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-foreground">
      <div className="mb-10 text-center">
        <h1 className="text-[32px] font-bold tracking-tight lowercase">
          chauchero<span className="text-primary">.</span>
        </h1>
      </div>

      <main className="w-full max-w-[420px] bg-secondary rounded-2xl py-11 px-10">
        {sent ? (
          <div className="text-center space-y-4">
            <span className="material-symbols-outlined text-[48px] text-primary">mark_email_read</span>
            <h2 className="text-lg font-semibold">Revisa tu email</h2>
            <p className="text-sm text-muted-foreground">
              Si <strong>{email}</strong> está registrado, recibirás un link para restablecer tu contraseña.
            </p>
            <Link
              href="/login"
              className="inline-block text-sm font-semibold text-primary hover:underline mt-4"
            >
              Volver al login
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-[22px] font-semibold tracking-[-0.02em] mb-1">
                Restablecer contraseña
              </h2>
              <p className="text-muted-foreground text-[13px]">
                Ingresa tu email y te enviaremos un link para crear una nueva contraseña.
              </p>
            </div>

            {error && (
              <div className="mb-6 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground ml-0.5"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="nombre@ejemplo.cl"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 px-4 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-foreground focus:border-foreground transition-all outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:opacity-90 active:opacity-80 transition-all active:scale-[0.99] tracking-[0.01em] disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? "Enviando..." : "Enviar link de reset"}
              </button>
            </form>
          </>
        )}
      </main>

      <footer className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          <Link
            href="/login"
            className="text-foreground font-bold hover:text-primary transition-colors"
          >
            Volver al login
          </Link>
        </p>
      </footer>
    </div>
  );
}
