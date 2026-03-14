import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginButton from "@/components/auth/LoginButton";

export default async function RootPage() {
  const token = (await cookies()).get("auth-token")?.value;
  if (token) redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-[var(--bg-base)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Logo */}
        <div className="space-y-3">
          <div className="size-14 rounded-2xl bg-[var(--blue)] flex items-center justify-center mx-auto shadow-lg">
            <span className="text-white text-2xl font-bold font-mono">₡</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              Chauchero
            </h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              Tu dinero, claro.
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] p-7 space-y-5">
          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Conecta tu Gmail
            </h2>
            <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
              Analizamos tus correos de Banco de Chile para extraer tus transacciones automáticamente. Solo lectura, nunca modificamos nada.
            </p>
          </div>

          <LoginButton />

          <p className="text-[11px] text-[var(--text-muted)]">
            Solo se accede a correos de notificaciones bancarias.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: "🔒", label: "Solo lectura" },
            { icon: "⚡", label: "Automático" },
            { icon: "🆓", label: "Gratis" },
          ].map(({ icon, label }) => (
            <div key={label} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] p-3">
              <div className="text-xl mb-1">{icon}</div>
              <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
