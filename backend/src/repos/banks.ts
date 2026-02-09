import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { getTenantPool } from "../db_tenant.js";

export type BankAccount = {
  id: string;
  name: string;
  bank: string | null;
  agency: string | null;
  accountNumber: string | null;
  initialBalance: number;
  balance: number;
  createdAt: string;
  updatedAt: string;
};

export type BankTransaction = {
  id: string;
  accountId: string;
  type: "in" | "out";
  amount: number;
  description: string;
  occurredAt: string;
  matchedRefType: string | null;
  matchedRefId: string | null;
  createdAt: string;
};

function mapAccountRow(r: any): BankAccount {
  return {
    id: r.id,
    name: r.name,
    bank: r.bank ?? null,
    agency: r.agency ?? null,
    accountNumber: r.account_number ?? null,
    initialBalance: Number(r.initial_balance ?? 0),
    balance: Number(r.balance ?? 0),
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function mapTxRow(r: any): BankTransaction {
  return {
    id: r.id,
    accountId: r.account_id,
    type: r.type,
    amount: Number(r.amount),
    description: r.description,
    occurredAt: new Date(r.occurred_at).toISOString(),
    matchedRefType: r.matched_ref_type ?? null,
    matchedRefId: r.matched_ref_id ?? null,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export async function listBankAccounts(userId: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<(RowDataPacket & any)[]>(
    "SELECT * FROM bank_accounts WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return rows.map(mapAccountRow);
}

export async function getBankAccount(userId: string, id: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<(RowDataPacket & any)[]>("SELECT * FROM bank_accounts WHERE user_id = ? AND id = ?", [userId, id]);
  return rows[0] ? mapAccountRow(rows[0]) : null;
}

export async function createBankAccount(
  userId: string,
  input: { name: string; bank?: string | null; agency?: string | null; accountNumber?: string | null; initialBalance: number }
) {
  const pool = await getTenantPool(userId);
  const id = randomUUID();
  const now = new Date();
  const initial = Number(input.initialBalance ?? 0);
  await pool.query(
    "INSERT INTO bank_accounts (id, user_id, name, bank, agency, account_number, initial_balance, balance, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    [id, userId, input.name.trim(), input.bank ?? null, input.agency ?? null, input.accountNumber ?? null, initial, initial, now, now]
  );
  return await getBankAccount(userId, id);
}

export async function updateBankAccount(
  userId: string,
  id: string,
  input: { name: string; bank?: string | null; agency?: string | null; accountNumber?: string | null }
) {
  const pool = await getTenantPool(userId);
  const now = new Date();
  await pool.query(
    "UPDATE bank_accounts SET name = ?, bank = ?, agency = ?, account_number = ?, updated_at = ? WHERE user_id = ? AND id = ?",
    [input.name.trim(), input.bank ?? null, input.agency ?? null, input.accountNumber ?? null, now, userId, id]
  );
  return await getBankAccount(userId, id);
}

export async function deleteBankAccount(userId: string, id: string) {
  const pool = await getTenantPool(userId);
  await pool.query("DELETE FROM bank_accounts WHERE user_id = ? AND id = ?", [userId, id]);
}

export async function listBankTransactions(userId: string, accountId: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<(RowDataPacket & any)[]>(
    "SELECT * FROM bank_transactions WHERE user_id = ? AND account_id = ? ORDER BY occurred_at DESC",
    [userId, accountId]
  );
  return rows.map(mapTxRow);
}

export async function addBankTransaction(
  userId: string,
  input: { accountId: string; type: "in" | "out"; amount: number; description: string; occurredAt: string }
) {
  const pool = await getTenantPool(userId);
  const conn = await pool.getConnection();
  const id = randomUUID();
  const amount = Number(input.amount);
  const signed = input.type === "in" ? amount : -amount;

  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM bank_accounts WHERE user_id = ? AND id = ? FOR UPDATE",
      [userId, input.accountId]
    );
    if (!rows.length) throw new Error("Conta bancária não encontrada.");

    await conn.query(
      "INSERT INTO bank_transactions (id, account_id, user_id, type, amount, description, occurred_at, matched_ref_type, matched_ref_id) VALUES (?,?,?,?,?,?,?,?,?)",
      [id, input.accountId, userId, input.type, amount, input.description.trim(), input.occurredAt, null, null]
    );

    await conn.query("UPDATE bank_accounts SET balance = balance + ?, updated_at = ? WHERE user_id = ? AND id = ?", [signed, new Date(), userId, input.accountId]);
    await conn.commit();
    return id;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

