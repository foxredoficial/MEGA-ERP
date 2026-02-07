import { randomUUID } from "node:crypto";
import type mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2/promise";
import { getTenantPool } from "../db_tenant.js";

export type SalesOrderStatus = "open" | "billed" | "delivered" | "canceled";

export type SalesOrderItem = {
  id: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
};

type SalesOrderItemInput = Omit<SalesOrderItem, "id"> & { id?: string };

export type SalesOrder = {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  date: string;
  status: SalesOrderStatus;
  observations: string;
  items: SalesOrderItem[];
  totals: {
    count: number;
    subtotal: number;
    discount: number;
    total: number;
  };
  createdAt: string;
  updatedAt: string;
};

function computeTotals(items: SalesOrderItem[]) {
  return items.reduce(
    (acc, item) => ({
      count: acc.count + item.quantity,
      subtotal: acc.subtotal + item.quantity * item.unitPrice,
      discount: acc.discount + item.discount,
      total: acc.total + item.total,
    }),
    { count: 0, subtotal: 0, discount: 0, total: 0 }
  );
}

async function nextNumber(conn: mysql.Connection, userId: string) {
  const year = new Date().getFullYear();
  const prefix = `PV-${year}-`;
  const [rows] = await conn.query<RowDataPacket[]>(
    "SELECT number FROM sales_orders WHERE user_id = ? AND number LIKE ? ORDER BY number DESC LIMIT 1",
    [userId, `${prefix}%`]
  );
  const last = rows.length ? String(rows[0].number) : null;
  const lastNum = last ? parseInt(last.split("-")[2] ?? "0", 10) : 0;
  const next = (Number.isFinite(lastNum) ? lastNum : 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

function mapOrderRow(r: any) {
  return {
    id: r.id,
    number: r.number,
    customerId: r.customer_id,
    customerName: r.customer_name,
    date: new Date(r.date).toISOString().slice(0, 10),
    status: r.status,
    observations: r.observations,
    totals: {
      count: Number(r.totals_count ?? 0),
      subtotal: Number(r.totals_subtotal ?? 0),
      discount: Number(r.totals_discount ?? 0),
      total: Number(r.totals_total ?? 0),
    },
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function mapItemRow(r: any): SalesOrderItem {
  return {
    id: r.id,
    productId: r.product_id,
    description: r.description,
    quantity: Number(r.quantity),
    unitPrice: Number(r.unit_price),
    discount: Number(r.discount),
    total: Number(r.total),
  };
}

export async function listSalesOrders(userId: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM sales_orders WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return rows.map((r) => ({ ...mapOrderRow(r), items: [] })) as SalesOrder[];
}

export async function getSalesOrder(userId: string, id: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM sales_orders WHERE user_id = ? AND id = ?",
    [userId, id]
  );
  if (!rows.length) return null;
  const orderBase = mapOrderRow(rows[0]);

  const [itemRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM sales_order_items WHERE order_id = ? ORDER BY id ASC",
    [id]
  );
  const items = itemRows.map(mapItemRow);
  return { ...orderBase, items } as SalesOrder;
}

export async function createSalesOrder(
  userId: string,
  input: {
    customerId: string;
    customerName: string;
    date: string;
    status: SalesOrderStatus;
    observations: string;
    items: SalesOrderItemInput[];
  }
) {
  const pool = await getTenantPool(userId);
  const conn = await pool.getConnection();
  const id = randomUUID();
  const now = new Date();

  const normalizedItems: SalesOrderItem[] = input.items.map((it) => ({
    id: it.id ?? randomUUID(),
    productId: it.productId,
    description: it.description,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    discount: it.discount,
    total: it.total,
  }));
  const totals = computeTotals(normalizedItems);

  try {
    await conn.beginTransaction();
    const number = await nextNumber(conn, userId);
    await conn.query(
      `INSERT INTO sales_orders (
        id, user_id, number, customer_id, customer_name, date, status, observations,
        totals_count, totals_subtotal, totals_discount, totals_total,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        number,
        input.customerId,
        input.customerName,
        input.date,
        input.status,
        input.observations,
        totals.count,
        totals.subtotal,
        totals.discount,
        totals.total,
        now,
        now,
      ]
    );

    for (const item of normalizedItems) {
      await conn.query(
        `INSERT INTO sales_order_items (
          id, order_id, product_id, description, quantity, unit_price, discount, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, id, item.productId, item.description, item.quantity, item.unitPrice, item.discount, item.total]
      );
    }

    await conn.commit();
    return await getSalesOrder(userId, id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function updateSalesOrder(
  userId: string,
  id: string,
  input: {
    customerId: string;
    customerName: string;
    date: string;
    status: SalesOrderStatus;
    observations: string;
    items: SalesOrderItemInput[];
  }
) {
  const pool = await getTenantPool(userId);
  const conn = await pool.getConnection();
  const now = new Date();
  const normalizedItems: SalesOrderItem[] = input.items.map((it) => ({
    id: it.id ?? randomUUID(),
    productId: it.productId,
    description: it.description,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    discount: it.discount,
    total: it.total,
  }));
  const totals = computeTotals(normalizedItems);

  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM sales_orders WHERE user_id = ? AND id = ? FOR UPDATE",
      [userId, id]
    );
    if (!rows.length) throw new Error("Pedido não encontrado.");

    await conn.query(
      `UPDATE sales_orders SET
        customer_id = ?, customer_name = ?, date = ?, status = ?, observations = ?,
        totals_count = ?, totals_subtotal = ?, totals_discount = ?, totals_total = ?,
        updated_at = ?
      WHERE user_id = ? AND id = ?`,
      [
        input.customerId,
        input.customerName,
        input.date,
        input.status,
        input.observations,
        totals.count,
        totals.subtotal,
        totals.discount,
        totals.total,
        now,
        userId,
        id,
      ]
    );

    await conn.query("DELETE FROM sales_order_items WHERE order_id = ?", [id]);
    for (const item of normalizedItems) {
      await conn.query(
        `INSERT INTO sales_order_items (
          id, order_id, product_id, description, quantity, unit_price, discount, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, id, item.productId, item.description, item.quantity, item.unitPrice, item.discount, item.total]
      );
    }

    await conn.commit();
    return await getSalesOrder(userId, id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
