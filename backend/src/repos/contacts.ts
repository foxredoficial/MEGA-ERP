import { getTenantPool } from "../db_tenant.js";
import { randomUUID } from "crypto";
import { RowDataPacket } from "mysql2";

export interface Contact {
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
  
  created_at: Date;
  updated_at: Date;
}

export type ContactInput = Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'user_id'>;

export async function listContacts(userId: string, args?: { contactType?: "cliente" | "fornecedor" }) {
  const pool = await getTenantPool(userId);
  const where: string[] = ["user_id = ?"];
  const params: any[] = [userId];

  if (args?.contactType === "fornecedor") {
    where.push("contact_type = ?");
    params.push("fornecedor");
  }

  if (args?.contactType === "cliente") {
    where.push("(contact_type IS NULL OR contact_type = ?)");
    params.push("cliente");
  }

  const [rows] = await pool.query<(Contact & RowDataPacket)[]>(
    `SELECT * FROM contacts WHERE ${where.join(" AND ")} ORDER BY name ASC`,
    params
  );
  return rows;
}

export async function getContact(userId: string, id: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<(Contact & RowDataPacket)[]>(
    "SELECT * FROM contacts WHERE user_id = ? AND id = ?",
    [userId, id]
  );
  return rows[0] || null;
}

export async function createContact(userId: string, data: ContactInput) {
  const pool = await getTenantPool(userId);
  const id = randomUUID();
  const now = new Date();
  
  await pool.query(
    `INSERT INTO contacts (
      id, user_id, name, fantasy_name, code, type, cpf_cnpj, rg_ie, contributor_type, date_since,
      address_zip, address_street, address_number, address_complement, address_neighborhood, address_city, address_state,
      address_billing_zip, address_billing_street, address_billing_number, address_billing_complement, address_billing_neighborhood, address_billing_city, address_billing_state,
      phone, fax, mobile, email, website, skype, contacts_json,
      avg_load, marital_status, profession, gender, birth_date, naturalness, parents_json, contact_type, status, seller, operation_nature,
      credit_limit, credit_limit_type, payment_condition, category_id,
      observations, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, userId, data.name, data.fantasy_name, data.code, data.type, data.cpf_cnpj, data.rg_ie, data.contributor_type, data.date_since,
      data.address_zip, data.address_street, data.address_number, data.address_complement, data.address_neighborhood, data.address_city, data.address_state,
      data.address_billing_zip, data.address_billing_street, data.address_billing_number, data.address_billing_complement, data.address_billing_neighborhood, data.address_billing_city, data.address_billing_state,
      data.phone, data.fax, data.mobile, data.email, data.website, data.skype, JSON.stringify(data.contacts_json),
      data.avg_load, data.marital_status, data.profession, data.gender, data.birth_date, data.naturalness, JSON.stringify(data.parents_json), data.contact_type, data.status, data.seller, data.operation_nature,
      data.credit_limit, data.credit_limit_type, data.payment_condition, data.category_id,
      data.observations, now, now
    ]
  );
  
  return id;
}

export async function updateContact(userId: string, id: string, data: Partial<ContactInput>) {
  const pool = await getTenantPool(userId);
  const keys = Object.keys(data).filter(k => k !== 'id' && k !== 'user_id' && k !== 'created_at' && k !== 'updated_at');
  if (keys.length === 0) return;
  
  const setClause = keys.map(k => `${k} = ?`).join(", ");
  const values = keys.map(k => {
    const val = (data as any)[k];
    if ((k === 'contacts_json' || k === 'parents_json') && val) return JSON.stringify(val);
    return val;
  });
  
  values.push(now(), userId, id);
  
  await pool.query(
    `UPDATE contacts SET ${setClause}, updated_at = ? WHERE user_id = ? AND id = ?`,
    values
  );
}

export async function deleteContact(userId: string, id: string) {
  const pool = await getTenantPool(userId);
  await pool.query("DELETE FROM contacts WHERE user_id = ? AND id = ?", [userId, id]);
}

function now() {
  return new Date();
}
