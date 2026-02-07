import { apiFetch } from "./api";

export type FinancialTitleKind = "ar" | "ap";
export type FinancialTitleStatus = "open" | "partial" | "paid" | "canceled";
export type FinancialTitleOrigin = "pdv" | "sales_order" | "manual";
export type FinancialPaymentMethod = "money" | "pix" | "credit" | "debit" | "boleto" | "crediario" | "other";

export type FinancialTitle = {
  id: string;
  kind: FinancialTitleKind;
  status: FinancialTitleStatus;
  origin: FinancialTitleOrigin;
  refId: string | null;
  partyId: string | null;
  partyName: string | null;
  description: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  payments: Array<{
    id: string;
    titleId: string;
    amount: number;
    method: FinancialPaymentMethod;
    paidAt: string;
    notes?: string | null;
  }>;
};

export async function listFinancialTitles(filter?: {
  kind?: FinancialTitleKind;
  status?: FinancialTitleStatus;
  query?: string;
}) {
  const params = new URLSearchParams();
  if (filter?.kind) params.set("kind", filter.kind);
  if (filter?.status) params.set("status", filter.status);
  if (filter?.query) params.set("query", filter.query);
  const qs = params.toString();
  const data = await apiFetch<{ titles: FinancialTitle[] }>(`/api/financial/titles${qs ? `?${qs}` : ""}`, {
    method: "GET",
  });
  return data.titles;
}

export async function getFinancialTitle(id: string) {
  const data = await apiFetch<{ title: FinancialTitle }>(`/api/financial/titles/${id}`, { method: "GET" });
  return data.title;
}

export async function createFinancialTitle(input: {
  kind: FinancialTitleKind;
  origin: FinancialTitleOrigin;
  refId?: string | null;
  partyId?: string | null;
  partyName?: string | null;
  description: string;
  amount: number;
  dueDate: string;
}) {
  const data = await apiFetch<{ title: FinancialTitle }>("/api/financial/titles", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.title;
}

export async function registerPayment(args: {
  titleId: string;
  amount: number;
  method: FinancialPaymentMethod;
  paidAt?: string;
  notes?: string | null;
}) {
  const data = await apiFetch<{ title: FinancialTitle }>(`/api/financial/titles/${args.titleId}/payments`, {
    method: "POST",
    body: JSON.stringify({
      amount: args.amount,
      method: args.method,
      paidAt: args.paidAt,
      notes: args.notes ?? null,
    }),
  });
  return data.title;
}

export async function cancelFinancialTitle(id: string) {
  const data = await apiFetch<{ title: FinancialTitle }>(`/api/financial/titles/${id}/cancel`, {
    method: "POST",
  });
  return data.title;
}

export function resolveFinancialMethodFromPos(methodId: string): FinancialPaymentMethod {
  if (methodId === "money") return "money";
  if (methodId === "pix") return "pix";
  if (methodId === "credit") return "credit";
  if (methodId === "debit") return "debit";
  if (methodId === "boleto") return "boleto";
  if (methodId === "crediario") return "crediario";
  return "other";
}

