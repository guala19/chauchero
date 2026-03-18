"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/ui/Sidebar";
import Header from "@/components/ui/Header";
import { SidebarContext } from "@/components/providers/SidebarProvider";

interface DashboardShellProps {
  children: React.ReactNode;
  user: { email: string; name: string; last_sync_at: string | null };
}

export default function DashboardShell({ children, user }: DashboardShellProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(user.last_sync_at);

  const handleToggle = useCallback(() => setCollapsed((p) => !p), []);

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }, [router]);

  const handleSync = useCallback(async () => {
    const res = await fetch(
      "/api/transactions/sync?max_emails=200&force_full_sync=true",
      { method: "POST" },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.detail ?? "Sync falló");
    }
    const data = await res.json();
    setLastSyncAt(new Date().toISOString());
    router.refresh();
    return data;
  }, [router]);

  return (
    <SidebarContext.Provider value={{ collapsed }}>
      <div className="flex min-h-dvh bg-background">
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
          <main className="flex-1 w-full pb-20 md:pb-0 px-4 py-5 md:px-6 md:py-6">
            <div className="mx-auto w-full max-w-6xl animate-fade-in">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
