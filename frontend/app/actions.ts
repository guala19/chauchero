"use server";

import { revalidateTag } from "next/cache";

export async function revalidateTransactions(userId: string) {
  revalidateTag(`transactions:${userId}`);
}
