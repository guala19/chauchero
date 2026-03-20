import { Suspense } from "react";
import { cookies } from "next/headers";
import TransactionsList from "@/components/dashboard/TransactionsList";
import { fetchTransactions } from "@/lib/api";

async function TransactionsContent() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Transacciones</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Conecta tu cuenta para comenzar</p>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] flex flex-col items-center justify-center py-20 gap-4">
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--text-primary)]">No has iniciado sesión</p>
            <p className="text-[13px] text-[var(--text-muted)] mt-1">
              Inicia sesión con Google para vincular tu Gmail y analizar tus correos bancarios.
            </p>
          </div>
          <a
            href="/auth/login"
            className="px-4 py-2 rounded-[var(--radius)] bg-[var(--blue)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Iniciar sesión con Google
          </a>
        </div>
      </div>
    );
  }

  const transactions = await fetchTransactions(token);

  return <TransactionsList transactions={transactions} />;
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-5">
        <h1 className="text-[28px] font-black tracking-tighter text-[var(--on-surface)]">Transacciones</h1>
        <div className="bg-[var(--surface-container)] rounded-xl p-20 flex flex-col items-center gap-4">
          <p className="text-sm text-[var(--tertiary-text)]">Cargando...</p>
        </div>
      </div>
    }>
      <TransactionsContent />
    </Suspense>
  );
}
