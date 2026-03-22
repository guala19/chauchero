import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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

  redirect("/login");
}
