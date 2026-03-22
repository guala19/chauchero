"use client";

import { useState } from "react";
import { MaterialIcon } from "./MaterialIcon";

export default function Header() {
  const [search, setSearch] = useState("");

  return (
    <header className="sticky top-0 z-40 w-full bg-[var(--surface)]/80 backdrop-blur-md border-b border-[var(--outline)] px-8 py-4 flex items-center justify-between">
      {/* Greeting */}
      <div className="flex flex-col">
        <h2 className="text-base font-medium text-[var(--on-surface)]">
          Buenos dias, Diego
        </h2>
        <p className="text-xs text-[var(--tertiary-text)]">
          18 de marzo, 2026
        </p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative w-64">
          <MaterialIcon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tertiary-text)] text-[20px]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar movimientos..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--surface-lowest)] border-none ring-1 ring-[var(--outline)] focus:ring-[var(--primary)] rounded-lg text-sm text-[var(--on-surface)] placeholder:text-[var(--tertiary-text)] outline-none transition-shadow"
          />
        </div>

        {/* Notifications */}
        <button className="p-2 text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors relative">
          <MaterialIcon name="notifications" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--primary)] rounded-full border-2 border-[var(--surface)]" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--success-text)] text-white text-xs font-bold ml-1 select-none cursor-pointer hover:opacity-90 transition-opacity">
          DG
        </div>
      </div>
    </header>
  );
}
