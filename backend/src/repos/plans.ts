import { pool } from "../db.js";
import type { RowDataPacket } from "mysql2/promise";
import { randomUUID } from "crypto";

export type PlanRow = {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  features_json: string;
  max_users: number;
  max_products: number;
  max_invoices: number;
  mp_preapproval_plan_id: string | null;
  trial_enabled: number;
  trial_days: number;
  is_featured: number;
  is_active: number;
  created_at: Date;
  updated_at: Date;
};

export async function listAllPlans(): Promise<PlanRow[]> {
  const [rows] = await pool.query<(PlanRow & RowDataPacket)[]>(
    "SELECT * FROM plans ORDER BY is_active DESC, is_featured DESC, price_cents ASC"
  );
  return rows;
}

export async function listActivePlans(): Promise<PlanRow[]> {
  const [rows] = await pool.query<(PlanRow & RowDataPacket)[]>(
    "SELECT id, name, description, price_cents, features_json, max_users, max_products, max_invoices, trial_enabled, trial_days, is_featured, is_active, created_at, updated_at FROM plans WHERE is_active = 1 ORDER BY is_featured DESC, price_cents ASC"
  );
  return rows;
}

export async function findPlanById(id: string): Promise<PlanRow | null> {
  const [rows] = await pool.query<(PlanRow & RowDataPacket)[]>(
    "SELECT id, name, description, price_cents, features_json, max_users, max_products, max_invoices, mp_preapproval_plan_id, trial_enabled, trial_days, is_featured, is_active, created_at, updated_at FROM plans WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] ?? null;
}

export async function createPlan(data: {
  name: string;
  description?: string;
  price_cents: number;
  features_json: string;
  max_users: number;
  max_products: number;
  max_invoices: number;
  mp_preapproval_plan_id?: string | null;
  trial_enabled: boolean;
  trial_days: number;
  is_featured: boolean;
  is_active: boolean;
}): Promise<string> {
  const id = randomUUID();
  await pool.query(
    "INSERT INTO plans (id, name, description, price_cents, features_json, max_users, max_products, max_invoices, mp_preapproval_plan_id, trial_enabled, trial_days, is_featured, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      id,
      data.name,
      data.description || null,
      data.price_cents,
      data.features_json,
      data.max_users || 1,
      data.max_products || 100,
      data.max_invoices || 50,
      data.mp_preapproval_plan_id || null,
      data.trial_enabled ? 1 : 0,
      data.trial_days || 7,
      data.is_featured ? 1 : 0,
      data.is_active ? 1 : 0,
    ]
  );
  return id;
}

export async function updatePlan(id: string, data: {
  name?: string;
  description?: string;
  price_cents?: number;
  features_json?: string;
  max_users?: number;
  max_products?: number;
  max_invoices?: number;
  mp_preapproval_plan_id?: string | null;
  trial_enabled?: boolean;
  trial_days?: number;
  is_featured?: boolean;
  is_active?: boolean;
}): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    values.push(data.name);
  }
  if (data.description !== undefined) {
    fields.push("description = ?");
    values.push(data.description);
  }
  if (data.price_cents !== undefined) {
    fields.push("price_cents = ?");
    values.push(data.price_cents);
  }
  if (data.features_json !== undefined) {
    fields.push("features_json = ?");
    values.push(data.features_json);
  }
  if (data.max_users !== undefined) {
    fields.push("max_users = ?");
    values.push(data.max_users);
  }
  if (data.max_products !== undefined) {
    fields.push("max_products = ?");
    values.push(data.max_products);
  }
  if (data.max_invoices !== undefined) {
    fields.push("max_invoices = ?");
    values.push(data.max_invoices);
  }
  if (data.mp_preapproval_plan_id !== undefined) {
    fields.push("mp_preapproval_plan_id = ?");
    values.push(data.mp_preapproval_plan_id || null);
  }
  if (data.trial_enabled !== undefined) {
    fields.push("trial_enabled = ?");
    values.push(data.trial_enabled ? 1 : 0);
  }
  if (data.trial_days !== undefined) {
    fields.push("trial_days = ?");
    values.push(data.trial_days);
  }
  if (data.is_featured !== undefined) {
    fields.push("is_featured = ?");
    values.push(data.is_featured ? 1 : 0);
  }
  if (data.is_active !== undefined) {
    fields.push("is_active = ?");
    values.push(data.is_active ? 1 : 0);
  }

  if (fields.length === 0) return;

  values.push(id);
  await pool.query(`UPDATE plans SET ${fields.join(", ")} WHERE id = ?`, values);
}
