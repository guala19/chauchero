import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/layouts/DashboardShell";

// ── JWT decode (no network call, no external lib) ────────────────────────────
// We trust our own token — just decode the payload and check expiry.

interface JwtPayload {
  sub: string;
  email: string;
  exp: number;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = Buffer.from(part, "base64url").toString("utf-8");
    const payload = JSON.parse(json) as JwtPayload;
    // Reject if expired
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    if (!payload.email) return null;
    return payload;
  } catch {
    return null;
  }
}

function nameFromEmail(email: string): string {
  return email
    .split("@")[0]
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) redirect("/");

  const payload = decodeJwt(token);
  if (!payload) redirect("/");

  return (
    <DashboardShell
      user={{
        email: payload.email,
        name: nameFromEmail(payload.email),
        last_sync_at: null, // fetched lazily by the header after mount
      }}
    >
      {children}
    </DashboardShell>
  );
}
