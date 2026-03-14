"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, APP } from "@/lib/constants";

interface User {
  email: string;
  name?: string | null;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  user?: User | null;
  onLogout?: () => void;
}

// ─── Logo Mark ────────────────────────────────────────────────────────────────

function LogoMark({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 h-[var(--header-h)] shrink-0",
        "border-b border-[var(--border)] px-4",
        "overflow-hidden"
      )}
    >
      {/* Icon */}
      <div className="relative size-8 shrink-0">
        <div className="absolute inset-0 rounded-lg bg-[var(--blue)] opacity-20 blur-[6px]" />
        <div className="relative size-8 rounded-lg bg-[var(--blue)] flex items-center justify-center">
          <span className="font-mono font-bold text-white text-sm leading-none">₡</span>
        </div>
      </div>

      {/* Wordmark */}
      <div
        className={cn(
          "flex flex-col min-w-0 transition-all duration-280 ease-in-out",
          collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
        )}
      >
        <span className="text-sm font-semibold text-[var(--text-primary)] tracking-tight leading-tight">
          {APP.name}
        </span>
        <span className="text-[10px] text-[var(--text-muted)] leading-tight">
          {APP.tagline}
        </span>
      </div>
    </div>
  );
}

// ─── Nav Item ─────────────────────────────────────────────────────────────────

function NavLink({
  item,
  isActive,
  collapsed,
}: {
  item: (typeof NAV_ITEMS)[number];
  isActive: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-3 h-9 px-2.5 rounded-[var(--radius)]",
        "text-sm font-medium transition-all duration-150 select-none",
        isActive
          ? "bg-[var(--blue-dim)] text-[var(--blue)]"
          : [
              "text-[var(--text-secondary)]",
              "hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
            ]
      )}
    >
      {/* Active indicator */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[var(--blue)] rounded-r-full" />
      )}

      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors duration-150",
          isActive ? "text-[var(--blue)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
        )}
        strokeWidth={isActive ? 2.5 : 2}
      />

      <span
        className={cn(
          "truncate transition-all duration-280 ease-in-out",
          collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
        )}
      >
        {item.label}
      </span>

      {/* Badge */}
      {"badge" in item && item.badge ? (
        <span
          className={cn(
            "ml-auto shrink-0 text-[10px] font-semibold font-mono",
            "px-1.5 py-0.5 rounded-full bg-[var(--blue)] text-white leading-none",
            collapsed && "hidden"
          )}
        >
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

// ─── User Footer ──────────────────────────────────────────────────────────────

function UserFooter({
  user,
  collapsed,
  onLogout,
  onToggle,
}: {
  user?: User | null;
  collapsed: boolean;
  onLogout?: () => void;
  onToggle: () => void;
}) {
  const initials = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() ?? "U";

  const displayName = user?.name ?? user?.email?.split("@")[0] ?? "Usuario";

  return (
    <div className="shrink-0 border-t border-[var(--border)] p-2 space-y-0.5">
      {/* User info */}
      {user && (
        <div
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius)]",
            "text-[var(--text-secondary)] overflow-hidden",
            collapsed && "justify-center"
          )}
        >
          {/* Avatar */}
          <div className="size-7 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-[var(--text-secondary)]">
              {initials}
            </span>
          </div>

          <div
            className={cn(
              "flex flex-col min-w-0 transition-all duration-280",
              collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            )}
          >
            <span className="text-[11px] font-medium text-[var(--text-primary)] truncate">
              {displayName}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] truncate">
              {user.email}
            </span>
          </div>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={onLogout}
        title={collapsed ? "Cerrar sesión" : undefined}
        className={cn(
          "w-full flex items-center gap-3 h-8 px-2.5 rounded-[var(--radius)]",
          "text-xs text-[var(--text-muted)]",
          "hover:text-[var(--red)] hover:bg-[var(--red-dim)]",
          "transition-colors duration-150",
          collapsed && "justify-center"
        )}
      >
        <LogOut className="size-3.5 shrink-0" />
        <span
          className={cn(
            "transition-all duration-280",
            collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          )}
        >
          Cerrar sesión
        </span>
      </button>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 h-8 px-2.5 rounded-[var(--radius)]",
          "text-xs text-[var(--text-muted)]",
          "hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]",
          "transition-colors duration-150",
          collapsed ? "justify-center" : "justify-between"
        )}
        title={collapsed ? "Expandir sidebar" : undefined}
      >
        {!collapsed && (
          <span className="flex items-center gap-1.5">
            <UserCircle2 className="size-3.5 opacity-50" />
            Contraer
          </span>
        )}
        {collapsed ? (
          <ChevronRight className="size-3.5" />
        ) : (
          <ChevronLeft className="size-3.5" />
        )}
      </button>
    </div>
  );
}

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────

function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-50",
        "bg-[var(--bg-surface)] border-t border-[var(--border)]",
        "flex items-center justify-around",
        "px-2 pt-2 pb-safe"
      )}
    >
      {NAV_ITEMS.slice(0, 4).map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg",
              "transition-colors duration-150",
              isActive
                ? "text-[var(--blue)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
          >
            <Icon
              className="size-5"
              strokeWidth={isActive ? 2.5 : 2}
            />
            <span className="text-[9px] font-medium leading-none">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export default function Sidebar({
  collapsed,
  onToggle,
  user,
  onLogout,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen sticky top-0 z-30",
          "bg-[var(--bg-surface)] border-r border-[var(--border)]",
          "sidebar-transition shrink-0 overflow-hidden",
          collapsed ? "w-[var(--sidebar-collapsed-w)]" : "w-[var(--sidebar-w)]"
        )}
        style={
          {
            "--sidebar-w": "240px",
            "--sidebar-collapsed-w": "60px",
          } as React.CSSProperties
        }
      >
        <LogoMark collapsed={collapsed} />

        {/* Nav section label */}
        {!collapsed && (
          <div className="px-4 pt-4 pb-1">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Menú
            </span>
          </div>
        )}

        {/* Navigation links */}
        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <NavLink
                key={item.href}
                item={item}
                isActive={isActive}
                collapsed={collapsed}
              />
            );
          })}
        </nav>

        <UserFooter
          user={user}
          collapsed={collapsed}
          onLogout={onLogout}
          onToggle={onToggle}
        />
      </aside>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav />
    </>
  );
}
