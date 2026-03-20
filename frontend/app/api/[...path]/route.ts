import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Catch-all proxy that forwards client-side requests to the backend,
 * injecting the httpOnly auth-token cookie as an Authorization header.
 *
 * On 401, it attempts to refresh the token via /auth/refresh-expired
 * before returning the error to the client.
 */

const BACKEND_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:8000";

const TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

async function forwardRequest(
  request: NextRequest,
  token: string,
  body: string | undefined,
): Promise<Response> {
  const url = new URL(request.url);
  const backendPath = url.pathname.replace(/^\/api/, "");
  const backendUrl = `${BACKEND_URL}${backendPath}${url.search}`;

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);

  const contentType = request.headers.get("Content-Type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  return fetch(backendUrl, {
    method: request.method,
    headers,
    body,
  });
}

async function proxyRequest(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    return NextResponse.json(
      { detail: "Not authenticated" },
      { status: 401 },
    );
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.text() : undefined;

  const res = await forwardRequest(request, token, body);

  // On 401, try refreshing the expired token before giving up
  if (res.status === 401) {
    try {
      const refreshRes = await fetch(`${BACKEND_URL}/auth/refresh-expired`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newToken: string = refreshData.access_token;

        // Retry the original request with the new token
        const retryRes = await forwardRequest(request, newToken, body);
        const retryData = await retryRes.text();

        const response = new NextResponse(retryData, {
          status: retryRes.status,
          headers: { "Content-Type": retryRes.headers.get("Content-Type") ?? "application/json" },
        });

        // Update the cookie with the new token
        response.cookies.set("auth-token", newToken, {
          path: "/",
          maxAge: TOKEN_MAX_AGE,
          sameSite: "lax",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
        });
        response.cookies.set("ch-session", "1", {
          path: "/",
          maxAge: TOKEN_MAX_AGE,
          sameSite: "lax",
          httpOnly: false,
        });

        return response;
      }
    } catch {
      // Refresh failed — fall through to return original 401
    }
  }

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
