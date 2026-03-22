"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Error al iniciar sesión");
        return;
      }

      router.push(`/auth/callback?token=${data.access_token}`);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-foreground">
      {/* Logo */}
      <div className="mb-10 text-center">
        <h1 className="text-[32px] font-bold tracking-tight lowercase">
          chauchero<span className="text-primary">.</span>
        </h1>
      </div>

      {/* Login Card */}
      <main className="w-full max-w-[420px] bg-secondary rounded-2xl py-11 px-10">
        {/* Error Message */}
        {error && (
          <div className="mb-6 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Credentials Form */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Email Field */}
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

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-0.5">
                <label
                  htmlFor="password"
                  className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground"
                >
                  Contraseña
                </label>
                <a
                  href="#"
                  className="text-[10px] font-semibold text-primary hover:underline"
                >
                  ¿Olvidaste la clave?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
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
          </div>

          {/* Primary Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:opacity-90 active:opacity-80 transition-all active:scale-[0.99] tracking-[0.01em] disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>
      </main>

      {/* Footer */}
      <footer className="mt-8 text-center space-y-12">
        <p className="text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link
            href="/registro"
            className="text-foreground font-bold hover:text-primary transition-colors ml-1"
          >
            Regístrate
          </Link>
        </p>

        <div className="opacity-60">
          <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
            © 2026 Chauchero · Términos · Privacidad
          </p>
        </div>
      </footer>
    </div>
  );
}
