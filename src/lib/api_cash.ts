import { apiFetch } from "./api";

export type CashSessionStatus = "open" | "closed";
export type CashTransactionType = "in" | "out";

export type CashTransactionCategory =
  | "opening"
  | "closing"
  | "sale"
  | "receipt"
  | "payment"
  | "supply"
  | "bleed"
  | "expense";

export interface CashTransaction {
  id: string;
  sessionId: string;
  type: CashTransactionType;
  category: CashTransactionCategory;
  amount: number;
  description: string;
  paymentMethod: string;
  refId?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt: string;
}

export interface CashSession {
  id: string;
  userId: string;
  userName?: string | null;
  status: CashSessionStatus;
  openingBalance: number;
  closingBalance: number | null;
  openedAt: string;
  closedAt: string | null;
  notes?: string | null;
  transactions: CashTransaction[];
  totalIn: number;
  totalOut: number;
  currentBalance: number;
}

export async function getCashSessions() {
  const data = await apiFetch<{ sessions: CashSession[] }>("/api/cash/sessions", { method: "GET" });
  return data.sessions;
}

export async function getCurrentOpenSession() {
  const data = await apiFetch<{ session: CashSession | null }>("/api/cash/current", { method: "GET" });
  return data.session;
}

export async function openCashSession(openingBalance: number, userId: string, userName: string) {
  const data = await apiFetch<{ session: CashSession }>("/api/cash/sessions", {
    method: "POST",
    body: JSON.stringify({ openingBalance, userId, userName }),
  });
  return data.session;
}

export async function closeCashSession(sessionId: string, closingBalance: number, notes?: string) {
  const data = await apiFetch<{ session: CashSession }>(`/api/cash/sessions/${sessionId}/close`, {
    method: "POST",
    body: JSON.stringify({ closingBalance, notes: notes ?? null }),
  });
  return data.session;
}

export async function addTransaction(
  sessionId: string,
  type: CashTransactionType,
  category: CashTransactionCategory,
  amount: number,
  description: string,
  paymentMethod: string,
  opts?: { refId?: string | null; meta?: Record<string, unknown> | null }
) {
  const data = await apiFetch<{ transaction: CashTransaction }>(`/api/cash/sessions/${sessionId}/transactions`, {
    method: "POST",
    body: JSON.stringify({
      type,
      category,
      amount,
      description,
      paymentMethod,
      refId: opts?.refId ?? null,
      meta: opts?.meta ?? null,
    }),
  });
  return data.transaction;
}

export async function getSessionDetails(sessionId: string) {
  const data = await apiFetch<{ session: CashSession }>(`/api/cash/sessions/${sessionId}`, { method: "GET" });
  return data.session;
}

