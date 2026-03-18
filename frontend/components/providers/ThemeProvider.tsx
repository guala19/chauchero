"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
});

function applyTheme(t: Theme) {
  if (t === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

function readCookieTheme(): Theme | null {
  try {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith("ch-theme="));
    const val = match?.split("=")[1];
    return val === "light" || val === "dark" ? val : null;
  } catch {
    return null;
  }
}

function writeCookieTheme(t: Theme) {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  document.cookie = `ch-theme=${t}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = readCookieTheme();
    const systemPrefers =
      window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    const resolved = saved ?? systemPrefers;

    setTheme(resolved);
    applyTheme(resolved);
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      writeCookieTheme(next);
      return next;
    });
  }, []);

  // Prevent flash — render children only after mount
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
