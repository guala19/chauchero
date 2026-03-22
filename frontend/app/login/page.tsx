"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

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
        {/* Credentials Form */}
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
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
            className="w-full h-12 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:opacity-90 active:opacity-80 transition-all active:scale-[0.99] tracking-[0.01em]"
          >
            Iniciar sesión
          </button>
        </form>

        {/* Separator */}
        <div className="flex items-center gap-4 py-8 px-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] uppercase font-bold text-muted-foreground/60">
            o
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Social & Alternative Login */}
        <div className="space-y-4 text-center">
          <button className="w-full h-12 flex items-center justify-center gap-3 bg-card border border-border text-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-colors">
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
            Continuar con Google
          </button>

          <a
            href="#"
            className="inline-block text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Iniciar sin contraseña
          </a>
        </div>
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
