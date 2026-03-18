import { cookies } from "next/headers";
import DebugPanel from "./DebugPanel";

export default async function DebugPage() {
  const cookieStore = await cookies();
  const hasSession = !!cookieStore.get("auth-token")?.value;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Debug · Parser</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Diagnóstico de Gmail + Parser en tiempo real
        </p>
      </div>
      <DebugPanel hasSession={hasSession} />
    </div>
  );
}
