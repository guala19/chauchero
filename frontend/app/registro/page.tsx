"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rut, setRut] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!rut.trim()) {
      setError("El RUT es obligatorio");
      return;
    }
    if (!/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/.test(rut.trim())) {
      setError("El RUT debe tener formato XX.XXX.XXX-X");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (!acceptTerms) {
      setError("Debes aceptar los términos y condiciones");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          confirm_password: confirmPassword,
          first_name: firstName,
          last_name: lastName,
          rut: rut.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Error al crear la cuenta");
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

        {/* Error Message */}
        {error && (
          <div className="mb-6 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Registration Form */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Name Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-foreground px-0.5">
                Nombre
              </label>
              <input
                type="text"
                placeholder="Diego"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
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
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
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
              required
              value={rut}
              onChange={(e) => setRut(e.target.value)}
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
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
                required
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
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
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
              disabled={loading || !acceptTerms}
              className="w-full py-[15px] bg-primary text-primary-foreground font-semibold text-sm rounded-[10px] transition-all hover:opacity-90 active:opacity-80 active:scale-[0.98] duration-200 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? "Creando cuenta..." : "Crear cuenta"}
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
