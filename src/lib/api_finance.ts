import { apiFetch } from "./api";

export type FinCategoryType = "income" | "expense" | "transfer" | "other";

export type FinCategory = {
  id: string;
  name: string;
  type: FinCategoryType;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FinCostCenter = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CoaNature = "revenue" | "expense" | "asset" | "liability" | "equity";

export type FinCoaAccount = {
  id: string;
  code: string;
  name: string;
  nature: CoaNature;
  parentId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function listFinCategories() {
  const data = await apiFetch<{ categories: FinCategory[] }>("/api/finance/categories", { method: "GET" });
  return data.categories;
}

export async function createFinCategory(input: { name: string; type: FinCategoryType }) {
  const data = await apiFetch<{ category: FinCategory }>("/api/finance/categories", { method: "POST", body: JSON.stringify(input) });
  return data.category;
}

export async function updateFinCategory(id: string, input: { name: string; type: FinCategoryType; active: boolean }) {
  const data = await apiFetch<{ category: FinCategory }>(`/api/finance/categories/${id}`, { method: "PUT", body: JSON.stringify(input) });
  return data.category;
}

export async function listFinCostCenters() {
  const data = await apiFetch<{ costCenters: FinCostCenter[] }>("/api/finance/cost-centers", { method: "GET" });
  return data.costCenters;
}

export async function createFinCostCenter(input: { name: string }) {
  const data = await apiFetch<{ costCenter: FinCostCenter }>("/api/finance/cost-centers", { method: "POST", body: JSON.stringify(input) });
  return data.costCenter;
}

export async function updateFinCostCenter(id: string, input: { name: string; active: boolean }) {
  const data = await apiFetch<{ costCenter: FinCostCenter }>(`/api/finance/cost-centers/${id}`, { method: "PUT", body: JSON.stringify(input) });
  return data.costCenter;
}

export async function listCoaAccounts() {
  const data = await apiFetch<{ accounts: FinCoaAccount[] }>("/api/finance/coa-accounts", { method: "GET" });
  return data.accounts;
}

export async function createCoaAccount(input: { code: string; name: string; nature: CoaNature; parentId?: string | null }) {
  const data = await apiFetch<{ account: FinCoaAccount }>("/api/finance/coa-accounts", { method: "POST", body: JSON.stringify(input) });
  return data.account;
}

export async function updateCoaAccount(
  id: string,
  input: { code: string; name: string; nature: CoaNature; parentId?: string | null; active: boolean }
) {
  const data = await apiFetch<{ account: FinCoaAccount }>(`/api/finance/coa-accounts/${id}`, { method: "PUT", body: JSON.stringify(input) });
  return data.account;
}

export type CashflowPoint = {
  date: string;
  predictedIn: number;
  predictedOut: number;
  realizedIn: number;
  realizedOut: number;
};

export async function getCashflow(params: { start: string; end: string; accountId?: string; onlyReconciled?: boolean }) {
  const qs = new URLSearchParams({ start: params.start, end: params.end });
  if (params.accountId) qs.set("accountId", params.accountId);
  if (params.onlyReconciled) qs.set("onlyReconciled", "true");
  const data = await apiFetch<{ points: CashflowPoint[] }>(`/api/finance/cashflow?${qs.toString()}`, { method: "GET" });
  return data.points;
}

export type DreRow = {
  coaAccountId: string;
  code: string;
  name: string;
  nature: "revenue" | "expense";
  amount: number;
};

export async function getDre(params: { start: string; end: string; view: "competence" | "cash"; costCenterId?: string }) {
  const qs = new URLSearchParams({ start: params.start, end: params.end, view: params.view });
  if (params.costCenterId) qs.set("costCenterId", params.costCenterId);
  const data = await apiFetch<{ rows: DreRow[]; totals: { revenue: number; expense: number; result: number } }>(
    `/api/finance/dre?${qs.toString()}`,
    { method: "GET" }
  );
  return data;
}

