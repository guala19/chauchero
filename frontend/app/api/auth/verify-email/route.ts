import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token") || "";
    const res = await fetch(`${BACKEND_URL}/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reach backend";
    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
