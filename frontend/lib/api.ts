// Server-side: prefer 127.0.0.1 to avoid macOS IPv6 resolution delay on localhost
const API_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:8000";

// ─── Error class ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return;
  const body = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
  throw new ApiError(res.status, body.detail ?? `HTTP ${res.status}`);
}

// ─── Types ───────────────────────────────────────────────────────────────────

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

export interface ApiUser {
  id: string;
  email: string;
  last_sync_at: string | null;
  created_at: string;
}

// ─── API functions ───────────────────────────────────────────────────────────
// These throw on HTTP errors so Next.js error boundaries can catch them.

export async function fetchTransactions(
  token: string,
  limit = 500,
): Promise<ApiTransaction[]> {
  const res = await fetch(`${API_URL}/transactions/?limit=${limit}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
    headers: { Authorization: `Bearer ${token}` },
  });
  await throwIfNotOk(res);
  return res.json();
}

export async function fetchUser(token: string): Promise<ApiUser | null> {
  const res = await fetch(`${API_URL}/auth/me`, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
    headers: { Authorization: `Bearer ${token}` },
  });
  await throwIfNotOk(res);
  const data = await res.json();
  return data.user;
}

export async function fetchTransactionCount(token: string): Promise<number> {
  const res = await fetch(`${API_URL}/transactions/?limit=1`, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
    headers: { Authorization: `Bearer ${token}` },
  });
  await throwIfNotOk(res);
  const totalHeader = res.headers.get("x-total-count");
  if (totalHeader) return parseInt(totalHeader, 10);
  const data = await res.json();
  return Array.isArray(data) ? data.length : 0;
}
