
import { apiFetch } from "./api";

export interface PriceListItem {
  id: string;
  price_list_id: string;
  product_id: string;
  price: number | null;
  product_name?: string;
  product_sku?: string;
  original_price?: number;
}

export interface PriceList {
  id: string;
  name: string;
  type: 'percentage' | 'fixed_value' | 'custom';
  adjustment_type: 'increase' | 'decrease' | null;
  adjustment_value: number | null;
  start_date: string | null;
  end_date: string | null;
  status: 'active' | 'inactive';
  items?: PriceListItem[];
  created_at: string;
  updated_at: string;
}

export interface PriceListInput {
  name: string;
  type: 'percentage' | 'fixed_value' | 'custom';
  adjustment_type?: 'increase' | 'decrease' | null;
  adjustment_value?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status: 'active' | 'inactive';
  items?: { product_id: string; price?: number }[];
}

export async function getPriceLists() {
  const res = await apiFetch<{ lists: PriceList[] }>("/api/price-lists", { method: "GET" });
  return res.lists;
}

export async function getPriceList(id: string) {
  const res = await apiFetch<{ list: PriceList }>(`/api/price-lists/${id}`, { method: "GET" });
  return res.list;
}

export async function createPriceList(data: PriceListInput) {
  const res = await apiFetch<{ id: string }>("/api/price-lists", {
    method: "POST",
    body: JSON.stringify(data)
  });
  return res.id;
}

export async function updatePriceList(id: string, data: Partial<PriceListInput>) {
  await apiFetch(`/api/price-lists/${id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export async function deletePriceList(id: string) {
  await apiFetch(`/api/price-lists/${id}`, {
    method: "DELETE"
  });
}
