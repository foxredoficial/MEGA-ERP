import { apiFetch } from "./api";

export type GlobalSearchResults = {
  products?: Array<{ id: string; name: string; sku: string | null; type: "product" | "service" }>;
  contacts?: Array<{ id: string; name: string; fantasy_name: string | null; cpf_cnpj: string | null; email: string | null; contact_type: string | null }>;
  salesOrders?: Array<{ id: string; number: string; customer_name: string; status: string; date: string }>;
  serviceOrders?: Array<{ id: string; number: string; customer_name: string; status: string; date: string }>;
  documents?: Array<{ id: string; type: string; number: string; party_name: string | null; status: string; date: string }>;
};

export async function globalSearch(q: string) {
  return apiFetch<{ q: string; results: GlobalSearchResults }>(`/api/search?q=${encodeURIComponent(q)}`);
}

