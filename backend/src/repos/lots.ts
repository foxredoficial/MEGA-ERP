import { getTenantPool } from "../db_tenant.js";
import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";

export type ProductLot = {
  id: string;
  product_id: string;
  code: string;
  manufacturing_date: string | null;
  expiration_date: string | null;
  observations: string | null;
  stock: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

export async function createLot(userId: string, data: {
  product_id: string;
  code: string;
  manufacturing_date?: string | null;
  expiration_date?: string | null;
  observations?: string | null;
}) {
  const pool = await getTenantPool(userId);
  const id = randomUUID();
  const now = new Date();

  await pool.query(
    `INSERT INTO product_lots (
      id, product_id, code, manufacturing_date, expiration_date, 
      observations, stock, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`,
    [
      id,
      data.product_id,
      data.code,
      data.manufacturing_date || null,
      data.expiration_date || null,
      data.observations || null,
      now,
      now
    ]
  );

  return id;
}

export async function updateLot(userId: string, id: string, data: Partial<ProductLot>) {
  const pool = await getTenantPool(userId);
  const now = new Date();
  const fields: string[] = [];
  const values: any[] = [];

  const allowList = ['code', 'manufacturing_date', 'expiration_date', 'observations', 'is_active'];

  for (const key of allowList) {
    if (data[key as keyof ProductLot] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(data[key as keyof ProductLot]);
    }
  }

  if (fields.length === 0) return;

  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);

  await pool.query(
    `UPDATE product_lots SET ${fields.join(", ")} WHERE id = ?`,
    values
  );
}

export async function listLots(userId: string, product_id: string, includeInactive = false) {
  const pool = await getTenantPool(userId);
  let query = "SELECT * FROM product_lots WHERE product_id = ?";
  const params: any[] = [product_id];

  if (!includeInactive) {
    query += " AND is_active = 1";
  }

  query += " ORDER BY created_at DESC";

  const [rows] = await pool.query<(ProductLot & RowDataPacket)[]>(query, params);
  return rows;
}

export async function getLot(userId: string, id: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<(ProductLot & RowDataPacket)[]>(
    "SELECT * FROM product_lots WHERE id = ?",
    [id]
  );
  return rows[0] || null;
}

export async function deleteLot(userId: string, id: string) {
  const pool = await getTenantPool(userId);
  // Check if lot has movements
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM stock_movements WHERE lot_id = ? LIMIT 1",
    [id]
  );

  if (rows.length > 0) {
    // Has movements, soft delete (deactivate)
    await pool.query("UPDATE product_lots SET is_active = 0 WHERE id = ?", [id]);
    return { action: 'deactivated' };
  } else {
    // No movements, hard delete
    await pool.query("DELETE FROM product_lots WHERE id = ?", [id]);
    return { action: 'deleted' };
  }
}
