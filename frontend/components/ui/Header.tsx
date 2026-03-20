"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

interface HeaderProps {
  onSync?: () => Promise<any>;
  lastSyncAt?: string | null;
  onSearch?: (query: string) => void;
  userName?: string;
  notificationCount?: number;
  avatarInitials?: string;
}

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Inicio",
  "/dashboard/transactions": "Transacciones",
  "/dashboard/accounts": "Cuentas",
  "/dashboard/analytics": "Presupuestos",
  "/dashboard/settings": "Configuración",
};

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

export default function Header({ userName, avatarInitials }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [greeting, setGreeting] = useState("");
  const [dateStr, setDateStr] = useState("");

  const isDashboard = pathname === "/dashboard";
  const title = PAGE_TITLES[pathname] ?? "Inicio";

  useEffect(() => {
    if (userName) {
      setGreeting(buildGreeting(userName));
      setDateStr(buildDateStr());
    }
  }, [userName]);

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

  const handleSearchSubmit = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && search.trim()) {
      router.push(`/dashboard/transactions?q=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[var(--surface)]/80 backdrop-blur-md border-b border-[var(--outline)] px-8 py-4 flex items-center justify-between">
      {/* Left: Greeting or page title */}
      {isDashboard && userName && greeting ? (
        <div className="flex flex-col">
          <h2 className="text-base font-medium text-[var(--on-surface)]">
            {greeting}
          </h2>
          <p className="text-xs text-[var(--tertiary-text)]">
            {dateStr}
          </p>
        </div>
      ) : (
        <h2 className="text-base font-medium text-[var(--on-surface)]">
          {title}
        </h2>
      )}

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative w-64">
          <MaterialIcon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tertiary-text)] text-[20px]"
          />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchSubmit}
            placeholder="Buscar movimientos..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--surface-lowest)] border-none ring-1 ring-[var(--outline)] focus:ring-[var(--primary)] rounded-lg text-sm text-[var(--on-surface)] placeholder:text-[var(--tertiary-text)] outline-none transition-shadow"
          />
        </div>

        {/* Avatar → links to accounts */}
        {avatarInitials && (
          <Link
            href="/dashboard/accounts"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--success-text)] text-white text-xs font-bold ml-1 select-none cursor-pointer hover:opacity-90 transition-opacity"
          >
            {avatarInitials}
          </Link>
        )}
      </div>
    </header>
  );
}
