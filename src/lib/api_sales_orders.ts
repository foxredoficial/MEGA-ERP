import { apiFetch } from "./api";

export type SalesOrderStatus = "open" | "billed" | "delivered" | "canceled";

export type SalesOrderItem = {
  id: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
};

export type SalesOrder = {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  date: string;
  status: SalesOrderStatus;
  observations: string;
  items: SalesOrderItem[];
  totals: {
    count: number;
    subtotal: number;
    discount: number;
    total: number;
  };
  createdAt: string;
  updatedAt: string;
};

export async function listSalesOrders() {
  const data = await apiFetch<{ orders: SalesOrder[] }>("/api/sales-orders", { method: "GET" });
  return data.orders;
}

export async function getSalesOrder(id: string) {
  const data = await apiFetch<{ order: SalesOrder }>(`/api/sales-orders/${id}`, { method: "GET" });
  return data.order;
}

export async function upsertSalesOrder(input: {
  id?: string;
  customerId: string;
  customerName: string;
  date: string;
  status: SalesOrderStatus;
  observations: string;
  items: SalesOrderItem[];
}) {
  if (input.id) {
    const data = await apiFetch<{ order: SalesOrder }>(`/api/sales-orders/${input.id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    return data.order;
  }
  const data = await apiFetch<{ order: SalesOrder }>("/api/sales-orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.order;
}

