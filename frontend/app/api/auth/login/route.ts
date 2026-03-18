import { NextResponse } from "next/server";

/**
 * Unauthenticated proxy for /auth/google/login.
 *
 * The browser calls this route instead of the backend directly, which:
 * 1. Avoids CORS preflight (same-origin request)
 * 2. Avoids macOS IPv6 localhost resolution delay (uses 127.0.0.1)
 * 3. Keeps the backend URL private from the client
 */

const BACKEND_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/google/login`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { detail: body || `Backend returned ${res.status}` },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach backend";
    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
