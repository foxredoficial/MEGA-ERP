import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { getTenantPool } from "../db_tenant.js";

export type CashSessionStatus = "open" | "closed";
export type CashTransactionType = "in" | "out";

export type CashTransactionCategory =
  | "opening"
  | "closing"
  | "sale"
  | "receipt"
  | "payment"
  | "supply"
  | "bleed"
  | "expense";

export type CashTransaction = {
  id: string;
  sessionId: string;
  type: CashTransactionType;
  category: CashTransactionCategory;
  amount: number;
  description: string;
  paymentMethod: string;
  refId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

export type CashSession = {
  id: string;
  userId: string;
  userName: string | null;
  status: CashSessionStatus;
  openingBalance: number;
  closingBalance: number | null;
  openedAt: string;
  closedAt: string | null;
  notes: string | null;
  transactions: CashTransaction[];
  totalIn: number;
  totalOut: number;
  currentBalance: number;
};

function mapSessionRow(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name ?? null,
    status: row.status,
    openingBalance: Number(row.opening_balance ?? 0),
    closingBalance: row.closing_balance === null ? null : Number(row.closing_balance),
    openedAt: new Date(row.opened_at).toISOString(),
    closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null,
    notes: row.notes ?? null,
  };
}

function mapTxRow(row: any): CashTransaction {
  return {
    id: row.id,
    sessionId: row.session_id,
    type: row.type,
    category: row.category,
    amount: Number(row.amount),
    description: row.description,
    paymentMethod: row.payment_method,
    refId: row.ref_id ?? null,
    meta: row.meta_json ? (typeof row.meta_json === "string" ? JSON.parse(row.meta_json) : row.meta_json) : null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function computeTotals(openingBalance: number, txs: CashTransaction[]) {
  let totalIn = 0;
  let totalOut = 0;
  for (const t of txs) {
    if (t.type === "in") totalIn += t.amount;
    else totalOut += t.amount;
  }
  const currentBalance = openingBalance + totalIn - totalOut;
  return { totalIn, totalOut, currentBalance };
}

export async function listCashSessions(userId: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM cash_sessions WHERE user_id = ? ORDER BY opened_at DESC",
    [userId]
  );

  return rows.map((r) => {
    const base = mapSessionRow(r);
    const totals = computeTotals(base.openingBalance, []);
    return { ...base, transactions: [], ...totals } as CashSession;
  });
}

export async function getCashSession(userId: string, sessionId: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM cash_sessions WHERE user_id = ? AND id = ?",
    [userId, sessionId]
  );
  if (rows.length === 0) return null;
  const base = mapSessionRow(rows[0]);

  const [txRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM cash_transactions WHERE session_id = ? ORDER BY created_at ASC",
    [sessionId]
  );
  const transactions = txRows.map(mapTxRow);
  const totals = computeTotals(base.openingBalance, transactions);
  return { ...base, transactions, ...totals } as CashSession;
}

export async function getCurrentOpenCashSession(userId: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM cash_sessions WHERE user_id = ? AND status = 'open' ORDER BY opened_at DESC LIMIT 1",
    [userId]
  );
  if (rows.length === 0) return null;
  return getCashSession(userId, rows[0].id);
}

export async function openCashSession(userId: string, userName: string | null, openingBalance: number) {
  if (!Number.isFinite(openingBalance) || openingBalance < 0) throw new Error("Saldo inicial inválido.");

  const pool = await getTenantPool(userId);
  const conn = await pool.getConnection();
  const now = new Date();
  const sessionId = randomUUID();

  try {
    await conn.beginTransaction();
    const [openRows] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM cash_sessions WHERE user_id = ? AND status = 'open' LIMIT 1 FOR UPDATE",
      [userId]
    );
    if (openRows.length > 0) throw new Error("Já existe um caixa aberto.");

    await conn.query(
      `INSERT INTO cash_sessions (
        id, user_id, user_name, status, opening_balance, closing_balance, opened_at, closed_at, notes, created_at, updated_at
      ) VALUES (?, ?, ?, 'open', ?, NULL, ?, NULL, NULL, ?, ?)`,
      [sessionId, userId, userName, openingBalance, now, now, now]
    );

    const txId = randomUUID();
    await conn.query(
      `INSERT INTO cash_transactions (
        id, session_id, user_id, type, category, amount, description, payment_method, ref_id, meta_json
      ) VALUES (?, ?, ?, 'in', 'opening', ?, 'Abertura de Caixa', 'money', NULL, NULL)`,
      [txId, sessionId, userId, openingBalance]
    );

    await conn.commit();
    return await getCashSession(userId, sessionId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function closeCashSession(userId: string, sessionId: string, closingBalance: number, notes?: string | null) {
  if (!Number.isFinite(closingBalance) || closingBalance < 0) throw new Error("Saldo de fechamento inválido.");

  const pool = await getTenantPool(userId);
  const conn = await pool.getConnection();
  const now = new Date();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT id, status FROM cash_sessions WHERE user_id = ? AND id = ? FOR UPDATE",
      [userId, sessionId]
    );
    if (rows.length === 0) throw new Error("Sessão não encontrada");
    if (rows[0].status !== "open") throw new Error("Caixa já está fechado");

    await conn.query(
      "UPDATE cash_sessions SET status = 'closed', closed_at = ?, closing_balance = ?, notes = ?, updated_at = ? WHERE user_id = ? AND id = ?",
      [now, closingBalance, notes ?? null, now, userId, sessionId]
    );

    const txId = randomUUID();
    await conn.query(
      `INSERT INTO cash_transactions (
        id, session_id, user_id, type, category, amount, description, payment_method, ref_id, meta_json
      ) VALUES (?, ?, ?, 'out', 'closing', 0, 'Fechamento de Caixa', 'other', NULL, NULL)`,
      [txId, sessionId, userId]
    );

    await conn.commit();
    return await getCashSession(userId, sessionId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function addCashTransaction(args: {
  userId: string;
  sessionId: string;
  type: CashTransactionType;
  category: CashTransactionCategory;
  amount: number;
  description: string;
  paymentMethod: string;
  refId?: string | null;
  meta?: Record<string, unknown> | null;
}) {
  if (!Number.isFinite(args.amount) || args.amount <= 0) throw new Error("Valor inválido.");
  if (!args.description || !args.description.trim()) throw new Error("Descrição é obrigatória.");

  const pool = await getTenantPool(args.userId);
  const conn = await pool.getConnection();
  const id = randomUUID();

  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT id, status FROM cash_sessions WHERE user_id = ? AND id = ? FOR UPDATE",
      [args.userId, args.sessionId]
    );
    if (rows.length === 0) throw new Error("Sessão não encontrada");
    if (rows[0].status !== "open") throw new Error("Não é possível adicionar movimentações em um caixa fechado");

    await conn.query(
      `INSERT INTO cash_transactions (
        id, session_id, user_id, type, category, amount, description, payment_method, ref_id, meta_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        args.sessionId,
        args.userId,
        args.type,
        args.category,
        args.amount,
        args.description.trim(),
        args.paymentMethod,
        args.refId ?? null,
        args.meta ? JSON.stringify(args.meta) : null,
      ]
    );

    await conn.commit();
    const [txRows] = await pool.query<RowDataPacket[]>("SELECT * FROM cash_transactions WHERE id = ?", [id]);
    return mapTxRow(txRows[0]);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

