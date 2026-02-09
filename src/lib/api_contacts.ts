import { apiFetch } from "./api";

export type Contact = {
  id: string;
  user_id: string;
  name: string;
  fantasy_name: string | null;
  code: string | null;
  type: 'fisica' | 'juridica';
  cpf_cnpj: string | null;
  rg_ie: string | null;
  contributor_type: number | null;
  date_since: string | null;
  
  address_zip: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  
  address_billing_zip: string | null;
  address_billing_street: string | null;
  address_billing_number: string | null;
  address_billing_complement: string | null;
  address_billing_neighborhood: string | null;
  address_billing_city: string | null;
  address_billing_state: string | null;
  
  phone: string | null;
  fax: string | null;
  mobile: string | null;
  email: string | null;
  website: string | null;
  skype: string | null;
  contacts_json: any | null;
  
  avg_load: number | null;
  marital_status: string | null;
  profession: string | null;
  gender: 'masculino' | 'feminino' | 'outro' | null;
  birth_date: string | null;
  naturalness: string | null;
  parents_json: any | null;
  contact_type: string | null;
  status: 'ativo' | 'inativo' | 'sem_movimento';
  seller: string | null;
  operation_nature: string | null;
  
  credit_limit: number | null;
  credit_limit_type: 'limitado' | 'ilimitado' | 'zero';
  payment_condition: string | null;
  category_id: string | null;
  
  observations: string | null;
  
  created_at: string;
  updated_at: string;
};

export type ContactType = "cliente" | "fornecedor";

export type ContactInput = Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'user_id'>;

export async function getContacts(args?: { contactType?: ContactType }) {
  const params = new URLSearchParams();
  if (args?.contactType) params.set("contactType", args.contactType);
  const qs = params.toString();
  const url = qs ? `/api/contacts?${qs}` : "/api/contacts";
  return apiFetch<{ contacts: Contact[] }>(url).then((r) => r.contacts);
}

export async function getContact(id: string) {
  return apiFetch<{ contact: Contact }>(`/api/contacts/${id}`).then(r => r.contact);
}

export async function createContact(data: Partial<ContactInput>) {
  return apiFetch<{ id: string }>("/api/contacts", {
    method: "POST",
    body: JSON.stringify(data),
  }).then(r => r.id);
}

export async function updateContact(id: string, data: Partial<ContactInput>) {
  return apiFetch<{ success: boolean }>(`/api/contacts/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteContact(id: string) {
  return apiFetch<{ success: boolean }>(`/api/contacts/${id}`, {
    method: "DELETE",
  });
}
