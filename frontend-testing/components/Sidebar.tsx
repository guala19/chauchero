"use client";

import { useState } from "react";
import { NAV_ITEMS } from "@/lib/mock-data";
import { MaterialIcon } from "./MaterialIcon";

export default function Sidebar() {
  const [syncing, setSyncing] = useState(false);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-[204px] border-r border-[var(--outline)] flex flex-col justify-between p-5 bg-[var(--surface-container)] z-50">
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
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={
                item.active
                  ? "flex items-center gap-3 px-4 py-3 text-[var(--primary)] bg-[var(--surface)]/50 rounded-lg border-l-[3px] border-[var(--primary)] transition-colors"
                  : "flex items-center gap-3 px-4 py-3 text-[var(--on-surface-variant)] hover:bg-[var(--surface)]/50 rounded-lg transition-colors"
              }
            >
              <MaterialIcon name={item.icon} className="text-[22px]" />
              <span className="font-medium text-sm">{item.label}</span>
            </a>
          ))}
        </nav>
      </div>

      {/* Bottom section */}
      <div className="space-y-4">
        <div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] text-[var(--on-primary)] font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            <MaterialIcon
              name="sync"
              className={`text-[18px] ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "Sincronizando..." : "Sincronizar"}
          </button>
          <p className="text-[10px] text-[var(--tertiary-text)] mt-2 text-center">
            {syncing ? "Procesando emails..." : "Ultima sync: hace 5 min"}
          </p>
        </div>

        <div className="pt-4 border-t border-[var(--outline)]/50">
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-2 text-[var(--on-surface-variant)] hover:text-[var(--primary)] text-sm transition-colors"
          >
            <MaterialIcon name="logout" className="text-[20px]" />
            Cerrar Sesion
          </a>
        </div>
      </div>
    </aside>
  );
}
