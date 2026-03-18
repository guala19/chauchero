import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Catch-all proxy that forwards client-side requests to the backend,
 * injecting the httpOnly auth-token cookie as an Authorization header.
 *
 * Client components call `/api/transactions/sync` → proxy forwards to
 * `BACKEND_URL/transactions/sync` with `Authorization: Bearer <token>`.
 */

const BACKEND_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:8000";

async function proxyRequest(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    return NextResponse.json(
      { detail: "Not authenticated" },
      { status: 401 },
    );
  }

  // Strip the /api prefix to get the backend path
  const url = new URL(request.url);
  const backendPath = url.pathname.replace(/^\/api/, "");
  const backendUrl = `${BACKEND_URL}${backendPath}${url.search}`;

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);

  const contentType = request.headers.get("Content-Type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  const res = await fetch(backendUrl, {
    method: request.method,
    headers,
    body: hasBody ? await request.text() : undefined,
  });

  const data = await res.text();

  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
