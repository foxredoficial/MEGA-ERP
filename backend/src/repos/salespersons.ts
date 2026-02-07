import { getTenantPool } from "../db_tenant.js";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";

export type Salesperson = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  commission_rate: number | null;
  status: "active" | "inactive";
  observations: string | null;
  created_at: Date;
  updated_at: Date;
};

export async function createSalesperson(userId: string, data: Partial<Salesperson>) {
  const pool = await getTenantPool(userId);
  const id = randomUUID();
  const now = new Date();

  await pool.query(
    `INSERT INTO salespersons (
      id, user_id, name, email, phone, cpf, commission_rate, status, observations, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      data.name,
      data.email ?? null,
      data.phone ?? null,
      data.cpf ?? null,
      data.commission_rate ?? null,
      data.status ?? "active",
      data.observations ?? null,
      now,
      now,
    ]
  );

  return id;
}

export async function listSalespersons(userId: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<(Salesperson & RowDataPacket)[]>(
    "SELECT * FROM salespersons WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return rows;
}

export async function getSalesperson(userId: string, id: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<(Salesperson & RowDataPacket)[]>(
    "SELECT * FROM salespersons WHERE user_id = ? AND id = ?",
    [userId, id]
  );
  return rows[0] || null;
}

export async function updateSalesperson(userId: string, id: string, data: Partial<Salesperson>) {
  const pool = await getTenantPool(userId);
  const now = new Date();

  const fields: string[] = [];
  const values: any[] = [];

  const allowList = ["name", "email", "phone", "cpf", "commission_rate", "status", "observations"];

  for (const key of allowList) {
    if (data[key as keyof Salesperson] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(data[key as keyof Salesperson]);
    }
  }

  if (fields.length === 0) return;

  fields.push("updated_at = ?");
  values.push(now);
  values.push(userId);
  values.push(id);

  await pool.query(`UPDATE salespersons SET ${fields.join(", ")} WHERE user_id = ? AND id = ?`, values);
}

export async function deleteSalesperson(userId: string, id: string) {
  const pool = await getTenantPool(userId);
  await pool.query("DELETE FROM salespersons WHERE user_id = ? AND id = ?", [userId, id]);
}

