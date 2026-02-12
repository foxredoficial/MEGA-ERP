import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { getTenantPool } from "../db_tenant.js";

export type FinCategoryType = "income" | "expense" | "transfer" | "other";

export type FinCategory = {
  id: string;
  name: string;
  type: FinCategoryType;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FinCostCenter = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CoaNature = "revenue" | "expense" | "asset" | "liability" | "equity";

export type FinCoaAccount = {
  id: string;
  code: string;
  name: string;
  nature: CoaNature;
  parentId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

async function insertAudit(
  userId: string,
  actorUserId: string,
  entity: string,
  entityId: string,
  action: string,
  beforeJson: any,
  afterJson: any
) {
  const pool = await getTenantPool(userId);
  await pool.query(
    "INSERT INTO audit_log (id, user_id, actor_user_id, entity, entity_id, action, before_json, after_json) VALUES (?,?,?,?,?,?,?,?)",
    [randomUUID(), userId, actorUserId, entity, entityId, action, beforeJson ? JSON.stringify(beforeJson) : null, afterJson ? JSON.stringify(afterJson) : null]
  );
}

function mapCategoryRow(r: any): FinCategory {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    active: Boolean(r.active),
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function mapCostCenterRow(r: any): FinCostCenter {
  return {
    id: r.id,
    name: r.name,
    active: Boolean(r.active),
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function mapCoaRow(r: any): FinCoaAccount {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    nature: r.nature,
    parentId: r.parent_id ?? null,
    active: Boolean(r.active),
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export async function listFinCategories(userId: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<(RowDataPacket & any)[]>(
    "SELECT * FROM fin_categories WHERE user_id = ? ORDER BY active DESC, name ASC",
    [userId]
  );
  return rows.map(mapCategoryRow);
}

export async function createFinCategory(userId: string, actorUserId: string, input: { name: string; type: FinCategoryType }) {
  const pool = await getTenantPool(userId);
  const id = randomUUID();
  const now = new Date();
  await pool.query(
    "INSERT INTO fin_categories (id, user_id, name, type, active, created_at, updated_at) VALUES (?,?,?,?,1,?,?)",
    [id, userId, input.name.trim(), input.type, now, now]
  );
  await insertAudit(userId, actorUserId, "fin_category", id, "create", null, input);
  const [rows] = await pool.query<(RowDataPacket & any)[]>("SELECT * FROM fin_categories WHERE user_id = ? AND id = ?", [userId, id]);
  return rows[0] ? mapCategoryRow(rows[0]) : null;
}

export async function updateFinCategory(
  userId: string,
  actorUserId: string,
  id: string,
  input: { name: string; type: FinCategoryType; active: boolean }
) {
  const pool = await getTenantPool(userId);
  const [beforeRows] = await pool.query<(RowDataPacket & any)[]>("SELECT * FROM fin_categories WHERE user_id = ? AND id = ?", [userId, id]);
  if (!beforeRows[0]) throw new Error("Categoria não encontrada.");
  const before = mapCategoryRow(beforeRows[0]);
  const now = new Date();
  await pool.query("UPDATE fin_categories SET name = ?, type = ?, active = ?, updated_at = ? WHERE user_id = ? AND id = ?", [
    input.name.trim(),
    input.type,
    input.active ? 1 : 0,
    now,
    userId,
    id,
  ]);
  await insertAudit(userId, actorUserId, "fin_category", id, "update", before, input);
  const [rows] = await pool.query<(RowDataPacket & any)[]>("SELECT * FROM fin_categories WHERE user_id = ? AND id = ?", [userId, id]);
  return rows[0] ? mapCategoryRow(rows[0]) : null;
}

export async function listFinCostCenters(userId: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<(RowDataPacket & any)[]>(
    "SELECT * FROM fin_cost_centers WHERE user_id = ? ORDER BY active DESC, name ASC",
    [userId]
  );
  return rows.map(mapCostCenterRow);
}

export async function createFinCostCenter(userId: string, actorUserId: string, input: { name: string }) {
  const pool = await getTenantPool(userId);
  const id = randomUUID();
  const now = new Date();
  await pool.query(
    "INSERT INTO fin_cost_centers (id, user_id, name, active, created_at, updated_at) VALUES (?,?,?,1,?,?)",
    [id, userId, input.name.trim(), now, now]
  );
  await insertAudit(userId, actorUserId, "fin_cost_center", id, "create", null, input);
  const [rows] = await pool.query<(RowDataPacket & any)[]>("SELECT * FROM fin_cost_centers WHERE user_id = ? AND id = ?", [userId, id]);
  return rows[0] ? mapCostCenterRow(rows[0]) : null;
}

export async function updateFinCostCenter(userId: string, actorUserId: string, id: string, input: { name: string; active: boolean }) {
  const pool = await getTenantPool(userId);
  const [beforeRows] = await pool.query<(RowDataPacket & any)[]>("SELECT * FROM fin_cost_centers WHERE user_id = ? AND id = ?", [userId, id]);
  if (!beforeRows[0]) throw new Error("Centro de custo não encontrado.");
  const before = mapCostCenterRow(beforeRows[0]);
  const now = new Date();
  await pool.query("UPDATE fin_cost_centers SET name = ?, active = ?, updated_at = ? WHERE user_id = ? AND id = ?", [
    input.name.trim(),
    input.active ? 1 : 0,
    now,
    userId,
    id,
  ]);
  await insertAudit(userId, actorUserId, "fin_cost_center", id, "update", before, input);
  const [rows] = await pool.query<(RowDataPacket & any)[]>("SELECT * FROM fin_cost_centers WHERE user_id = ? AND id = ?", [userId, id]);
  return rows[0] ? mapCostCenterRow(rows[0]) : null;
}

export async function listCoaAccounts(userId: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<(RowDataPacket & any)[]>(
    "SELECT * FROM fin_coa_accounts WHERE user_id = ? ORDER BY active DESC, code ASC",
    [userId]
  );
  return rows.map(mapCoaRow);
}

export async function createCoaAccount(
  userId: string,
  actorUserId: string,
  input: { code: string; name: string; nature: CoaNature; parentId?: string | null }
) {
  const pool = await getTenantPool(userId);
  const id = randomUUID();
  const now = new Date();
  await pool.query(
    "INSERT INTO fin_coa_accounts (id, user_id, code, name, nature, parent_id, active, created_at, updated_at) VALUES (?,?,?,?,?,?,1,?,?)",
    [id, userId, input.code.trim(), input.name.trim(), input.nature, input.parentId ?? null, now, now]
  );
  await insertAudit(userId, actorUserId, "fin_coa_account", id, "create", null, input);
  const [rows] = await pool.query<(RowDataPacket & any)[]>("SELECT * FROM fin_coa_accounts WHERE user_id = ? AND id = ?", [userId, id]);
  return rows[0] ? mapCoaRow(rows[0]) : null;
}

export async function updateCoaAccount(
  userId: string,
  actorUserId: string,
  id: string,
  input: { code: string; name: string; nature: CoaNature; parentId?: string | null; active: boolean }
) {
  const pool = await getTenantPool(userId);
  const [beforeRows] = await pool.query<(RowDataPacket & any)[]>("SELECT * FROM fin_coa_accounts WHERE user_id = ? AND id = ?", [userId, id]);
  if (!beforeRows[0]) throw new Error("Conta contábil não encontrada.");
  const before = mapCoaRow(beforeRows[0]);
  const now = new Date();
  await pool.query(
    "UPDATE fin_coa_accounts SET code = ?, name = ?, nature = ?, parent_id = ?, active = ?, updated_at = ? WHERE user_id = ? AND id = ?",
    [input.code.trim(), input.name.trim(), input.nature, input.parentId ?? null, input.active ? 1 : 0, now, userId, id]
  );
  await insertAudit(userId, actorUserId, "fin_coa_account", id, "update", before, input);
  const [rows] = await pool.query<(RowDataPacket & any)[]>("SELECT * FROM fin_coa_accounts WHERE user_id = ? AND id = ?", [userId, id]);
  return rows[0] ? mapCoaRow(rows[0]) : null;
}

