import { apiFetch } from "./api";

export type BankAccount = {
  id: string;
  name: string;
  bank: string | null;
  agency: string | null;
  accountNumber: string | null;
  initialBalance: number;
  balance: number;
  createdAt: string;
  updatedAt: string;
};

export type BankTransaction = {
  id: string;
  accountId: string;
  type: "in" | "out";
  amount: number;
  description: string;
  occurredAt: string;
  matchedRefType: string | null;
  matchedRefId: string | null;
  createdAt: string;
};

export async function listBankAccounts() {
  const data = await apiFetch<{ accounts: BankAccount[] }>("/api/banks/accounts", { method: "GET" });
  return data.accounts;
}

export async function getBankAccount(id: string) {
  const data = await apiFetch<{ account: BankAccount }>(`/api/banks/accounts/${id}`, { method: "GET" });
  return data.account;
}

export async function createBankAccount(input: {
  name: string;
  bank?: string | null;
  agency?: string | null;
  accountNumber?: string | null;
  initialBalance: number;
}) {
  const data = await apiFetch<{ account: BankAccount }>("/api/banks/accounts", { method: "POST", body: JSON.stringify(input) });
  return data.account;
}

export async function updateBankAccount(id: string, input: {
  name: string;
  bank?: string | null;
  agency?: string | null;
  accountNumber?: string | null;
}) {
  const data = await apiFetch<{ account: BankAccount }>(`/api/banks/accounts/${id}`, { method: "PUT", body: JSON.stringify(input) });
  return data.account;
}

export async function deleteBankAccount(id: string) {
  await apiFetch<void>(`/api/banks/accounts/${id}`, { method: "DELETE" });
}

export async function listBankTransactions(accountId: string) {
  const data = await apiFetch<{ transactions: BankTransaction[] }>(`/api/banks/accounts/${accountId}/transactions`, { method: "GET" });
  return data.transactions;
}

export async function addBankTransaction(accountId: string, input: { type: "in" | "out"; amount: number; description: string; occurredAt: string }) {
  const data = await apiFetch<{ id: string }>(`/api/banks/accounts/${accountId}/transactions`, { method: "POST", body: JSON.stringify(input) });
  return data.id;
}

