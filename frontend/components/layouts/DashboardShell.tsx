"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/ui/Sidebar";
import Header from "@/components/ui/Header";
import { cn } from "@/lib/utils";
import { SidebarContext } from "@/components/providers/SidebarProvider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((r) => r.startsWith("auth-token="))
    ?.split("=")[1];
}

interface DashboardShellProps {
  children: React.ReactNode;
  user: { email: string; name: string; last_sync_at: string | null };
}

export default function DashboardShell({ children, user }: DashboardShellProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(user.last_sync_at);

  const handleToggle = useCallback(() => setCollapsed((p) => !p), []);

  const handleLogout = useCallback(() => {
    document.cookie = "auth-token=; path=/; max-age=0; SameSite=Lax";
    router.push("/");
  }, [router]);

  const handleSync = useCallback(async () => {
    const token = getToken();
    if (!token) throw new Error("Sin sesión");
    const res = await fetch(
      `${API_URL}/transactions/sync?token=${token}&max_emails=200&force_full_sync=true`,
      { method: "POST" }
    );
    if (!res.ok) throw new Error("Sync falló");
    const data = await res.json();
    setLastSyncAt(new Date().toISOString());
    router.refresh(); // re-fetch all server components
    return data;
  }, [router]);

  return (
    <SidebarContext.Provider value={{ collapsed }}>
      <div className="flex min-h-dvh bg-[var(--bg-base)]">
        <Sidebar
          collapsed={collapsed}
          onToggle={handleToggle}
          user={{ email: user.email, name: user.name }}
          onLogout={handleLogout}
        />
        <div className="flex-1 flex flex-col min-w-0 min-h-dvh">
          <Header
            onSync={handleSync}
            lastSyncAt={lastSyncAt}
            userName={user.name}
            notificationCount={0}
            avatarInitials={user.name.slice(0, 2).toUpperCase()}
          />
          <main
            className={cn(
              "flex-1 w-full pb-20 md:pb-0 px-4 py-5 md:px-6 md:py-6"
            )}
          >
            <div className="mx-auto w-full max-w-6xl animate-fade-in">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
