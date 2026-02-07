import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { getTenantPool } from "../db_tenant.js";

export type PdvSaleStatus = "completed" | "canceled";

export type PdvSaleItem = {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  discountPerUnit: number;
  lineTotal: number;
};

export type PdvSale = {
  id: string;
  cashSessionId: string;
  customerId: string | null;
  customerName: string | null;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  total: number;
  status: PdvSaleStatus;
  items: PdvSaleItem[];
  createdAt: string;
};

function mapSaleRow(r: any): Omit<PdvSale, "items"> {
  return {
    id: r.id,
    cashSessionId: r.cash_session_id,
    customerId: r.customer_id ?? null,
    customerName: r.customer_name ?? null,
    paymentMethod: r.payment_method,
    subtotal: Number(r.subtotal),
    discount: Number(r.discount),
    total: Number(r.total),
    status: r.status,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

function mapItemRow(r: any): PdvSaleItem {
  return {
    id: r.id,
    productId: r.product_id,
    name: r.name,
    sku: r.sku ?? null,
    quantity: Number(r.quantity),
    unitPrice: Number(r.unit_price),
    discountPerUnit: Number(r.discount_per_unit),
    lineTotal: Number(r.line_total),
  };
}

export async function listPdvSales(userId: string, filter?: { query?: string }) {
  const pool = await getTenantPool(userId);
  const where: string[] = ["user_id = ?"];
  const params: any[] = [userId];
  if (filter?.query) {
    where.push("(id LIKE ? OR customer_name LIKE ?)");
    params.push(`%${filter.query}%`, `%${filter.query}%`);
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM pdv_sales WHERE ${where.join(" AND ")} ORDER BY created_at DESC`,
    params
  );
  return rows.map((r) => ({ ...mapSaleRow(r), items: [] })) as PdvSale[];
}

export async function createPdvSale(
  userId: string,
  input: Omit<PdvSale, "id" | "createdAt">,
  opts?: { id?: string; createdAt?: string }
) {
  const pool = await getTenantPool(userId);
  const conn = await pool.getConnection();

  const saleId = opts?.id ?? randomUUID();
  const createdAt = opts?.createdAt ? new Date(opts.createdAt) : new Date();

  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO pdv_sales (
        id, user_id, cash_session_id, customer_id, customer_name, payment_method, subtotal, discount, total, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        saleId,
        userId,
        input.cashSessionId,
        input.customerId ?? null,
        input.customerName ?? null,
        input.paymentMethod,
        input.subtotal,
        input.discount,
        input.total,
        input.status,
        createdAt,
      ]
    );

    for (const item of input.items) {
      await conn.query(
        `INSERT INTO pdv_sale_items (
          id, sale_id, product_id, name, sku, quantity, unit_price, discount_per_unit, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id || randomUUID(),
          saleId,
          item.productId,
          item.name,
          item.sku ?? null,
          item.quantity,
          item.unitPrice,
          item.discountPerUnit,
          item.lineTotal,
        ]
      );
    }

    await conn.commit();
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM pdv_sales WHERE user_id = ? AND id = ?", [userId, saleId]);
    return { ...mapSaleRow(rows[0]), items: input.items, createdAt: createdAt.toISOString() } as PdvSale;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

