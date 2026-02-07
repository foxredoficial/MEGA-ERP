import { apiFetch } from "./api";

export type ServiceOrderStatus = "open" | "in_progress" | "completed" | "canceled";

export type ServiceOrder = {
  id: string;
  number: string;
  customerId: string | null;
  customerName: string;
  date: string;
  status: ServiceOrderStatus;
  description: string;
  totalCents: number;
  createdAt: string;
  updatedAt: string;
};

export async function listServiceOrders(filter?: { query?: string; status?: ServiceOrderStatus }) {
  const params = new URLSearchParams();
  if (filter?.query) params.set("query", filter.query);
  if (filter?.status) params.set("status", filter.status);
  const qs = params.toString();
  const data = await apiFetch<{ orders: ServiceOrder[] }>(`/api/service-orders${qs ? `?${qs}` : ""}`, {
    method: "GET",
  });
  return data.orders;
}

export async function getServiceOrder(id: string) {
  const data = await apiFetch<{ order: ServiceOrder }>(`/api/service-orders/${id}`, { method: "GET" });
  return data.order;
}

export async function upsertServiceOrder(input: {
  id?: string;
  customerId?: string | null;
  customerName: string;
  date: string;
  status: ServiceOrderStatus;
  description: string;
  totalCents: number;
}) {
  if (input.id) {
    const data = await apiFetch<{ order: ServiceOrder }>(`/api/service-orders/${input.id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    return data.order;
  }
  const data = await apiFetch<{ order: ServiceOrder }>("/api/service-orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.order;
}

