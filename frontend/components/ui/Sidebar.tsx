"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { formatRelativeDate } from "@/lib/format";

// ─── Nav config (Material icon names) ────────────────────────────────────────

const NAV = [
  { label: "Inicio", icon: "home", href: "/dashboard" },
  { label: "Transacciones", icon: "receipt_long", href: "/dashboard/transactions" },
  { label: "Cuentas", icon: "account_balance_wallet", href: "/dashboard/accounts" },
  { label: "Analíticas", icon: "leaderboard", href: "/dashboard/analytics" },
  { label: "Configuración", icon: "settings", href: "/dashboard/settings" },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  user?: { email: string; name?: string | null } | null;
  onLogout?: () => void;
  onSync?: () => Promise<any>;
  lastSyncAt?: string | null;
}

// ─── Mobile Bottom Nav ───────────────────────────────────────────────────────

function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface-lowest)] border-t border-[var(--outline)] flex items-center justify-around px-2 pt-2 pb-safe">
      {NAV.slice(0, 4).map((item) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-colors ${
              isActive ? "text-[var(--primary)]" : "text-[var(--tertiary-text)]"
            }`}
          >
            <MaterialIcon name={item.icon} className="text-[20px]" />
            <span className="text-[9px] font-medium leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export default function Sidebar({ onLogout, onSync, lastSyncAt }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-[204px] border-r border-[var(--outline)] flex-col justify-between p-5 bg-[var(--surface-container)] z-50">
        <div>
          {/* Logo */}
          <div className="mb-10">
            <h1 className="text-2xl font-semibold text-[var(--on-surface)]">
              Chauchero<span className="text-[var(--primary)]">.</span>
            </h1>
            <p className="text-[11px] text-[var(--tertiary-text)] font-medium mt-1">
              Tu dinero, claro.
            </p>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {NAV.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    isActive
                      ? "flex items-center gap-3 px-4 py-3 text-[var(--primary)] bg-[var(--surface)]/50 rounded-lg border-l-[3px] border-[var(--primary)] transition-colors"
                      : "flex items-center gap-3 px-4 py-3 text-[var(--on-surface-variant)] hover:bg-[var(--surface)]/50 rounded-lg transition-colors"
                  }
                >
                  <MaterialIcon name={item.icon} className="text-[22px]" />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom section */}
        <div className="space-y-4">
          {onSync && (
            <div>
              <button
                onClick={() => onSync()}
                className="w-full flex items-center justify-center gap-2 bg-[#C4522A] text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-[#9A3A1A] transition-colors"
              >
                <MaterialIcon name="sync" className="text-[18px]" />
                Sincronizar
              </button>
              {lastSyncAt && (
                <p className="text-[10px] text-[var(--tertiary-text)] mt-2 text-center">
                  Última sync: {formatRelativeDate(lastSyncAt)}
                </p>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-[var(--outline)]/50">
            <button
              onClick={onLogout}
              className="flex items-center gap-3 px-4 py-2 text-[var(--on-surface-variant)] hover:text-[var(--primary)] text-sm transition-colors w-full"
            >
              <MaterialIcon name="logout" className="text-[20px]" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      <MobileBottomNav />
    </>
  );
}
