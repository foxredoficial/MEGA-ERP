import { apiFetch } from "./api";

export type AdminStats = {
  users: number;
  activeSubscriptions: number;
  recentUsers: Array<{
    id: string;
    full_name: string;
    email: string;
    created_at: string;
  }>;
};

export type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  company_name: string | null;
  role: 'user' | 'admin';
  created_at: string;
};

export type AdminPaged<T> = { items: T[]; page: number; pageSize: number; total: number };

export async function getAdminStats() {
  return apiFetch<AdminStats>("/api/admin/stats");
}

export async function getAdminMercadoPagoConfig() {
  return apiFetch<{
    configured: {
      accessToken: boolean;
      publicKey: boolean;
      webhookBaseUrl: boolean;
      signatureSecret: boolean;
    };
  }>("/api/admin/integrations/mercadopago");
}

export type AdminDashboardAnalytics = {
  kpis: {
    current: {
      totalUsers: number;
      activeSubscriptions: number;
      signups: number;
      subscriptionsStarted: number;
      subscriptionsEnded: number;
    };
    compare: null | {
      totalUsers: number;
      activeSubscriptions: number;
      signups: number;
      subscriptionsStarted: number;
      subscriptionsEnded: number;
    };
  };
  series: {
    signups: Array<{ t: string; current: number; compare: number | null }>;
    subscriptionsStarted: Array<{ t: string; current: number; compare: number | null }>;
    subscriptionsEnded: Array<{ t: string; current: number; compare: number | null }>;
    activeSubscriptions: Array<{ t: string; current: number; compare: number | null }>;
  };
};

export async function getAdminDashboardAnalytics(input: {
  start: string;
  end: string;
  granularity: "day" | "week" | "month";
  compareStart?: string;
  compareEnd?: string;
}) {
  const params = new URLSearchParams();
  params.set("start", input.start);
  params.set("end", input.end);
  params.set("granularity", input.granularity);
  if (input.compareStart && input.compareEnd) {
    params.set("compareStart", input.compareStart);
    params.set("compareEnd", input.compareEnd);
  }
  return apiFetch<AdminDashboardAnalytics>(`/api/admin/analytics/dashboard?${params.toString()}`);
}

export async function getAdminUsers(params?: { page?: number; pageSize?: number; q?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params?.q) qs.set("q", params.q);
  return apiFetch<AdminPaged<AdminUser>>(`/api/admin/users${qs.toString() ? `?${qs.toString()}` : ""}`);
}

export async function updateUserRole(userId: string, role: 'user' | 'admin') {
  return apiFetch<{ success: true }>(`/api/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export type AdminPlan = {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  features_json: string | string[];
  max_users: number;
  max_products: number;
  max_invoices: number;
  is_featured: number | boolean;
  is_active: number | boolean;
};

export async function getAdminPlans(params?: { page?: number; pageSize?: number; q?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params?.q) qs.set("q", params.q);
  return apiFetch<AdminPaged<AdminPlan>>(`/api/admin/plans${qs.toString() ? `?${qs.toString()}` : ""}`);
}

export type CreatePlanData = {
  name: string;
  description?: string;
  price_cents: number;
  features_json: string[];
  max_users?: number;
  max_products?: number;
  max_invoices?: number;
  is_featured?: boolean;
  is_active?: boolean;
};

export async function createPlan(data: CreatePlanData) {
  return apiFetch<{ id: string }>("/api/admin/plans", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePlan(id: string, data: Partial<CreatePlanData>) {
  return apiFetch<{ success: true }>(`/api/admin/plans/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export type AdminSubscription = {
  id: string;
  user_name: string;
  user_email: string;
  plan_name: string;
  status: string;
  started_at: string;
  ended_at: string | null;
};

export async function getAdminSubscriptions(params?: { page?: number; pageSize?: number; q?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params?.q) qs.set("q", params.q);
  if (params?.status) qs.set("status", params.status);
  return apiFetch<AdminPaged<AdminSubscription>>(`/api/admin/subscriptions${qs.toString() ? `?${qs.toString()}` : ""}`);
}
