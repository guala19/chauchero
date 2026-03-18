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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  if (h < 12) return `Buenos días, ${name}`;
  if (h < 18) return `Buenas tardes, ${name}`;
  return `Buenas noches, ${name}`;
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
    <Button
      onClick={onClick}
      disabled={state === "syncing"}
      size="sm"
      variant={state === "idle" ? "default" : "outline"}
      className={cn(
        "relative gap-2 h-8 px-3 text-xs font-medium overflow-hidden",
        state === "syncing" && "cursor-wait",
        state === "success" && "border-ch-green/30 bg-ch-green-dim text-ch-green hover:bg-ch-green-dim hover:text-ch-green",
        state === "error" && "border-destructive/30 bg-ch-red-dim text-destructive hover:bg-ch-red-dim hover:text-destructive"
      )}
    >
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
    </Button>
  );
}

// ─── Search Bar ───────────────────────────────────────────────────────────────

function SearchBar({ onSearch }: { onSearch?: (q: string) => void }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        type="text"
        placeholder="Buscar…"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="h-8 pl-8 pr-8 text-xs"
      />
      {value && (
        <button
          onClick={() => handleChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="size-8"
          />
        }
      >
        {theme === "dark" ? (
          <Sun className="size-3.5" />
        ) : (
          <Moon className="size-3.5" />
        )}
      </TooltipTrigger>
      <TooltipContent>
        {theme === "dark" ? "Modo claro" : "Modo oscuro"}
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

export default function Header({ onSync, lastSyncAt, onSearch, userName, notificationCount = 0, avatarInitials }: HeaderProps) {
  const pathname = usePathname();
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        "glass border-b border-border",
        "flex items-center gap-3 px-4 md:px-6",
        "shrink-0"
      )}
    >
      {isDashboard && userName && greeting ? (
        <div className="shrink-0">
          <p className="text-sm font-semibold text-foreground leading-tight">
            {greeting}
          </p>
          <p className="text-[10px] text-muted-foreground capitalize mt-0.5 hidden sm:block">
            {dateStr}
          </p>
        </div>
      ) : (
        <h1 className="text-sm font-semibold text-foreground shrink-0 tracking-tight">
          {title}
        </h1>
      )}

      <div className="w-px h-4 bg-border shrink-0" />

      <SearchBar onSearch={onSearch} />

      <div className="flex items-center gap-2 ml-auto shrink-0">
        {lastSyncAt && syncState === "idle" && (
          <span className="hidden lg:block text-[10px] text-muted-foreground font-mono">
            {formatRelativeDate(lastSyncAt)}
          </span>
        )}

        <SyncButton
          state={syncState}
          stats={syncStats}
          onClick={handleSync}
        />

        <Tooltip>
          <TooltipTrigger
            render={<Button variant="outline" size="icon" className="relative size-8" />}
          >
            <Bell className="size-3.5" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </TooltipTrigger>
          <TooltipContent>Notificaciones</TooltipContent>
        </Tooltip>

        <ThemeToggle />

        {avatarInitials && (
          <Avatar className="size-8 cursor-pointer">
            <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">
              {avatarInitials}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </header>
  );
}
