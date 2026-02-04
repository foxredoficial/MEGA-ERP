import { apiFetch } from "./api";

export type Product = {
  id: string;
  user_id: string;
  name: string;
  sku: string | null;
  price: number;
  cost_price: number;
  unit: string;
  format: 'simple' | 'variation';
  type: 'product' | 'service';
  condition_type: 'new' | 'used' | 'not_specified';
  category_id: string | null;
  brand: string | null;
  weight_net: number | null;
  weight_gross: number | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  volumes: number | null;
  items_per_box: number | null;
  gtin: string | null;
  gtin_tax: string | null;
  description_short: string | null;
  description_complementary: string | null;
  image_url: string | null;
  video_url: string | null;
  external_link: string | null;
  observations: string | null;
  stock: number;
  stock_min: number;
  stock_max: number;
  crossdocking: number;
  location: string | null;
  ncm: string | null;
  cest: string | null;
  origin: string | null;
  item_type: string | null;
  parent_id: string | null;
  has_lot_control?: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductInput = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'user_id'>;

export async function getProducts() {
  return apiFetch<{ products: Product[] }>("/api/products").then(r => r.products);
}

export async function getProduct(id: string) {
  return apiFetch<{ product: Product }>(`/api/products/${id}`).then(r => r.product);
}

export async function getProductVariations(id: string) {
  return apiFetch<{ variations: Product[] }>(`/api/products/${id}/variations`).then(r => r.variations);
}

export async function createProduct(data: Partial<ProductInput>) {
  return apiFetch<{ id: string }>("/api/products", {
    method: "POST",
    body: JSON.stringify(data),
  }).then(r => r.id);
}

export async function updateProduct(id: string, data: Partial<ProductInput>) {
  return apiFetch<{ success: boolean }>(`/api/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteProduct(id: string) {
  return apiFetch<{ success: boolean }>(`/api/products/${id}`, {
    method: "DELETE",
  });
}

// Stock Types and Functions
export type StockMovementType = 'in' | 'out' | 'adjustment';

export type StockMovement = {
  id: string;
  product_id: string;
  user_id: string;
  type: StockMovementType;
  quantity: number;
  reason: string | null;
  created_at: string;
  user_name?: string;
};

export async function getStockHistory(productId: string) {
  return apiFetch<{ history: StockMovement[] }>(`/api/products/${productId}/stock`).then(r => r.history);
}

export async function addStockMovement(
  productId: string, 
  data: { type: StockMovementType; quantity: number; reason?: string }
) {
  return apiFetch<{ id: string }>(`/api/products/${productId}/stock`, {
    method: "POST",
    body: JSON.stringify(data),
  }).then(r => r.id);
}
