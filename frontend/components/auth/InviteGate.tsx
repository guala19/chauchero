"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound } from "lucide-react";

const COOKIE_NAME = "ch-invite";
const INVITE_CODE = "2119";

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export default function InviteGate({ children }: { children: React.ReactNode }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    setVerified(getCookie(COOKIE_NAME) === "1");
  }, []);

  // Still checking cookie
  if (verified === null) return null;

  // Already verified — show children (login screen)
  if (verified) return <>{children}</>;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim() === INVITE_CODE) {
      setCookie(COOKIE_NAME, "1", 365);
      setVerified(true);
      setError("");
    } else {
      setError("Código incorrecto");
      setCode("");
    }
  }

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Logo */}
        <div className="space-y-3">
          <div className="size-14 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
            <span className="text-primary-foreground text-2xl font-bold font-mono">₡</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Chauchero
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Tu dinero, claro.
            </p>
          </div>
        </div>

        {/* Invite Code Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <KeyRound className="size-4" />
              <p className="text-sm font-medium">Acceso por invitacion</p>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Chauchero esta en beta privada. Ingresa tu codigo de invitacion para continuar.
            </p>
          </div>

          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="Codigo de invitacion"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError("");
            }}
            className="text-center text-lg tracking-[0.3em] font-mono"
            autoFocus
          />

          {error && (
            <p className="text-[12px] text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={code.trim().length === 0}>
            Ingresar
          </Button>
        </form>
      </div>
    </div>
  );
}
