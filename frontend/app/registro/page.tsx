"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

function getPasswordStrength(password: string) {
  if (!password) return { level: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: "Débil", color: "bg-destructive" };
  if (score === 2) return { level: 2, label: "Débil", color: "bg-destructive" };
  if (score === 3) return { level: 3, label: "Media", color: "bg-[#C27A1E]" };
  return { level: 4, label: "Fuerte", color: "bg-ch-green" };
}

function getLabelColor(level: number) {
  if (level <= 2) return "text-destructive";
  if (level === 3) return "text-[#C27A1E]";
  return "text-ch-green";
}

export default function RegistroPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 md:p-12 text-foreground">
      {/* Logo */}
      <header className="mb-10 text-center">
        <h1 className="text-[32px] font-bold tracking-tight lowercase">
          chauchero<span className="text-primary">.</span>
        </h1>
      </header>

      {/* Registration Card */}
      <main className="w-full max-w-[420px] bg-secondary rounded-2xl py-11 px-10">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-[22px] font-semibold tracking-[-0.02em] mb-1">
            Crea tu cuenta
          </h2>
          <p className="text-muted-foreground text-[13px]">
            Empieza a controlar tus gastos
          </p>
        </div>

        {/* Google Button */}
        <button className="w-full py-[13px] px-6 bg-card border border-border rounded-[10px] flex items-center justify-center gap-3 transition-colors hover:opacity-90 active:scale-[0.98] duration-200">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span className="text-sm font-semibold">Continuar con Google</span>
        </button>

        {/* Separator */}
        <div className="flex items-center gap-4 py-8">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] font-medium text-muted-foreground/60 uppercase">
            o
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Registration Form */}
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          {/* Name Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-foreground px-0.5">
                Nombre
              </label>
              <input
                type="text"
                placeholder="Diego"
                className="w-full h-[52px] bg-card border border-border rounded-[10px] px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-0 focus:border-foreground transition-all outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-foreground px-0.5">
                Apellido
              </label>
              <input
                type="text"
                placeholder="González"
                className="w-full h-[52px] bg-card border border-border rounded-[10px] px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-0 focus:border-foreground transition-all outline-none"
              />
            </div>
          </div>

          {/* RUT */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-foreground px-0.5">
              RUT
            </label>
            <input
              type="text"
              placeholder="12.345.678-9"
              className="w-full h-[52px] bg-card border border-border rounded-[10px] px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-0 focus:border-foreground transition-all outline-none tabular"
            />
            <p className="text-[9px] text-muted-foreground/60 px-0.5">
              Formato: XX.XXX.XXX-X
            </p>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-foreground px-0.5">
              Email
            </label>
            <input
              type="email"
              placeholder="nombre@ejemplo.cl"
              className="w-full h-[52px] bg-card border border-border rounded-[10px] px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-0 focus:border-foreground transition-all outline-none"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-foreground px-0.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[52px] bg-card border border-border rounded-[10px] px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-0 focus:border-foreground transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? "visibility" : "visibility_off"}
                </span>
              </button>
            </div>
            {/* Strength Meter */}
            {password && (
              <>
                <div className="flex gap-1 pt-2 px-0.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full ${
                        i <= strength.level ? strength.color : "bg-border"
                      }`}
                    />
                  ))}
                </div>
                <p
                  className={`text-[9px] font-medium px-0.5 ${getLabelColor(strength.level)}`}
                >
                  {strength.label}
                </p>
              </>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-foreground px-0.5">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                placeholder="Repite tu contraseña"
                className="w-full h-[52px] bg-card border border-border rounded-[10px] px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-0 focus:border-foreground transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showConfirm ? "visibility" : "visibility_off"}
                </span>
              </button>
            </div>
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-start gap-3 pt-2">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                className="h-4 w-4 rounded-[4px] border-border bg-card text-foreground focus:ring-0 focus:ring-offset-0 accent-foreground"
              />
            </div>
            <label className="text-[12px] text-muted-foreground leading-tight">
              Acepto los{" "}
              <a href="#" className="font-bold text-foreground">
                Términos y Condiciones
              </a>{" "}
              y la{" "}
              <a href="#" className="font-bold text-foreground">
                Política de Privacidad
              </a>{" "}
              de Chauchero.
            </label>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-[15px] bg-primary text-primary-foreground font-semibold text-sm rounded-[10px] transition-all hover:opacity-90 active:opacity-80 active:scale-[0.98] duration-200"
            >
              Crear cuenta
            </button>
          </div>
        </form>

        {/* Login Link */}
        <div className="text-center pt-8">
          <p className="text-[13px] text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="text-foreground font-semibold hover:text-primary transition-colors ml-0.5"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 text-center">
        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
          © 2026 Chauchero · Términos · Privacidad
        </p>
      </footer>
    </div>
  );
}
