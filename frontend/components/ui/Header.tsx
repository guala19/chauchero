"use client";

import { usePathname, useRouter } from "next/navigation";
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
  Clock,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeDate } from "@/lib/format";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Types ────────────────────────────────────────────────────────────────────

type SyncState = "idle" | "syncing" | "success" | "error" | "auth-error" | "cooldown";

interface SyncStats {
  emails_fetched: number;
  transactions_created: number;
  parsing_errors?: number;
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
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

// ─── Success message ──────────────────────────────────────────────────────────

function successMessage(stats: SyncStats | null): string {
  if (!stats) return "Actualizado";
  const { transactions_created, parsing_errors = 0 } = stats;
  if (transactions_created === 0 && parsing_errors === 0) return "Todo al día";
  if (transactions_created === 0) return `${parsing_errors} no reconocidos`;
  if (parsing_errors === 0) return `+${transactions_created} nuevas`;
  return `+${transactions_created} nuevas · ${parsing_errors} no reconocidos`;
}

// ─── Sync Button ──────────────────────────────────────────────────────────────

function SyncButton({
  state,
  stats,
  cooldownMinutes,
  onClick,
}: {
  state: SyncState;
  stats: SyncStats | null;
  cooldownMinutes: number | null;
  onClick: () => void;
}) {
  const isAmber = state === "cooldown";
  const isRed   = state === "error" || state === "auth-error";
  const isGreen  = state === "success";

  return (
    <Button
      onClick={onClick}
      disabled={state === "syncing"}
      size="sm"
      variant={state === "idle" ? "default" : "outline"}
      className={cn(
        "relative gap-2 h-8 px-3 text-xs font-medium overflow-hidden",
        state === "syncing"    && "cursor-wait",
        isGreen  && "border-ch-green/30 bg-ch-green-dim text-ch-green hover:bg-ch-green-dim hover:text-ch-green",
        isRed    && "border-destructive/30 bg-ch-red-dim text-destructive hover:bg-ch-red-dim hover:text-destructive",
        isAmber  && "border-ch-amber/30 bg-ch-amber-dim text-ch-amber hover:bg-ch-amber-dim hover:text-ch-amber",
      )}
    >
      {state === "syncing" && (
        <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      )}

      {state === "syncing"    && <RefreshCw className="size-3.5 animate-spin-slow" />}
      {state === "idle"       && <RefreshCw className="size-3.5" />}
      {state === "success"    && <Check className="size-3.5" />}
      {state === "error"      && <WifiOff className="size-3.5" />}
      {state === "auth-error" && <AlertCircle className="size-3.5" />}
      {state === "cooldown"   && <Clock className="size-3.5" />}

      <span className="hidden sm:inline whitespace-nowrap">
        {state === "idle"       && "Sincronizar"}
        {state === "syncing"    && "Sincronizando…"}
        {state === "success"    && successMessage(stats)}
        {state === "error"      && "Error al sync"}
        {state === "auth-error" && "Reconecta Google"}
        {state === "cooldown"   && (cooldownMinutes ? `Espera ${cooldownMinutes} min` : "Espera un momento")}
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
    <div className="relative w-56">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Buscar movimientos..."
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full pl-8 pr-8 py-1.5 bg-card ring-1 ring-border focus:ring-primary rounded-lg text-xs text-foreground placeholder:text-muted-foreground outline-none transition-shadow"
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
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="size-8 text-muted-foreground hover:text-foreground"
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
  const router   = useRouter();
  const [syncState,       setSyncState]       = useState<SyncState>("idle");
  const [syncStats,       setSyncStats]       = useState<SyncStats | null>(null);
  const [cooldownMinutes, setCooldownMinutes] = useState<number | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [greeting, setGreeting] = useState<string>("");
  const [dateStr,  setDateStr]  = useState<string>("");

  const scheduleReset = useCallback((delay = 4000) => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setSyncState("idle");
      setSyncStats(null);
      setCooldownMinutes(null);
    }, delay);
  }, []);

  const handleButtonClick = useCallback(() => {
    if (syncState === "auth-error") {
      router.push("/dashboard/accounts");
      return;
    }
    handleSync();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncState, router]);

  const handleSync = useCallback(async () => {
    if (!onSync || syncState === "syncing") return;

    if (resetTimer.current) clearTimeout(resetTimer.current);
    setSyncState("syncing");
    setSyncStats(null);
    setCooldownMinutes(null);

    try {
      const result = await onSync();
      setSyncStats((result as SyncStats) ?? null);
      setSyncState("success");
      scheduleReset(5000);
    } catch (err: unknown) {
      const httpStatus = (err as any)?.httpStatus as number | undefined;
      const message    = (err as any)?.message as string ?? "";

      if (httpStatus === 401) {
        setSyncState("auth-error");
        scheduleReset(8000);
      } else if (httpStatus === 429) {
        const match = message.match(/(\d+)\s*minuto/);
        setCooldownMinutes(match ? parseInt(match[1], 10) : null);
        setSyncState("cooldown");
        scheduleReset(8000);
      } else if (httpStatus === 409) {
        setSyncState("syncing");
        scheduleReset(3000);
      } else {
        setSyncState("error");
        scheduleReset(4000);
      }
    }
  }, [onSync, syncState, scheduleReset]);

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
      {/* Left: Greeting or page title */}
      {isDashboard && userName && greeting ? (
        <div className="shrink-0">
          <p className="text-sm font-medium text-foreground leading-tight">
            {greeting}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">
            {dateStr}
          </p>
        </div>
      ) : (
        <h1 className="text-sm font-semibold text-foreground shrink-0 tracking-tight">
          {title}
        </h1>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: Search, sync, notifications, theme, avatar */}
      <div className="flex items-center gap-2 shrink-0">
        <SearchBar onSearch={onSearch} />

        {lastSyncAt && syncState === "idle" && (
          <span className="hidden lg:block text-[10px] text-muted-foreground font-mono">
            {formatRelativeDate(lastSyncAt)}
          </span>
        )}

        <SyncButton
          state={syncState}
          stats={syncStats}
          cooldownMinutes={cooldownMinutes}
          onClick={handleButtonClick}
        />

        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon" className="relative size-8 text-muted-foreground hover:text-foreground" />}
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
          <div className="size-7 rounded-full flex items-center justify-center bg-[var(--success-text)] text-white text-[10px] font-bold select-none cursor-pointer hover:opacity-90 transition-opacity">
            {avatarInitials}
          </div>
        )}
      </div>
    </header>
  );
}
