import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Fast auth callback — set cookie and redirect without client-side hydration
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
    response.cookies.set("auth-token", token, {
      path: "/",
      maxAge: TOKEN_MAX_AGE,
      sameSite: "lax",
      httpOnly: false, // needs to be readable by JS for API calls
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/auth/callback"],
};
