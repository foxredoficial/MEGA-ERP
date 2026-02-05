import { getTenantPool } from "../db_tenant.js";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";

export type Category = {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  description: string | null;
  color: string | null;
  created_at: Date;
  updated_at: Date;
};

export async function createCategory(userId: string, data: Partial<Category>) {
  const pool = await getTenantPool(userId);
  const id = randomUUID();
  const now = new Date();

  await pool.query(
    `INSERT INTO categories (
      id, user_id, name, parent_id, description, color, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      data.name,
      data.parent_id || null,
      data.description || null,
      data.color || null,
      now,
      now,
    ]
  );

  return id;
}

export async function listCategories(userId: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<(Category & RowDataPacket)[]>(
    "SELECT * FROM categories WHERE user_id = ? ORDER BY name ASC",
    [userId]
  );
  return rows;
}

export async function getCategory(userId: string, categoryId: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<(Category & RowDataPacket)[]>(
    "SELECT * FROM categories WHERE user_id = ? AND id = ?",
    [userId, categoryId]
  );
  return rows[0] || null;
}

export async function updateCategory(userId: string, categoryId: string, data: Partial<Category>) {
  const pool = await getTenantPool(userId);
  const now = new Date();
  
  const fields: string[] = [];
  const values: any[] = [];

  const allowList = ['name', 'parent_id', 'description', 'color'];

  for (const key of allowList) {
    if (data[key as keyof Category] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(data[key as keyof Category]);
    }
  }

  if (fields.length === 0) return;

  fields.push("updated_at = ?");
  values.push(now);

  values.push(userId);
  values.push(categoryId);

  await pool.query(
    `UPDATE categories SET ${fields.join(", ")} WHERE user_id = ? AND id = ?`,
    values
  );
}

export async function deleteCategory(userId: string, categoryId: string) {
  const pool = await getTenantPool(userId);
  // Optional: check if there are subcategories or products linked
  await pool.query("DELETE FROM categories WHERE user_id = ? AND id = ?", [userId, categoryId]);
}
