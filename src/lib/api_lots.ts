import { apiFetch } from "./api";

export type ProductLot = {
  id: string;
  product_id: string;
  code: string;
  manufacturing_date: string | null;
  expiration_date: string | null;
  observations: string | null;
  stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateLotData = {
  code: string;
  manufacturing_date?: string | null;
  expiration_date?: string | null;
  observations?: string | null;
};

export async function getProductLots(productId: string, includeInactive = false) {
  const query = includeInactive ? "?include_inactive=true" : "";
  const response = await apiFetch<{ lots: ProductLot[] }>(`/api/products/${productId}/lots${query}`);
  return response.lots;
}

export async function createProductLot(productId: string, data: CreateLotData) {
  const response = await apiFetch<{ id: string }>(`/api/products/${productId}/lots`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.id;
}

export async function updateProductLot(productId: string, lotId: string, data: Partial<CreateLotData> & { is_active?: boolean }) {
  await apiFetch(`/api/products/${productId}/lots/${lotId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteProductLot(productId: string, lotId: string) {
  const response = await apiFetch<{ action: 'deleted' | 'deactivated' }>(`/api/products/${productId}/lots/${lotId}`, {
    method: "DELETE",
  });
  return response;
}
