import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginButton from "@/components/auth/LoginButton";
import InviteGate from "@/components/auth/InviteGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Zap, Gift } from "lucide-react";

export default async function RootPage() {
  const token = (await cookies()).get("auth-token")?.value;
  if (token) {
    try {
      const part = token.split(".")[1];
      if (part) {
        const payload = JSON.parse(Buffer.from(part, "base64url").toString("utf-8"));
        if (payload.exp && Date.now() / 1000 <= payload.exp) {
          redirect("/dashboard");
        }
      }
    } catch (e) {
      if (e && typeof e === "object" && "digest" in e) throw e;
    }
  }

  return (
    <InviteGate>
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

          {/* Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Conecta tu Gmail</CardTitle>
              <CardDescription className="text-[13px] leading-relaxed">
                Analizamos tus correos de Banco de Chile para extraer tus transacciones
                automáticamente. Solo lectura, nunca modificamos nada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <LoginButton />
              <p className="text-[11px] text-muted-foreground">
                Solo se accede a correos de notificaciones bancarias.
              </p>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { icon: Lock,  label: "Solo lectura" },
              { icon: Zap,   label: "Automatico" },
              { icon: Gift,  label: "Gratis" },
            ].map(({ icon: Icon, label }) => (
              <Card key={label} className="p-3">
                <div className="flex flex-col items-center gap-1.5">
                  <Icon className="size-4 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </InviteGate>
  );
}
