import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { getTenantPool } from "../db_tenant.js";

export type FinancialTitleKind = "ar" | "ap";
export type FinancialTitleStatus = "open" | "partial" | "paid" | "canceled";
export type FinancialTitleOrigin = "pdv" | "sales_order" | "manual";
export type FinancialPaymentMethod = "money" | "pix" | "credit" | "debit" | "boleto" | "crediario" | "other";

export type FinancialPayment = {
  id: string;
  titleId: string;
  amount: number;
  method: FinancialPaymentMethod;
  paidAt: string;
  notes: string | null;
};

export type FinancialTitle = {
  id: string;
  kind: FinancialTitleKind;
  status: FinancialTitleStatus;
  origin: FinancialTitleOrigin;
  refId: string | null;
  partyId: string | null;
  partyName: string | null;
  description: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  payments: FinancialPayment[];
};

function mapTitleRow(r: any): Omit<FinancialTitle, "payments"> {
  return {
    id: r.id,
    kind: r.kind,
    status: r.status,
    origin: r.origin,
    refId: r.ref_id ?? null,
    partyId: r.party_id ?? null,
    partyName: r.party_name ?? null,
    description: r.description,
    amount: Number(r.amount),
    paidAmount: Number(r.paid_amount ?? 0),
    dueDate: new Date(r.due_date).toISOString().slice(0, 10),
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function mapPaymentRow(r: any): FinancialPayment {
  return {
    id: r.id,
    titleId: r.title_id,
    amount: Number(r.amount),
    method: r.method,
    paidAt: new Date(r.paid_at).toISOString(),
    notes: r.notes ?? null,
  };
}

export async function listFinancialTitles(
  userId: string,
  filter?: { kind?: FinancialTitleKind; status?: FinancialTitleStatus; query?: string }
) {
  const pool = await getTenantPool(userId);
  const where: string[] = ["user_id = ?"];
  const params: any[] = [userId];

  if (filter?.kind) {
    where.push("kind = ?");
    params.push(filter.kind);
  }
  if (filter?.status) {
    where.push("status = ?");
    params.push(filter.status);
  }
  if (filter?.query) {
    where.push("(description LIKE ? OR party_name LIKE ?)");
    params.push(`%${filter.query}%`, `%${filter.query}%`);
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM financial_titles WHERE ${where.join(" AND ")} ORDER BY created_at DESC`,
    params
  );

  return rows.map((r) => ({ ...mapTitleRow(r), payments: [] })) as FinancialTitle[];
}

export async function getFinancialTitle(userId: string, id: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM financial_titles WHERE user_id = ? AND id = ?",
    [userId, id]
  );
  if (rows.length === 0) return null;
  const titleBase = mapTitleRow(rows[0]);
  const [pRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM financial_payments WHERE user_id = ? AND title_id = ? ORDER BY paid_at ASC",
    [userId, id]
  );
  const payments = pRows.map(mapPaymentRow);
  return { ...titleBase, payments } as FinancialTitle;
}

export async function createFinancialTitle(
  userId: string,
  input: {
    kind: FinancialTitleKind;
    origin: FinancialTitleOrigin;
    refId?: string | null;
    partyId?: string | null;
    partyName?: string | null;
    description: string;
    amount: number;
    dueDate: string;
  }
) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Valor inválido.");
  if (!input.description || !input.description.trim()) throw new Error("Descrição é obrigatória.");
  if (!input.dueDate || !String(input.dueDate).trim()) throw new Error("Vencimento é obrigatório.");

  const pool = await getTenantPool(userId);
  const id = randomUUID();
  const now = new Date();

  await pool.query(
    `INSERT INTO financial_titles (
      id, user_id, kind, status, origin, ref_id, party_id, party_name, description, amount, paid_amount, due_date, created_at, updated_at
    ) VALUES (?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [
      id,
      userId,
      input.kind,
      input.origin,
      input.refId ?? null,
      input.partyId ?? null,
      input.partyName ?? null,
      input.description.trim(),
      input.amount,
      input.dueDate,
      now,
      now,
    ]
  );

  return await getFinancialTitle(userId, id);
}

export async function cancelFinancialTitle(userId: string, id: string) {
  const pool = await getTenantPool(userId);
  const now = new Date();
  const [r] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM financial_titles WHERE user_id = ? AND id = ?",
    [userId, id]
  );
  if (r.length === 0) throw new Error("Título não encontrado.");
  await pool.query("UPDATE financial_titles SET status = 'canceled', updated_at = ? WHERE user_id = ? AND id = ?", [
    now,
    userId,
    id,
  ]);
  return await getFinancialTitle(userId, id);
}

export async function registerPayment(
  userId: string,
  args: { titleId: string; amount: number; method: FinancialPaymentMethod; paidAt?: string; notes?: string | null }
) {
  if (!Number.isFinite(args.amount) || args.amount <= 0) throw new Error("Valor inválido.");

  const pool = await getTenantPool(userId);
  const conn = await pool.getConnection();
  const payId = randomUUID();

  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT * FROM financial_titles WHERE user_id = ? AND id = ? FOR UPDATE",
      [userId, args.titleId]
    );
    if (rows.length === 0) throw new Error("Título não encontrado.");
    const title = rows[0];
    if (title.status === "canceled") throw new Error("Título cancelado.");

    const amount = Number(title.amount);
    const paidAmount = Number(title.paid_amount ?? 0);
    const remaining = Math.max(0, amount - paidAmount);
    const applied = Math.min(remaining, args.amount);
    if (applied <= 0) throw new Error("Título já está quitado.");

    const paidAt = args.paidAt ? new Date(args.paidAt) : new Date();

    await conn.query(
      "INSERT INTO financial_payments (id, title_id, user_id, amount, method, paid_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [payId, args.titleId, userId, applied, args.method, paidAt, args.notes ?? null]
    );

    const nextPaid = Math.min(amount, paidAmount + applied);
    const nextStatus: FinancialTitleStatus = nextPaid >= amount ? "paid" : "partial";
    const now = new Date();
    await conn.query(
      "UPDATE financial_titles SET paid_amount = ?, status = ?, updated_at = ? WHERE user_id = ? AND id = ?",
      [nextPaid, nextStatus, now, userId, args.titleId]
    );

    await conn.commit();
    return await getFinancialTitle(userId, args.titleId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

