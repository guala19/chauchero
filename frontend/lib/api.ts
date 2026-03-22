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

// ─── JWT helper ──────────────────────────────────────────────────────────────

/** Extract user ID from JWT without verification (server-side only). */
export function getUserIdFromToken(token: string): string {
  try {
    const part = token.split(".")[1];
    if (!part) return "unknown";
    const json = Buffer.from(part, "base64url").toString("utf-8");
    const payload = JSON.parse(json);
    return payload.sub ?? "unknown";
  } catch {
    return "unknown";
  }
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
  rut: string;
  email: string;
  first_name: string;
  last_name: string;
  email_verified: boolean;
  last_sync_at: string | null;
  created_at: string;
}

// ─── API functions ───────────────────────────────────────────────────────────
// These throw on HTTP errors so Next.js error boundaries can catch them.
// Cache is per-user: userId in the URL differentiates cache keys,
// and per-user tags allow targeted revalidation after sync.

export interface PaginatedResponse<T> {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
}

export async function fetchTransactions(
  token: string,
  limit = 500,
): Promise<ApiTransaction[]> {
  const uid = getUserIdFromToken(token);
  const res = await fetch(`${API_URL}/transactions/?limit=${limit}&_uid=${uid}`, {
    next: { tags: [`transactions:${uid}`], revalidate: 300 },
    signal: AbortSignal.timeout(8000),
    headers: { Authorization: `Bearer ${token}` },
  });
  await throwIfNotOk(res);
  const data: PaginatedResponse<ApiTransaction> = await res.json();
  return data.items;
}

export async function fetchUser(token: string): Promise<ApiUser | null> {
  const uid = getUserIdFromToken(token);
  const res = await fetch(`${API_URL}/auth/me?_uid=${uid}`, {
    next: { tags: [`user:${uid}`], revalidate: 600 },
    signal: AbortSignal.timeout(5000),
    headers: { Authorization: `Bearer ${token}` },
  });
  await throwIfNotOk(res);
  const data = await res.json();
  return data.user;
}

export async function fetchTransactionCount(token: string): Promise<number> {
  const uid = getUserIdFromToken(token);
  const res = await fetch(`${API_URL}/transactions/?limit=1&_uid=${uid}`, {
    next: { tags: [`transactions:${uid}`], revalidate: 300 },
    signal: AbortSignal.timeout(5000),
    headers: { Authorization: `Bearer ${token}` },
  });
  await throwIfNotOk(res);
  const totalHeader = res.headers.get("x-total-count");
  if (totalHeader) return parseInt(totalHeader, 10);
  const data = await res.json();
  return Array.isArray(data) ? data.length : 0;
}
