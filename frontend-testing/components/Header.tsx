"use client";

import { Bell, Search, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function getDateString() {
  return new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Header() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const isLight = document.documentElement.classList.contains("theme-light");
    if (isLight) setTheme("light");
    else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      setTheme("light");
      document.documentElement.classList.add("theme-light");
    }
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "light") {
      document.documentElement.classList.add("theme-light");
    } else {
      document.documentElement.classList.remove("theme-light");
    }
  }

  return (
    <header className="flex items-center justify-between py-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-text-primary">
          {getGreeting()}, Diego
        </h1>
        <p className="mt-0.5 text-[13px] text-text-secondary capitalize">{getDateString()}</p>
      </div>

      <div className="flex items-center gap-2">
        <button className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-border-subtle bg-bg-surface text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-all duration-150">
          <Search size={16} />
        </button>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-[6px] border border-border-subtle bg-bg-surface text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-all duration-150">
          <Bell size={16} />
          <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-ch-red" />
        </button>
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-border-subtle bg-bg-surface text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-all duration-150"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-ch-blue text-[13px] font-semibold text-white">
          DM
        </div>
      </div>
    </header>
  );
}
