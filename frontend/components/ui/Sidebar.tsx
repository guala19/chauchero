"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { formatRelativeDate } from "@/lib/format";

const NAV = [
  { label: "Inicio", icon: "home", href: "/dashboard" },
  { label: "Transacciones", icon: "account_balance_wallet", href: "/dashboard/transactions" },
  { label: "Presupuestos", icon: "pie_chart", href: "/dashboard/analytics" },
  { label: "Configuración", icon: "settings", href: "/dashboard/accounts" },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  user?: { email: string; name?: string | null } | null;
  onLogout?: () => void;
  onSync?: () => Promise<any>;
  lastSyncAt?: string | null;
}

function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FFFFFF] border-t border-[#E8DDD6] flex items-center justify-around px-2 pt-2 pb-safe">
      {NAV.slice(0, 4).map((item) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href}
            className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-colors ${isActive ? "text-[#C4522A]" : "text-[#9E8E86]"}`}>
            <MaterialIcon name={item.icon} className="text-[20px]" />
            <span className="text-[9px] font-medium leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar({ user, onLogout, onSync, lastSyncAt }: SidebarProps) {
  const pathname = usePathname();
  const displayName = user?.name ?? user?.email?.split("@")[0] ?? "Usuario";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[240px] bg-[#F2EDE6] flex-col justify-between py-8 px-0 z-50">
        {/* Top: Brand + Nav */}
        <div>
          {/* Brand */}
          <div className="px-6 mb-10">
            <div className="flex items-baseline">
              <span className="text-[22px] font-semibold tracking-tight text-[#1C0F0A]">Chauchero</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#C4522A] ml-0.5" />
            </div>
            <p className="text-xs text-[#9E8E86] mt-1 font-medium">Tu dinero, claro.</p>
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
                      ? "flex items-center px-6 py-3 space-x-3 bg-white/60 border-l-[3px] border-[#C4522A] text-[#C4522A] transition-all"
                      : "flex items-center px-6 py-3 space-x-3 text-[#6B5C54] hover:bg-white/40 hover:text-[#1C0F0A] transition-all group border-l-[3px] border-transparent"
                  }
                >
                  <MaterialIcon name={item.icon} className={isActive ? "" : "text-[#6B5C54] group-hover:text-[#1C0F0A]"} />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Sync + User */}
        <div className="px-6 space-y-6">
          {/* Sync */}
          {onSync && (
            <div className="space-y-2">
              <button
                onClick={() => onSync()}
                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-[#C4522A] text-white rounded-lg hover:brightness-110 active:scale-[0.98] transition-all"
              >
                <MaterialIcon name="sync" className="text-[18px]" />
                <span className="text-sm font-medium">Sincronizar</span>
              </button>
              {lastSyncAt && (
                <p className="text-[11px] text-[#9E8E86] text-center tabular">
                  Última sync: {formatRelativeDate(lastSyncAt)}
                </p>
              )}
            </div>
          )}

          {/* Separator */}
          <div className="h-[1px] w-full bg-[#E8DDD6]/30" />

          {/* User Profile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#1C0F0A] flex items-center justify-center text-white text-xs font-bold shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#6B5C54] truncate">{displayName}</p>
                <p className="text-[11px] text-[#9E8E86]">Plan Gratis</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="text-[#9E8E86] hover:text-[#B5362A] transition-colors shrink-0"
            >
              <MaterialIcon name="logout" className="text-[20px]" />
            </button>
          </div>
        </div>
      </aside>

      <MobileBottomNav />
    </>
  );
}
