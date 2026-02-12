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
  source: "manual" | "import" | "settlement";
  externalId: string | null;
  importBatchId: string | null;
  reconciledAt: string | null;
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
    source: (r.source ?? "manual") as any,
    externalId: r.external_id ?? null,
    importBatchId: r.import_batch_id ?? null,
    reconciledAt: r.reconciled_at ? new Date(r.reconciled_at).toISOString() : null,
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

export async function listBankTransactions(
  userId: string,
  accountId: string,
  filter?: { source?: "manual" | "import" | "settlement"; onlyUnreconciled?: boolean }
) {
  const pool = await getTenantPool(userId);
  const where: string[] = ["user_id = ?", "account_id = ?"];
  const params: any[] = [userId, accountId];
  if (filter?.source) {
    where.push("source = ?");
    params.push(filter.source);
  }
  if (filter?.onlyUnreconciled) {
    where.push("reconciled_at IS NULL");
  }
  const [rows] = await pool.query<(RowDataPacket & any)[]>(
    `SELECT * FROM bank_transactions WHERE ${where.join(" AND ")} ORDER BY occurred_at DESC`,
    params
  );
  return rows.map(mapTxRow);
}

export async function ingestImportedBankTransactions(
  userId: string,
  input: {
    accountId: string;
    importBatchId: string;
    lines: { externalId: string; occurredAt: string; type: "in" | "out"; amount: number; description: string; raw?: any }[];
  }
) {
  const pool = await getTenantPool(userId);
  const conn = await pool.getConnection();

  let inserted = 0;
  let skipped = 0;
  let signedSum = 0;

  try {
    await conn.beginTransaction();
    const [accRows] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM bank_accounts WHERE user_id = ? AND id = ? FOR UPDATE",
      [userId, input.accountId]
    );
    if (!accRows.length) throw new Error("Conta bancária não encontrada.");

    for (const l of input.lines) {
      const ext = l.externalId.trim();
      if (!ext) {
        skipped += 1;
        continue;
      }
      const [exists] = await conn.query<RowDataPacket[]>(
        "SELECT id FROM bank_transactions WHERE user_id = ? AND account_id = ? AND external_id = ? LIMIT 1",
        [userId, input.accountId, ext]
      );
      if ((exists as any[]).length > 0) {
        skipped += 1;
        continue;
      }
      const id = randomUUID();
      const amount = Number(l.amount);
      const signed = l.type === "in" ? amount : -amount;
      await conn.query(
        "INSERT INTO bank_transactions (id, account_id, user_id, type, amount, description, occurred_at, matched_ref_type, matched_ref_id, source, external_id, import_batch_id, raw_json, reconciled_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,NULL)",
        [
          id,
          input.accountId,
          userId,
          l.type,
          amount,
          l.description.trim(),
          l.occurredAt,
          null,
          null,
          "import",
          ext,
          input.importBatchId,
          l.raw ? JSON.stringify(l.raw) : null,
        ]
      );
      inserted += 1;
      signedSum += signed;
    }

    if (signedSum !== 0) {
      await conn.query("UPDATE bank_accounts SET balance = balance + ?, updated_at = ? WHERE user_id = ? AND id = ?", [
        signedSum,
        new Date(),
        userId,
        input.accountId,
      ]);
    }

    await conn.commit();
    return { inserted, skipped };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function linkBankTransactionToPayment(
  userId: string,
  input: { bankTransactionId: string; paymentId: string; amount?: number }
) {
  const pool = await getTenantPool(userId);
  const conn = await pool.getConnection();
  const now = new Date();

  try {
    await conn.beginTransaction();

    const [txRows] = await conn.query<RowDataPacket[]>(
      "SELECT * FROM bank_transactions WHERE user_id = ? AND id = ? FOR UPDATE",
      [userId, input.bankTransactionId]
    );
    if (!txRows.length) throw new Error("Movimentação bancária não encontrada.");
    const tx = txRows[0] as any;

    const [payRows] = await conn.query<RowDataPacket[]>(
      "SELECT * FROM financial_payments WHERE user_id = ? AND id = ? FOR UPDATE",
      [userId, input.paymentId]
    );
    if (!payRows.length) throw new Error("Pagamento não encontrado.");
    const pay = payRows[0] as any;
    const amount = input.amount ? Number(input.amount) : Number(pay.amount);

    await conn.query(
      "UPDATE financial_payments SET settlement_account_type = 'bank', bank_account_id = ?, bank_transaction_id = ?, reconciled_at = ? WHERE user_id = ? AND id = ?",
      [tx.account_id, tx.id, now, userId, pay.id]
    );

    await conn.query(
      "UPDATE bank_transactions SET matched_ref_type = ?, matched_ref_id = ?, reconciled_at = ? WHERE user_id = ? AND id = ?",
      ["financial_payment", pay.id, now, userId, tx.id]
    );

    await conn.query(
      "INSERT INTO bank_reconciliations (id, user_id, bank_transaction_id, matched_ref_type, matched_ref_id, amount, memo) VALUES (?,?,?,?,?,?,?)",
      [randomUUID(), userId, tx.id, "financial_payment", pay.id, amount, null]
    );

    await conn.query(
      "INSERT INTO audit_log (id, user_id, actor_user_id, entity, entity_id, action, before_json, after_json) VALUES (?,?,?,?,?,?,?,?)",
      [
        randomUUID(),
        userId,
        userId,
        "bank_transaction",
        tx.id,
        "reconcile",
        JSON.stringify({ matchedRefType: tx.matched_ref_type ?? null, matchedRefId: tx.matched_ref_id ?? null, reconciledAt: tx.reconciled_at ?? null }),
        JSON.stringify({ matchedRefType: "financial_payment", matchedRefId: pay.id, reconciledAt: now }),
      ]
    );

    await conn.commit();
    return true;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
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
