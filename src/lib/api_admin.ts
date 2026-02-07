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

export async function getAdminStats() {
  return apiFetch<AdminStats>("/api/admin/stats");
}

export async function getAdminUsers() {
  return apiFetch<AdminUser[]>("/api/admin/users");
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

export async function getAdminPlans() {
  return apiFetch<AdminPlan[]>("/api/admin/plans");
}

export type CreatePlanData = {
  name: string;
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

export async function getAdminSubscriptions() {
  return apiFetch<AdminSubscription[]>("/api/admin/subscriptions");
}
