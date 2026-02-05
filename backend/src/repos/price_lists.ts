
import { getTenantPool } from "../db_tenant.js";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";

export type PriceList = {
  id: string;
  user_id: string;
  name: string;
  type: 'percentage' | 'fixed_value' | 'custom';
  adjustment_type: 'increase' | 'decrease' | null;
  adjustment_value: number | null;
  start_date: Date | null;
  end_date: Date | null;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
};

export type PriceListItem = {
  id: string;
  price_list_id: string;
  product_id: string;
  price: number | null;
  product_name?: string; // For display
  product_sku?: string; // For display
  original_price?: number; // For calculation reference
  created_at: Date;
  updated_at: Date;
};

export type PriceListInput = Omit<PriceList, 'id' | 'user_id' | 'created_at' | 'updated_at'> & {
  items?: { product_id: string; price?: number }[];
};

export async function listPriceLists(userId: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<(PriceList & RowDataPacket)[]>(
    "SELECT * FROM price_lists WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return rows;
}

export async function getPriceList(userId: string, id: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<(PriceList & RowDataPacket)[]>(
    "SELECT * FROM price_lists WHERE user_id = ? AND id = ?",
    [userId, id]
  );
  
  if (!rows[0]) return null;

  const priceList = rows[0];

  // Fetch items with product details
  const [items] = await pool.query<(PriceListItem & RowDataPacket)[]>(
    `SELECT pli.*, p.name as product_name, p.sku as product_sku, p.price as original_price
     FROM price_list_items pli
     JOIN products p ON p.id = pli.product_id
     WHERE pli.price_list_id = ?`,
    [id]
  );

  return { ...priceList, items };
}

export async function createPriceList(userId: string, data: PriceListInput) {
  const pool = await getTenantPool(userId);
  const id = randomUUID();
  const now = new Date();

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO price_lists (
        id, user_id, name, type, adjustment_type, adjustment_value, 
        start_date, end_date, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, userId, data.name, data.type, data.adjustment_type, data.adjustment_value,
        data.start_date, data.end_date, data.status, now, now
      ]
    );

    if (data.items && data.items.length > 0) {
      const itemValues = data.items.map(item => [
        randomUUID(), id, item.product_id, item.price || null, now, now
      ]);

      await connection.query(
        `INSERT INTO price_list_items (id, price_list_id, product_id, price, created_at, updated_at) VALUES ?`,
        [itemValues]
      );
    }

    await connection.commit();
    return id;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updatePriceList(userId: string, id: string, data: Partial<PriceListInput>) {
  const pool = await getTenantPool(userId);
  const now = new Date();
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Update main fields
    const keys = Object.keys(data).filter(k => k !== 'items' && k !== 'id' && k !== 'user_id');
    if (keys.length > 0) {
      const setClause = keys.map(k => `${k} = ?`).join(", ");
      const values = keys.map(k => (data as any)[k]);
      values.push(now, userId, id);
      
      await connection.query(
        `UPDATE price_lists SET ${setClause}, updated_at = ? WHERE user_id = ? AND id = ?`,
        values
      );
    }

    // Update items if provided (Full replacement strategy for simplicity or specific logic)
    // For now, let's assume if 'items' is passed, we replace/update.
    // However, for large lists, full replacement is heavy.
    // Given the requirements, let's implement a smarter sync: 
    // delete missing, insert new, update existing.
    
    if (data.items) {
      // 1. Delete existing items not in the new list
      // If data.items is empty array, it removes all items.
      
      const newProductIds = data.items.map(i => i.product_id);
      
      if (newProductIds.length > 0) {
        await connection.query(
          `DELETE FROM price_list_items WHERE price_list_id = ? AND product_id NOT IN (?)`,
          [id, newProductIds]
        );
      } else {
        await connection.query(
          `DELETE FROM price_list_items WHERE price_list_id = ?`,
          [id]
        );
      }

      // 2. Insert or Update
      for (const item of data.items) {
        // Check if exists
        const [existing] = await connection.query<RowDataPacket[]>(
          `SELECT id FROM price_list_items WHERE price_list_id = ? AND product_id = ?`,
          [id, item.product_id]
        );

        if (existing.length > 0) {
          await connection.query(
            `UPDATE price_list_items SET price = ?, updated_at = ? WHERE id = ?`,
            [item.price || null, now, existing[0].id]
          );
        } else {
          await connection.query(
            `INSERT INTO price_list_items (id, price_list_id, product_id, price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [randomUUID(), id, item.product_id, item.price || null, now, now]
          );
        }
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deletePriceList(userId: string, id: string) {
  const pool = await getTenantPool(userId);
  await pool.query("DELETE FROM price_lists WHERE user_id = ? AND id = ?", [userId, id]);
}
