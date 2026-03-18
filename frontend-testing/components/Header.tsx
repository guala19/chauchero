"use client";

import { Bell, Search, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  return (
    <header className="flex items-center justify-between py-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-foreground">
          {getGreeting()}, Diego
        </h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground capitalize">{getDateString()}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="size-9">
          <Search className="size-4" />
        </Button>
        <Button variant="outline" size="icon" className="relative size-9">
          <Bell className="size-4" />
          <div className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive" />
        </Button>
        <Button variant="outline" size="icon" className="size-9" onClick={toggleTheme}>
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
        <Avatar className="ml-2 size-9">
          <AvatarFallback className="text-[13px] font-semibold bg-primary/10 text-primary">
            DM
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
