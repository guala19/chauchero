"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

/**
 * Fallback callback handler.
 *
 * The middleware at middleware.ts handles /auth/callback by setting the
 * httpOnly cookie and redirecting to /dashboard — so this page should
 * rarely render. It exists as a safety net in case middleware doesn't
 * intercept (e.g. static export, edge runtime mismatch).
 */

function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const token = params.get("token");
    const error = params.get("error");

    if (error || !token) {
      router.replace(`/?error=${error ?? "missing_token"}`);
      return;
    }

    // Middleware should have already set the httpOnly cookie and redirected.
    // If we got here, just redirect to dashboard — the middleware will
    // handle the cookie on the next request cycle.
    router.replace("/dashboard");
  }, [params, router]);

  return (
    <div className="min-h-dvh bg-[var(--bg-base)] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="size-12 rounded-full bg-[var(--blue)]/20 flex items-center justify-center mx-auto">
          <svg className="size-6 animate-spin text-[var(--blue)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
        <p className="text-sm text-[var(--text-muted)]">Conectando tu cuenta…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-[var(--bg-base)] flex items-center justify-center">
          <p className="text-sm text-[var(--text-muted)]">Cargando…</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
