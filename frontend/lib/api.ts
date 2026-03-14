// Server-side: prefer 127.0.0.1 to avoid macOS IPv6 resolution delay on localhost
const API_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:8000";

export interface ApiTransaction {
  id: string;
  account_id: string;
  amount: number;
  transaction_date: string;
  description: string;
  transaction_type: "debit" | "transfer_debit" | "transfer_credit";
  category: string | null;
  email_subject: string | null;
  parser_confidence: number;
  is_validated: boolean;
  notes: string | null;
  created_at: string;
}

export async function fetchTransactions(
  token: string,
  limit = 500,
): Promise<ApiTransaction[]> {
  try {
    const res = await fetch(
      `${API_URL}/transactions/?token=${token}&limit=${limit}`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export interface ApiUser {
  id: string;
  email: string;
  last_sync_at: string | null;
  created_at: string;
}

export async function fetchUser(token: string): Promise<ApiUser | null> {
  try {
    const res = await fetch(`${API_URL}/auth/me?token=${token}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

export async function fetchTransactionCount(token: string): Promise<number> {
  try {
    const res = await fetch(
      `${API_URL}/transactions/?token=${token}&limit=1`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return 0;
    // Check for x-total-count header first (if backend supports it)
    const totalHeader = res.headers.get("x-total-count");
    if (totalHeader) return parseInt(totalHeader, 10);
    // Fallback: fetch all and count (only if no header)
    const data = await res.json();
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}
