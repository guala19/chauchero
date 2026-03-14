"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function CallbackHandler() {
  const router     = useRouter();
  const params     = useSearchParams();
  const processed  = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const token = params.get("token");
    const error = params.get("error");

    if (error || !token) {
      router.replace(`/?error=${error ?? "missing_token"}`);
      return;
    }

    // Set auth-token cookie (readable by JS since we need it for API calls)
    document.cookie = `auth-token=${token}; path=/; max-age=${TOKEN_MAX_AGE}; SameSite=Lax`;

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
