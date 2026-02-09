import { randomUUID } from "node:crypto";
import type mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2/promise";
import { getTenantPool } from "../db_tenant.js";

export type ServiceOrderStatus = "open" | "in_progress" | "completed" | "canceled";

export type ServiceOrderItemKind = "labor" | "part" | "service" | "fee";

export type ServiceOrderItem = {
  id: string;
  kind: ServiceOrderItemKind;
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
};

export type ServiceOrder = {
  id: string;
  number: string;
  customerId: string | null;
  customerName: string;
  date: string;
  status: ServiceOrderStatus;
  description: string;
  totalCents: number;
  items?: ServiceOrderItem[];
  createdAt: string;
  updatedAt: string;
};

async function ensureServiceOrderItemsTable(pool: mysql.Pool) {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS service_order_items (
      id CHAR(36) PRIMARY KEY,
      order_id CHAR(36) NOT NULL,
      kind ENUM('labor','part','service','fee') NOT NULL,
      product_id CHAR(36) NULL,
      description TEXT NOT NULL,
      quantity DECIMAL(10, 3) NOT NULL,
      unit_price DECIMAL(10, 2) NOT NULL,
      discount DECIMAL(10, 2) NOT NULL,
      total DECIMAL(10, 2) NOT NULL,
      CONSTRAINT fk_service_order_items_order FOREIGN KEY (order_id) REFERENCES service_orders(id) ON DELETE CASCADE
    )`
  );
  await pool.query("CREATE INDEX IF NOT EXISTS idx_service_order_items_order ON service_order_items(order_id)").catch(() => null);
}

async function nextNumber(conn: mysql.Connection, userId: string) {
  const year = new Date().getFullYear();
  const prefix = `OS-${year}-`;
  const [rows] = await conn.query<RowDataPacket[]>(
    "SELECT number FROM service_orders WHERE user_id = ? AND number LIKE ? ORDER BY number DESC LIMIT 1",
    [userId, `${prefix}%`]
  );
  const last = rows.length ? String(rows[0].number) : null;
  const lastNum = last ? parseInt(last.split("-")[2] ?? "0", 10) : 0;
  const next = (Number.isFinite(lastNum) ? lastNum : 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

function mapRow(r: any): ServiceOrder {
  return {
    id: r.id,
    number: r.number,
    customerId: r.customer_id ?? null,
    customerName: r.customer_name,
    date: new Date(r.date).toISOString().slice(0, 10),
    status: r.status,
    description: r.description,
    totalCents: Number(r.total_cents ?? 0),
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function mapItemRow(r: any): ServiceOrderItem {
  return {
    id: r.id,
    kind: r.kind,
    productId: r.product_id ?? null,
    description: r.description,
    quantity: Number(r.quantity),
    unitPrice: Number(r.unit_price),
    discount: Number(r.discount),
    total: Number(r.total),
  };
}

function computeTotalCents(items: Array<Pick<ServiceOrderItem, "total">>) {
  const total = items.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
  return Math.max(0, Math.round(total * 100));
}

export async function listServiceOrders(userId: string, filter?: { query?: string; status?: ServiceOrderStatus }) {
  const pool = await getTenantPool(userId);
  const where: string[] = ["user_id = ?"];
  const params: any[] = [userId];

  if (filter?.status) {
    where.push("status = ?");
    params.push(filter.status);
  }
  if (filter?.query) {
    where.push("(number LIKE ? OR customer_name LIKE ?)");
    params.push(`%${filter.query}%`, `%${filter.query}%`);
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM service_orders WHERE ${where.join(" AND ")} ORDER BY created_at DESC`,
    params
  );
  return rows.map(mapRow);
}

export async function getServiceOrder(userId: string, id: string) {
  const pool = await getTenantPool(userId);
  await ensureServiceOrderItemsTable(pool);
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM service_orders WHERE user_id = ? AND id = ?",
    [userId, id]
  );
  if (!rows.length) return null;
  const base = mapRow(rows[0]);
  const [items] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM service_order_items WHERE order_id = ? ORDER BY id ASC",
    [id]
  );
  return { ...base, items: items.map(mapItemRow) };
}

export async function createServiceOrder(
  userId: string,
  input: {
    customerId?: string | null;
    customerName: string;
    date: string;
    status: ServiceOrderStatus;
    description: string;
    totalCents: number;
    items?: Array<Omit<ServiceOrderItem, "id"> & { id?: string }>;
  }
) {
  if (!input.customerName || input.customerName.trim().length < 2) throw new Error("Cliente é obrigatório.");
  if (!input.description || input.description.trim().length < 2) throw new Error("Descrição é obrigatória.");
  if (!Number.isFinite(input.totalCents) || input.totalCents < 0) throw new Error("Valor inválido.");

  const pool = await getTenantPool(userId);
  await ensureServiceOrderItemsTable(pool);
  const conn = await pool.getConnection();
  const id = randomUUID();
  const now = new Date();

  const normalizedItems: ServiceOrderItem[] = (input.items ?? []).map((it) => ({
    id: it.id ?? randomUUID(),
    kind: it.kind,
    productId: it.productId ?? null,
    description: it.description,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    discount: it.discount,
    total: it.total,
  }));

  const computedTotalCents = normalizedItems.length ? computeTotalCents(normalizedItems) : Math.trunc(input.totalCents);

  try {
    await conn.beginTransaction();
    const number = await nextNumber(conn, userId);
    await conn.query(
      `INSERT INTO service_orders (
        id, user_id, number, customer_id, customer_name, date, status, description, total_cents, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        number,
        input.customerId ?? null,
        input.customerName.trim(),
        input.date,
        input.status,
        input.description.trim(),
        computedTotalCents,
        now,
        now,
      ]
    );

    if (normalizedItems.length) {
      await conn.query(
        `INSERT INTO service_order_items (
          id, order_id, kind, product_id, description, quantity, unit_price, discount, total
        ) VALUES ${normalizedItems.map(() => "(?,?,?,?,?,?,?,?,?)").join(",")}`,
        normalizedItems.flatMap((it) => [
          it.id,
          id,
          it.kind,
          it.productId,
          it.description,
          it.quantity,
          it.unitPrice,
          it.discount,
          it.total,
        ])
      );
    }
    await conn.commit();
    return await getServiceOrder(userId, id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function updateServiceOrder(
  userId: string,
  id: string,
  input: {
    customerId?: string | null;
    customerName: string;
    date: string;
    status: ServiceOrderStatus;
    description: string;
    totalCents: number;
    items?: Array<Omit<ServiceOrderItem, "id"> & { id?: string }>;
  }
) {
  if (!input.customerName || input.customerName.trim().length < 2) throw new Error("Cliente é obrigatório.");
  if (!input.description || input.description.trim().length < 2) throw new Error("Descrição é obrigatória.");
  if (!Number.isFinite(input.totalCents) || input.totalCents < 0) throw new Error("Valor inválido.");

  const pool = await getTenantPool(userId);
  await ensureServiceOrderItemsTable(pool);
  const conn = await pool.getConnection();
  const now = new Date();

  const normalizedItems: ServiceOrderItem[] = (input.items ?? []).map((it) => ({
    id: it.id ?? randomUUID(),
    kind: it.kind,
    productId: it.productId ?? null,
    description: it.description,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    discount: it.discount,
    total: it.total,
  }));

  const computedTotalCents = normalizedItems.length ? computeTotalCents(normalizedItems) : Math.trunc(input.totalCents);

  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM service_orders WHERE user_id = ? AND id = ? FOR UPDATE",
      [userId, id]
    );
    if (!rows.length) throw new Error("OS não encontrada.");

    await conn.query(
      `UPDATE service_orders SET
        customer_id = ?, customer_name = ?, date = ?, status = ?, description = ?, total_cents = ?, updated_at = ?
      WHERE user_id = ? AND id = ?`,
      [
        input.customerId ?? null,
        input.customerName.trim(),
        input.date,
        input.status,
        input.description.trim(),
        computedTotalCents,
        now,
        userId,
        id,
      ]
    );

    await conn.query("DELETE FROM service_order_items WHERE order_id = ?", [id]);
    if (normalizedItems.length) {
      await conn.query(
        `INSERT INTO service_order_items (
          id, order_id, kind, product_id, description, quantity, unit_price, discount, total
        ) VALUES ${normalizedItems.map(() => "(?,?,?,?,?,?,?,?,?)").join(",")}`,
        normalizedItems.flatMap((it) => [
          it.id,
          id,
          it.kind,
          it.productId,
          it.description,
          it.quantity,
          it.unitPrice,
          it.discount,
          it.total,
        ])
      );
    }

    await conn.commit();
    return await getServiceOrder(userId, id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function cancelServiceOrder(userId: string, id: string) {
  const pool = await getTenantPool(userId);
  const conn = await pool.getConnection();
  const now = new Date();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM service_orders WHERE user_id = ? AND id = ? FOR UPDATE",
      [userId, id]
    );
    if (!rows.length) throw new Error("OS não encontrada.");

    await conn.query("UPDATE service_orders SET status = 'canceled', updated_at = ? WHERE user_id = ? AND id = ?", [now, userId, id]);
    await conn.commit();
    return await getServiceOrder(userId, id);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
