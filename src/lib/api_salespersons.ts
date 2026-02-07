import { apiFetch } from "./api";

export type Salesperson = {
  id: string;
  user_id?: string;
  name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  commission_rate: number | null; // Percentage
  status: 'active' | 'inactive';
  observations: string | null;
  created_at?: string;
  updated_at?: string;
};

export type SalespersonInput = Omit<Salesperson, 'id' | 'created_at' | 'updated_at' | 'user_id'>;

export async function getSalespersons() {
  return apiFetch<{ salespersons: Salesperson[] }>("/api/salespersons").then(r => r.salespersons);
}

export async function getSalesperson(id: string) {
  return apiFetch<{ salesperson: Salesperson }>(`/api/salespersons/${id}`).then(r => r.salesperson);
}

export async function createSalesperson(data: Partial<SalespersonInput>) {
  return apiFetch<{ id: string }>("/api/salespersons", {
    method: "POST",
    body: JSON.stringify(data),
  }).then(r => r.id);
}

export async function updateSalesperson(id: string, data: Partial<SalespersonInput>) {
  return apiFetch<{ success: boolean }>(`/api/salespersons/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteSalesperson(id: string) {
  return apiFetch<{ success: boolean }>(`/api/salespersons/${id}`, {
    method: "DELETE",
  });
}
