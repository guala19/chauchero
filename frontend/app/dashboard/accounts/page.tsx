import { cookies } from "next/headers";
import AccountsClient from "@/components/dashboard/AccountsClient";
import { fetchUser, fetchTransactionCount } from "@/lib/api";

export default async function AccountsPage() {
  const token = (await cookies()).get("auth-token")?.value ?? "";
  const [user, txCount] = await Promise.all([
    fetchUser(token),
    fetchTransactionCount(token),
  ]);

  return <AccountsClient user={user} transactionCount={txCount} />;
}
