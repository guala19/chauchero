"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, APP } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatRelativeDate } from "@/lib/format";

interface User {
  email: string;
  name?: string | null;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  user?: User | null;
  onLogout?: () => void;
  onSync?: () => Promise<any>;
  lastSyncAt?: string | null;
}

// ─── Logo Mark ────────────────────────────────────────────────────────────────

function LogoMark({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 h-[var(--header-h)] shrink-0",
        "border-b border-sidebar-border px-4",
        "overflow-hidden"
      )}
    >
      <div
        className={cn(
          "flex flex-col min-w-0 transition-all duration-280 ease-in-out",
          collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
        )}
      >
        <span className="text-xl font-semibold text-sidebar-foreground tracking-tight leading-tight">
          {APP.name}<span className="text-primary">.</span>
        </span>
        <span className="text-[10px] text-muted-foreground leading-tight">
          {APP.tagline}
        </span>
      </div>

      {collapsed && (
        <span className="text-lg font-bold text-primary leading-none">₡</span>
      )}
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

  const link = (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 h-9 px-2.5 rounded-md",
        "text-sm font-medium transition-all duration-150 select-none",
        isActive
          ? "bg-sidebar-accent text-primary border-l-[3px] border-primary"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors duration-150",
          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
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

      {"badge" in item && item.badge ? (
        <Badge variant="default" className={cn("ml-auto shrink-0 text-[10px] px-1.5 py-0.5", collapsed && "hidden")}>
          {item.badge}
        </Badge>
      ) : null}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span />}>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

// ─── Bottom Section ──────────────────────────────────────────────────────────

function SidebarFooter({
  collapsed,
  onLogout,
  onToggle,
  onSync,
  lastSyncAt,
}: {
  collapsed: boolean;
  onLogout?: () => void;
  onToggle: () => void;
  onSync?: () => Promise<any>;
  lastSyncAt?: string | null;
}) {
  return (
    <div className="shrink-0 border-t border-sidebar-border p-2 space-y-2">
      {/* Sync button */}
      {!collapsed && onSync && (
        <div className="px-1">
          <Button
            onClick={() => onSync()}
            className="w-full gap-2 h-9 text-xs font-semibold"
          >
            <RefreshCw className="size-3.5" />
            Sincronizar
          </Button>
          {lastSyncAt && (
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              Última sync: {formatRelativeDate(lastSyncAt)}
            </p>
          )}
        </div>
      )}

      {/* Logout */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onLogout}
        className={cn(
          "w-full justify-start gap-3 h-8 px-2.5 text-xs text-muted-foreground",
          "hover:text-destructive hover:bg-ch-red-dim",
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
      </Button>

      {/* Collapse toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className={cn(
          "w-full h-8 px-2.5 text-xs text-muted-foreground",
          "hover:text-foreground hover:bg-secondary",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && <span>Contraer</span>}
        {collapsed ? (
          <ChevronRight className="size-3.5" />
        ) : (
          <ChevronLeft className="size-3.5" />
        )}
      </Button>
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
        "bg-card border-t border-border",
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
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
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
  onSync,
  lastSyncAt,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen sticky top-0 z-30",
          "bg-sidebar border-r border-sidebar-border",
          "sidebar-transition shrink-0 overflow-hidden",
          collapsed ? "w-[var(--sidebar-collapsed-w)]" : "w-[var(--sidebar-w)]"
        )}
        style={
          {
            "--sidebar-w": "204px",
            "--sidebar-collapsed-w": "60px",
          } as React.CSSProperties
        }
      >
        <LogoMark collapsed={collapsed} />

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
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

        <SidebarFooter
          collapsed={collapsed}
          onLogout={onLogout}
          onToggle={onToggle}
          onSync={onSync}
          lastSyncAt={lastSyncAt}
        />
      </aside>

      <MobileBottomNav />
    </>
  );
}
