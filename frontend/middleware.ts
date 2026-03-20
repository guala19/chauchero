import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

const BACKEND_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:8000";

// ── Helpers ──────────────────────────────────────────────────────────────────

function decodeJwtPayload(token: string): { sub: string; email: string; exp: number } | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    // base64url → base64 + padding
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function setCookies(response: NextResponse, token: string) {
  response.cookies.set("auth-token", token, {
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
}

// ── Middleware ────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  try {
    return await handleRequest(request);
  } catch {
    // Never let middleware crash — pass through on any unexpected error
    return NextResponse.next();
  }
}

async function handleRequest(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // ── Auth callback — set cookie and redirect ────────────────────────────
  if (pathname === "/auth/callback") {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error || !token) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = `?error=${error ?? "missing_token"}`;
      return NextResponse.redirect(url);
    }

    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    const response = NextResponse.redirect(url);
    setCookies(response, token);
    return response;
  }

  // ── Dashboard routes — proactive token refresh ─────────────────────────
  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const payload = decodeJwtPayload(token);
    if (!payload?.exp) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const now = Date.now() / 1000;
    const expiresIn = payload.exp - now;

    // Token is still valid and has > 10 minutes left — pass through
    if (expiresIn > 600) {
      return NextResponse.next();
    }

    // Token expired more than 24h ago — force re-login
    if (expiresIn < -(24 * 60 * 60)) {
      const response = NextResponse.redirect(new URL("/", request.url));
      response.cookies.delete("auth-token");
      response.cookies.delete("ch-session");
      return response;
    }

    // Token is near-expiry (< 10 min) or recently expired — try refresh
    try {
      const endpoint = expiresIn <= 0
        ? `${BACKEND_URL}/auth/refresh-expired`
        : `${BACKEND_URL}/auth/refresh`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const response = NextResponse.next();
        setCookies(response, data.access_token);
        return response;
      }
    } catch {
      // Refresh failed — graceful degradation
    }

    // If token is still valid (just near-expiry), let it through
    if (expiresIn > 0) {
      return NextResponse.next();
    }

    // Token expired and refresh failed — force re-login
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete("auth-token");
    response.cookies.delete("ch-session");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/auth/callback", "/dashboard/:path*"],
};
