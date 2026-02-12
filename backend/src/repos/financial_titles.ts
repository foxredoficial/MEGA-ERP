import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { getTenantPool } from "../db_tenant.js";

export type FinancialTitleKind = "ar" | "ap";
export type FinancialTitleStatus = "open" | "partial" | "paid" | "canceled";
export type FinancialTitleOrigin = "pdv" | "sales_order" | "manual";
export type FinancialPaymentMethod = "money" | "pix" | "credit" | "debit" | "boleto" | "crediario" | "other";
export type SettlementAccountType = "none" | "cash" | "bank";

export type FinancialPayment = {
  id: string;
  titleId: string;
  amount: number;
  method: FinancialPaymentMethod;
  paidAt: string;
  notes: string | null;
  settlementAccountType: SettlementAccountType;
  cashSessionId: string | null;
  cashTransactionId: string | null;
  bankAccountId: string | null;
  bankTransactionId: string | null;
  reconciledAt: string | null;
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
  competenceDate: string | null;
  categoryId: string | null;
  costCenterId: string | null;
  coaAccountId: string | null;
  documentNumber: string | null;
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
    competenceDate: r.competence_date ? new Date(r.competence_date).toISOString().slice(0, 10) : null,
    categoryId: r.category_id ?? null,
    costCenterId: r.cost_center_id ?? null,
    coaAccountId: r.coa_account_id ?? null,
    documentNumber: r.document_number ?? null,
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
    settlementAccountType: (r.settlement_account_type ?? "none") as SettlementAccountType,
    cashSessionId: r.cash_session_id ?? null,
    cashTransactionId: r.cash_transaction_id ?? null,
    bankAccountId: r.bank_account_id ?? null,
    bankTransactionId: r.bank_transaction_id ?? null,
    reconciledAt: r.reconciled_at ? new Date(r.reconciled_at).toISOString() : null,
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
    competenceDate?: string | null;
    categoryId?: string | null;
    costCenterId?: string | null;
    coaAccountId?: string | null;
    documentNumber?: string | null;
  }
) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Valor inválido.");
  if (!input.description || !input.description.trim()) throw new Error("Descrição é obrigatória.");
  if (!input.dueDate || !String(input.dueDate).trim()) throw new Error("Vencimento é obrigatório.");

  const pool = await getTenantPool(userId);
  const id = randomUUID();
  const now = new Date();

  let categoryId = input.categoryId ?? null;
  let coaAccountId = input.coaAccountId ?? null;
  if (!categoryId) {
    const desired = input.kind === "ar" ? "income" : "expense";
    const [cRows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM fin_categories WHERE user_id = ? AND active = 1 AND type = ? ORDER BY name ASC LIMIT 1",
      [userId, desired]
    );
    categoryId = (cRows as any[])[0]?.id ?? null;
  }
  if (!coaAccountId) {
    const desired = input.kind === "ar" ? "revenue" : "expense";
    const [aRows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM fin_coa_accounts WHERE user_id = ? AND active = 1 AND nature = ? ORDER BY code ASC LIMIT 1",
      [userId, desired]
    );
    coaAccountId = (aRows as any[])[0]?.id ?? null;
  }

  await pool.query(
    `INSERT INTO financial_titles (
      id, user_id, kind, status, origin, ref_id, party_id, party_name, description, amount, paid_amount, due_date,
      competence_date, category_id, cost_center_id, coa_account_id, document_number,
      created_at, updated_at
    ) VALUES (?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      input.competenceDate ?? input.dueDate,
      categoryId,
      input.costCenterId ?? null,
      coaAccountId,
      input.documentNumber ?? null,
      now,
      now,
    ]
  );

  return await getFinancialTitle(userId, id);
}

type SettleArgs = {
  titleId: string;
  amount: number;
  method: FinancialPaymentMethod;
  paidAt?: string;
  notes?: string | null;
  settlement:
    | { type: "none" }
    | { type: "cash"; cashSessionId: string; cashTransactionId?: string }
    | { type: "bank"; bankAccountId?: string; bankTransactionId?: string };
};

export async function settleFinancialTitleAtomic(userId: string, args: SettleArgs) {
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
    const title = rows[0] as any;
    if (title.status === "canceled") throw new Error("Título cancelado.");

    const amount = Number(title.amount);
    const paidAmount = Number(title.paid_amount ?? 0);
    const remaining = Math.max(0, amount - paidAmount);
    const applied = Math.min(remaining, args.amount);
    if (applied <= 0) throw new Error("Título já está quitado.");

    const paidAt = args.paidAt ? new Date(args.paidAt) : new Date();
    const kind = title.kind as FinancialTitleKind;
    const flowType = kind === "ar" ? "in" : "out";

    let settlementAccountType: SettlementAccountType = "none";
    let cashSessionId: string | null = null;
    let cashTransactionId: string | null = null;
    let bankAccountId: string | null = null;
    let bankTransactionId: string | null = null;
    let reconciledAt: Date | null = null;

    if (args.settlement.type === "cash") {
      settlementAccountType = "cash";
      cashSessionId = args.settlement.cashSessionId;
      const [sRows] = await conn.query<RowDataPacket[]>(
        "SELECT id, status FROM cash_sessions WHERE user_id = ? AND id = ? FOR UPDATE",
        [userId, cashSessionId]
      );
      if (!sRows.length) throw new Error("Caixa não encontrado.");
      if ((sRows[0] as any).status !== "open") throw new Error("Caixa está fechado.");

      if (args.settlement.cashTransactionId) {
        cashTransactionId = args.settlement.cashTransactionId;
        const [txRows] = await conn.query<RowDataPacket[]>(
          "SELECT id, session_id, type, amount, meta_json FROM cash_transactions WHERE user_id = ? AND id = ? FOR UPDATE",
          [userId, cashTransactionId]
        );
        if (!txRows.length) throw new Error("Movimentação de caixa não encontrada.");
        const tx = txRows[0] as any;
        if (tx.session_id !== cashSessionId) throw new Error("Movimentação de caixa não pertence ao caixa informado.");
        if (tx.type !== flowType) throw new Error("Tipo da movimentação de caixa não confere com o título.");
        if (Number(tx.amount) !== applied) throw new Error("Valor da movimentação de caixa não confere com a baixa.");
        await conn.query(
          "UPDATE cash_transactions SET meta_json = JSON_MERGE_PATCH(COALESCE(meta_json, JSON_OBJECT()), JSON_OBJECT('financialPaymentId', ?, 'financialTitleId', ?)) WHERE user_id = ? AND id = ?",
          [payId, args.titleId, userId, cashTransactionId]
        );
      } else {
        cashTransactionId = randomUUID();
        const category = kind === "ar" ? "receipt" : "payment";
        await conn.query(
          "INSERT INTO cash_transactions (id, session_id, user_id, type, category, amount, description, payment_method, ref_type, ref_id, meta_json) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
          [
            cashTransactionId,
            cashSessionId,
            userId,
            flowType,
            category,
            applied,
            `Liquidação de título (${args.titleId})`,
            args.method,
            "financial_payment",
            payId,
            JSON.stringify({ titleId: args.titleId }),
          ]
        );
      }
    }

    if (args.settlement.type === "bank") {
      settlementAccountType = "bank";
      reconciledAt = new Date();

      if (args.settlement.bankTransactionId) {
        bankTransactionId = args.settlement.bankTransactionId;
        const [txRows] = await conn.query<RowDataPacket[]>(
          "SELECT id, account_id, user_id FROM bank_transactions WHERE user_id = ? AND id = ? FOR UPDATE",
          [userId, bankTransactionId]
        );
        if (!txRows.length) throw new Error("Movimentação bancária não encontrada.");
        bankAccountId = (txRows[0] as any).account_id;

        await conn.query(
          "UPDATE bank_transactions SET matched_ref_type = ?, matched_ref_id = ?, reconciled_at = ? WHERE user_id = ? AND id = ?",
          ["financial_payment", payId, reconciledAt, userId, bankTransactionId]
        );
      } else {
        if (!args.settlement.bankAccountId) throw new Error("Conta bancária é obrigatória.");
        bankAccountId = args.settlement.bankAccountId;
        const [aRows] = await conn.query<RowDataPacket[]>(
          "SELECT id FROM bank_accounts WHERE user_id = ? AND id = ? FOR UPDATE",
          [userId, bankAccountId]
        );
        if (!aRows.length) throw new Error("Conta bancária não encontrada.");

        bankTransactionId = randomUUID();
        const signed = flowType === "in" ? applied : -applied;
        await conn.query(
          "INSERT INTO bank_transactions (id, account_id, user_id, type, amount, description, occurred_at, matched_ref_type, matched_ref_id, source, external_id, import_batch_id, raw_json, reconciled_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          [
            bankTransactionId,
            bankAccountId,
            userId,
            flowType,
            applied,
            `Liquidação de título (${args.titleId})`,
            paidAt,
            "financial_payment",
            payId,
            "settlement",
            null,
            null,
            null,
            reconciledAt,
          ]
        );
        await conn.query("UPDATE bank_accounts SET balance = balance + ?, updated_at = ? WHERE user_id = ? AND id = ?", [
          signed,
          new Date(),
          userId,
          bankAccountId,
        ]);
      }

      await conn.query(
        "INSERT INTO bank_reconciliations (id, user_id, bank_transaction_id, matched_ref_type, matched_ref_id, amount, memo) VALUES (?,?,?,?,?,?,?)",
        [randomUUID(), userId, bankTransactionId, "financial_payment", payId, applied, args.notes ?? null]
      );
    }

    await conn.query(
      "INSERT INTO financial_payments (id, title_id, user_id, amount, method, paid_at, notes, settlement_account_type, cash_session_id, cash_transaction_id, bank_account_id, bank_transaction_id, reconciled_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        payId,
        args.titleId,
        userId,
        applied,
        args.method,
        paidAt,
        args.notes ?? null,
        settlementAccountType,
        cashSessionId,
        cashTransactionId,
        bankAccountId,
        bankTransactionId,
        reconciledAt,
      ]
    );

    const nextPaid = Math.min(amount, paidAmount + applied);
    const nextStatus: FinancialTitleStatus = nextPaid >= amount ? "paid" : "partial";
    const now = new Date();
    await conn.query(
      "UPDATE financial_titles SET paid_amount = ?, status = ?, updated_at = ? WHERE user_id = ? AND id = ?",
      [nextPaid, nextStatus, now, userId, args.titleId]
    );

    await conn.query(
      "INSERT INTO audit_log (id, user_id, actor_user_id, entity, entity_id, action, before_json, after_json) VALUES (?,?,?,?,?,?,?,?)",
      [
        randomUUID(),
        userId,
        userId,
        "financial_title",
        args.titleId,
        "settle",
        JSON.stringify({ paidAmount, status: title.status }),
        JSON.stringify({ applied, nextPaid, nextStatus, payId, settlementAccountType, cashTransactionId, bankTransactionId }),
      ]
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
