import { getTenantPool } from "../db_tenant.js";
import { pool as saasPool } from "../db.js";
import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";

export type StockMovementType = 'in' | 'out' | 'adjustment';

export type StockMovement = {
  id: string;
  product_id: string;
  user_id: string;
  type: StockMovementType;
  quantity: number;
  reason: string | null;
  lot_id: string | null;
  created_at: string;
};

export async function addStockMovement(
  productId: string, 
  userId: string, 
  type: StockMovementType, 
  quantity: number, 
  reason: string,
  lotId?: string
) {
  const id = randomUUID();
  const pool = await getTenantPool(userId);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Check product lot control requirement
    const [products] = await connection.query<RowDataPacket[]>(
      "SELECT has_lot_control FROM products WHERE id = ?",
      [productId]
    );
    
    if (products.length === 0) throw new Error("Product not found");
    const hasLotControl = products[0].has_lot_control;

    if (hasLotControl && !lotId) {
      throw new Error("Este produto possui controle de lote. É obrigatório informar o lote.");
    }

    const [productRows] = await connection.query<RowDataPacket[]>(
      "SELECT stock FROM products WHERE id = ? FOR UPDATE",
      [productId]
    );
    if (productRows.length === 0) throw new Error("Product not found");
    const currentProductStock = Number(productRows[0].stock ?? 0);

    // Determine adjustment value
    let adjustment = 0;
    if (type === 'in') {
      adjustment = quantity;
    } else if (type === 'out') {
      adjustment = -quantity;
    } else if (type === 'adjustment') {
      adjustment = quantity; // quantity can be negative for adjustment
    }

    const nextProductStock = currentProductStock + adjustment;
    if (nextProductStock < 0) {
      throw new Error("Estoque insuficiente.");
    }

    // Handle Lot Stock Update
    if (lotId) {
      const [lots] = await connection.query<RowDataPacket[]>(
        "SELECT id, stock, is_active FROM product_lots WHERE id = ? AND product_id = ? FOR UPDATE",
        [lotId, productId]
      );
      
      if (lots.length === 0) throw new Error("Lot not found or does not belong to this product");
      const lot = lots[0];

      const currentLotStock = Number(lot.stock ?? 0);
      const nextLotStock = currentLotStock + adjustment;
      if (nextLotStock < 0) {
        throw new Error("Estoque insuficiente no lote.");
      }

      // Update lot stock
      await connection.query(
        "UPDATE product_lots SET stock = stock + ? WHERE id = ?",
        [adjustment, lotId]
      );

      // Reactivation logic: If lot was inactive and now has positive stock, activate it.
      // Or simply: ensure it's active if stock > 0? 
      // User says: "Lotes inativos podem ser reativados automaticamente. Caso um lote inativo esteja com saldo zero e ocorra um estorno que gere saldo positivo, o lote será reativado."
      // Let's check the new stock
      if (lot.is_active === 0 && nextLotStock > 0) {
        await connection.query("UPDATE product_lots SET is_active = 1 WHERE id = ?", [lotId]);
      }
    }

    // 1. Insert movement
    await connection.query(
      `INSERT INTO stock_movements (id, product_id, user_id, type, quantity, reason, lot_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, productId, userId, type, quantity, reason, lotId || null]
    );

    // 2. Update product stock (global)
    await connection.query(
      `UPDATE products SET stock = stock + ? WHERE id = ?`,
      [adjustment, productId]
    );

    await connection.commit();
    return id;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function getStockHistory(userId: string, productId: string) {
  const pool = await getTenantPool(userId);
  
  // 1. Fetch movements from Tenant DB (without joining users)
  const [rows] = await pool.query<(StockMovement & { lot_code: string | null } & RowDataPacket)[]>(
    `SELECT sm.*, pl.code AS lot_code
     FROM stock_movements sm
     LEFT JOIN product_lots pl ON sm.lot_id = pl.id
     WHERE sm.product_id = ?
     ORDER BY sm.created_at DESC`,
    [productId]
  );

  if (rows.length === 0) {
    return [];
  }

  // 2. Fetch User Names from SaaS DB
  const userIds = [...new Set(rows.map(r => r.user_id))];
  
  // Create a map of userId -> userName
  const userMap = new Map<string, string>();
  
  if (userIds.length > 0) {
    // We can't use "WHERE id IN (?)" easily with array in mysql2 without expanding it manually or using a helper
    // simpler to just iterate or build the query string carefully.
    // Actually mysql2 supports IN (?)
    
    try {
      const [users] = await saasPool.query<RowDataPacket[]>(
        "SELECT id, full_name FROM users WHERE id IN (?)",
        [userIds]
      );
      
      users.forEach(u => {
        userMap.set(u.id, u.full_name);
      });
    } catch (err) {
      console.error("Error fetching user names for stock history:", err);
      // Fallback: don't crash, just show Unknown or ID
    }
  }

  // 3. Merge data
  return rows.map(row => ({
    ...row,
    user_name: userMap.get(row.user_id) || "Usuário Desconhecido"
  }));
}
