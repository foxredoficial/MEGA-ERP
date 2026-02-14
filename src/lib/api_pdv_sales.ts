import { apiFetch } from "./api";

export type PdvSaleStatus = "completed" | "canceled";

export type PdvSaleItem = {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  discountPerUnit: number;
  lineTotal: number;
  lotId?: string | null;
};

export type PdvSale = {
  id: string;
  cashSessionId: string;
  customerId: string | null;
  customerName: string | null;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  total: number;
  status: PdvSaleStatus;
  items: PdvSaleItem[];
  createdAt: string;
};

export async function listPdvSales(filter?: { query?: string }) {
  const params = new URLSearchParams();
  if (filter?.query) params.set("query", filter.query);
  const qs = params.toString();
  const data = await apiFetch<{ sales: PdvSale[] }>(`/api/pdv/sales${qs ? `?${qs}` : ""}`, { method: "GET" });
  return data.sales;
}

export async function createPdvSale(input: Omit<PdvSale, "id" | "createdAt">, opts?: { id?: string; createdAt?: string }) {
  const data = await apiFetch<{ sale: PdvSale }>("/api/pdv/sales", {
    method: "POST",
    body: JSON.stringify({ ...input, opts }),
  });
  return data.sale;
}
