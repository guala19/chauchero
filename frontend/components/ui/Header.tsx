"use client";

import { usePathname } from "next/navigation";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  RefreshCw,
  Search,
  Sun,
  Moon,
  Check,
  AlertCircle,
  X,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeDate } from "@/lib/format";
import { useTheme } from "@/components/providers/ThemeProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

type SyncState = "idle" | "syncing" | "success" | "error";

interface SyncStats {
  emails_fetched: number;
  transactions_created: number;
}

interface HeaderProps {
  onSync?: () => Promise<SyncStats | void>;
  lastSyncAt?: string | null;
  onSearch?: (query: string) => void;
  userName?: string;
  notificationCount?: number;
  avatarInitials?: string;
}

// ─── Page Titles ─────────────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":               "Dashboard",
  "/dashboard/transactions":  "Transacciones",
  "/dashboard/accounts":      "Cuentas",
  "/dashboard/analytics":     "Analytics",
  "/dashboard/settings":      "Configuración",
};

function getPageTitle(pathname: string): string {
  return PAGE_TITLES[pathname] ?? "Dashboard";
}

// ─── Greeting ─────────────────────────────────────────────────────────────────

function buildGreeting(name: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Buenos días, ${name} ☀️`;
  if (h < 18) return `Buenas tardes, ${name} 🌤️`;
  return `Buenas noches, ${name} 🌙`;
}

function buildDateStr(): string {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

// ─── Sync Button ──────────────────────────────────────────────────────────────

function SyncButton({
  state,
  stats,
  onClick,
}: {
  state: SyncState;
  stats: SyncStats | null;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={state === "syncing"}
      className={cn(
        "group relative flex items-center gap-2 h-8 px-3 rounded-[var(--radius)]",
        "text-xs font-medium border transition-all duration-200 select-none",
        "overflow-hidden",
        state === "idle" && [
          "bg-[var(--blue)] text-white border-[var(--blue)]",
          "hover:brightness-110 active:brightness-90",
        ],
        state === "syncing" && [
          "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
          "border-[var(--border)] cursor-wait",
        ],
        state === "success" && [
          "bg-[var(--green-dim)] text-[var(--green)]",
          "border-[var(--green)]/30",
        ],
        state === "error" && [
          "bg-[var(--red-dim)] text-[var(--red)]",
          "border-[var(--red)]/30",
        ]
      )}
    >
      {/* Shimmer while syncing */}
      {state === "syncing" && (
        <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      )}

      {state === "syncing" && <RefreshCw className="size-3.5 animate-spin-slow" />}
      {state === "idle"    && <RefreshCw className="size-3.5" />}
      {state === "success" && <Check className="size-3.5" />}
      {state === "error"   && <AlertCircle className="size-3.5" />}

      <span className="hidden sm:inline whitespace-nowrap">
        {state === "idle"    && "Sincronizar"}
        {state === "syncing" && "Sincronizando…"}
        {state === "success" && (
          stats
            ? `+${stats.transactions_created} nuevas`
            : "Actualizado"
        )}
        {state === "error" && "Error al sync"}
      </span>
    </button>
  );
}

// ─── Search Bar ───────────────────────────────────────────────────────────────

function SearchBar({ onSearch }: { onSearch?: (q: string) => void }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleChange = (v: string) => {
    setValue(v);
    onSearch?.(v);
  };

  return (
    <div className="relative flex-1 max-w-xs">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[var(--text-muted)] pointer-events-none" />

      <input
        ref={inputRef}
        type="text"
        placeholder="Buscar… ⌘K"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className={cn(
          "w-full h-8 pl-8 pr-8 rounded-[var(--radius)] text-xs",
          "bg-[var(--bg-surface)] border border-[var(--border)]",
          "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
          "focus:outline-none focus:border-[var(--blue)] focus:ring-1 focus:ring-[var(--blue)]/25",
          "transition-all duration-150"
        )}
      />

      {value && (
        <button
          onClick={() => handleChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

// ─── Theme Toggle ─────────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className={cn(
        "size-8 rounded-[var(--radius)] flex items-center justify-center shrink-0",
        "bg-[var(--bg-surface)] border border-[var(--border)]",
        "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
        "hover:bg-[var(--bg-elevated)] hover:border-[var(--border-subtle)]",
        "transition-all duration-150"
      )}
    >
      {theme === "dark" ? (
        <Sun className="size-3.5" />
      ) : (
        <Moon className="size-3.5" />
      )}
    </button>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

export default function Header({ onSync, lastSyncAt, onSearch, userName, notificationCount = 0, avatarInitials }: HeaderProps) {
  const pathname = usePathname();
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Hydration-safe greeting
  const [greeting, setGreeting] = useState<string>("");
  const [dateStr,  setDateStr]  = useState<string>("");

  const handleSync = useCallback(async () => {
    if (!onSync || syncState === "syncing") return;

    if (resetTimer.current) clearTimeout(resetTimer.current);
    setSyncState("syncing");
    setSyncStats(null);

    try {
      const result = await onSync();
      setSyncStats(result ?? null);
      setSyncState("success");
    } catch {
      setSyncState("error");
    } finally {
      resetTimer.current = setTimeout(() => {
        setSyncState("idle");
        setSyncStats(null);
      }, 4000);
    }
  }, [onSync, syncState]);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  useEffect(() => {
    if (userName) {
      setGreeting(buildGreeting(userName));
      setDateStr(buildDateStr());
    }
  }, [userName]);

  const title = getPageTitle(pathname);
  const isDashboard = pathname === "/dashboard";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 h-[var(--header-h)]",
        "glass border-b border-[var(--border)]",
        "flex items-center gap-3 px-4 md:px-6",
        "shrink-0"
      )}
    >
      {/* Page Title / Greeting */}
      {isDashboard && userName && greeting ? (
        <div className="shrink-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
            {greeting}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] capitalize mt-0.5 hidden sm:block">
            {dateStr}
          </p>
        </div>
      ) : (
        <h1 className="text-sm font-semibold text-[var(--text-primary)] shrink-0 tracking-tight">
          {title}
        </h1>
      )}

      {/* Divider */}
      <div className="w-px h-4 bg-[var(--border)] shrink-0" />

      {/* Search */}
      <SearchBar onSearch={onSearch} />

      {/* Right actions */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        {/* Last sync timestamp */}
        {lastSyncAt && syncState === "idle" && (
          <span className="hidden lg:block text-[10px] text-[var(--text-muted)] font-mono">
            {formatRelativeDate(lastSyncAt)}
          </span>
        )}

        {/* Sync button */}
        <SyncButton
          state={syncState}
          stats={syncStats}
          onClick={handleSync}
        />

        {/* Notifications */}
        <button
          title="Notificaciones"
          className={cn(
            "relative size-8 rounded-[var(--radius)] flex items-center justify-center shrink-0",
            "bg-[var(--bg-surface)] border border-[var(--border)]",
            "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
            "hover:bg-[var(--bg-elevated)] transition-all duration-150"
          )}
        >
          <Bell className="size-3.5" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 size-4 rounded-full bg-[var(--red)] text-white text-[9px] font-bold flex items-center justify-center leading-none">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Avatar */}
        {avatarInitials && (
          <div className={cn(
            "size-8 rounded-full flex items-center justify-center shrink-0",
            "bg-[var(--blue-dim)] border border-[var(--blue)]/30",
            "text-[var(--blue)] text-[11px] font-bold select-none cursor-pointer",
            "hover:brightness-110 transition-all duration-150"
          )}>
            {avatarInitials}
          </div>
        )}
      </div>
    </header>
  );
}
