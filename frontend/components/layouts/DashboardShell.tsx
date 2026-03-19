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
  const [collapsed] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(user.last_sync_at);

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
      const err = new Error(body?.detail ?? "Sync falló");
      (err as any).httpStatus = res.status;
      throw err;
    }
    const data = await res.json();
    setLastSyncAt(new Date().toISOString());
    router.refresh();
    return data.stats ?? data;
  }, [router]);

  return (
    <SidebarContext.Provider value={{ collapsed }}>
      <Sidebar
        onLogout={handleLogout}
        onSync={handleSync}
        lastSyncAt={lastSyncAt}
      />

      <main className="ml-[204px] min-h-screen">
        <Header
          onSync={handleSync}
          lastSyncAt={lastSyncAt}
          userName={user.name}
          notificationCount={0}
          avatarInitials={user.name.slice(0, 2).toUpperCase()}
        />
        <div className="p-6 space-y-8">
          {children}
        </div>
      </main>
    </SidebarContext.Provider>
  );
}
