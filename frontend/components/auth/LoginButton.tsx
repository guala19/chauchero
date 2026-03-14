"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function LoginButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/google/login`);
      if (!res.ok) throw new Error("No se pudo iniciar el proceso de login");
      const { auth_url } = await res.json();
      window.location.href = auth_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-[var(--radius)] bg-white text-gray-800 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed border border-gray-200 shadow-sm"
      >
        {loading ? (
          <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : (
          <svg className="size-4" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
        )}
        {loading ? "Redirigiendo…" : "Continuar con Google"}
      </button>

      {error && (
        <p className="text-[12px] text-[var(--red)] text-center">{error}</p>
      )}
    </div>
  );
}
