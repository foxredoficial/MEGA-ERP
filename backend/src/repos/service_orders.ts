import { randomUUID } from "node:crypto";
import type mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2/promise";
import { getTenantPool } from "../db_tenant.js";

export type ServiceOrderStatus = "open" | "in_progress" | "completed" | "canceled";

export type ServiceOrder = {
  id: string;
  number: string;
  customerId: string | null;
  customerName: string;
  date: string;
  status: ServiceOrderStatus;
  description: string;
  totalCents: number;
  createdAt: string;
  updatedAt: string;
};

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
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM service_orders WHERE user_id = ? AND id = ?",
    [userId, id]
  );
  if (!rows.length) return null;
  return mapRow(rows[0]);
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
  }
) {
  if (!input.customerName || input.customerName.trim().length < 2) throw new Error("Cliente é obrigatório.");
  if (!input.description || input.description.trim().length < 2) throw new Error("Descrição é obrigatória.");
  if (!Number.isFinite(input.totalCents) || input.totalCents < 0) throw new Error("Valor inválido.");

  const pool = await getTenantPool(userId);
  const conn = await pool.getConnection();
  const id = randomUUID();
  const now = new Date();

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
        Math.trunc(input.totalCents),
        now,
        now,
      ]
    );
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
  }
) {
  if (!input.customerName || input.customerName.trim().length < 2) throw new Error("Cliente é obrigatório.");
  if (!input.description || input.description.trim().length < 2) throw new Error("Descrição é obrigatória.");
  if (!Number.isFinite(input.totalCents) || input.totalCents < 0) throw new Error("Valor inválido.");

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
        Math.trunc(input.totalCents),
        now,
        userId,
        id,
      ]
    );

    await conn.commit();
    return await getServiceOrder(userId, id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
