import { randomUUID } from "node:crypto";
import type mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2/promise";
import { getTenantPool } from "../db_tenant.js";

export type BizDocumentType =
  | "proposal"
  | "contract"
  | "purchase_order"
  | "incoming_invoice"
  | "production_order"
  | "nfe"
  | "nfce"
  | "service_invoice";

export type BizDocumentItem = {
  id: string;
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
};

type BizDocumentItemInput = Omit<BizDocumentItem, "id"> & { id?: string };

export type BizDocument = {
  id: string;
  type: BizDocumentType;
  number: string;
  partyId: string | null;
  partyName: string | null;
  date: string;
  status: string;
  notes: string | null;
  totals: {
    count: number;
    subtotal: number;
    discount: number;
    total: number;
  };
  items: BizDocumentItem[];
  payload: any | null;
  createdAt: string;
  updatedAt: string;
};

function computeTotals(items: BizDocumentItem[]) {
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

function typePrefix(type: BizDocumentType) {
  const year = new Date().getFullYear();
  switch (type) {
    case "proposal":
      return `PR-${year}-`;
    case "contract":
      return `CT-${year}-`;
    case "purchase_order":
      return `PC-${year}-`;
    case "incoming_invoice":
      return `NF-E-${year}-`;
    case "production_order":
      return `OP-${year}-`;
    case "nfe":
      return `NFE-${year}-`;
    case "nfce":
      return `NFCE-${year}-`;
    case "service_invoice":
      return `NFS-${year}-`;
  }
}

async function nextNumber(conn: mysql.Connection, userId: string, type: BizDocumentType) {
  const prefix = typePrefix(type);
  const [rows] = await conn.query<RowDataPacket[]>(
    "SELECT number FROM biz_documents WHERE user_id = ? AND type = ? AND number LIKE ? ORDER BY number DESC LIMIT 1",
    [userId, type, `${prefix}%`]
  );
  const last = rows.length ? String((rows[0] as any).number) : null;
  const lastNum = last ? parseInt(last.split("-").slice(-1)[0] ?? "0", 10) : 0;
  const next = (Number.isFinite(lastNum) ? lastNum : 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

function mapDocRow(r: any) {
  return {
    id: r.id,
    type: r.type,
    number: r.number,
    partyId: r.party_id ?? null,
    partyName: r.party_name ?? null,
    date: new Date(r.date).toISOString().slice(0, 10),
    status: r.status,
    notes: r.notes ?? null,
    totals: {
      count: Number(r.totals_count ?? 0),
      subtotal: Number(r.totals_subtotal ?? 0),
      discount: Number(r.totals_discount ?? 0),
      total: Number(r.totals_total ?? 0),
    },
    payload: r.payload_json ?? null,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function mapItemRow(r: any): BizDocumentItem {
  return {
    id: r.id,
    productId: r.product_id ?? null,
    description: r.description,
    quantity: Number(r.quantity),
    unitPrice: Number(r.unit_price),
    discount: Number(r.discount),
    total: Number(r.total),
  };
}

export async function listBizDocuments(userId: string, args: { type: BizDocumentType; query?: string; status?: string }) {
  const pool = await getTenantPool(userId);
  const where: string[] = ["user_id = ?", "type = ?"];
  const params: any[] = [userId, args.type];
  if (args.status) {
    where.push("status = ?");
    params.push(args.status);
  }
  if (args.query) {
    where.push("(number LIKE ? OR party_name LIKE ?)");
    params.push(`%${args.query}%`, `%${args.query}%`);
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM biz_documents WHERE ${where.join(" AND ")} ORDER BY created_at DESC`,
    params
  );

  return rows.map((r) => ({ ...mapDocRow(r), items: [] })) as BizDocument[];
}

export async function getBizDocument(userId: string, id: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM biz_documents WHERE user_id = ? AND id = ?", [userId, id]);
  if (!rows.length) return null;
  const base = mapDocRow(rows[0]);
  const [items] = await pool.query<RowDataPacket[]>("SELECT * FROM biz_document_items WHERE document_id = ? ORDER BY id ASC", [id]);
  return { ...base, items: items.map(mapItemRow) } as BizDocument;
}

export async function createBizDocument(
  userId: string,
  input: {
    type: BizDocumentType;
    partyId?: string | null;
    partyName?: string | null;
    date: string;
    status: string;
    notes?: string | null;
    items?: BizDocumentItemInput[];
    payload?: any | null;
    totalOverride?: number | null;
  }
) {
  const pool = await getTenantPool(userId);
  const conn = await pool.getConnection();
  const id = randomUUID();
  const now = new Date();

  const normalizedItems: BizDocumentItem[] = (input.items ?? []).map((it) => ({
    id: it.id ?? randomUUID(),
    productId: it.productId ?? null,
    description: it.description,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    discount: it.discount,
    total: it.total,
  }));

  const totals = computeTotals(normalizedItems);
  const finalTotal = typeof input.totalOverride === "number" ? input.totalOverride : totals.total;

  try {
    await conn.beginTransaction();
    const number = await nextNumber(conn, userId, input.type);
    await conn.query(
      `INSERT INTO biz_documents (
        id, user_id, type, number, party_id, party_name, date, status, notes,
        totals_count, totals_subtotal, totals_discount, totals_total,
        payload_json, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        userId,
        input.type,
        number,
        input.partyId ?? null,
        input.partyName ?? null,
        input.date,
        input.status,
        input.notes ?? null,
        totals.count,
        totals.subtotal,
        totals.discount,
        finalTotal,
        input.payload ? JSON.stringify(input.payload) : null,
        now,
        now,
      ]
    );

    for (const item of normalizedItems) {
      await conn.query(
        `INSERT INTO biz_document_items (
          id, document_id, product_id, description, quantity, unit_price, discount, total
        ) VALUES (?,?,?,?,?,?,?,?)`,
        [item.id, id, item.productId, item.description, item.quantity, item.unitPrice, item.discount, item.total]
      );
    }

    await conn.commit();
    return await getBizDocument(userId, id);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function updateBizDocument(
  userId: string,
  id: string,
  input: {
    partyId?: string | null;
    partyName?: string | null;
    date: string;
    status: string;
    notes?: string | null;
    items?: BizDocumentItemInput[];
    payload?: any | null;
    totalOverride?: number | null;
  }
) {
  const pool = await getTenantPool(userId);
  const conn = await pool.getConnection();
  const now = new Date();
  const normalizedItems: BizDocumentItem[] = (input.items ?? []).map((it) => ({
    id: it.id ?? randomUUID(),
    productId: it.productId ?? null,
    description: it.description,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    discount: it.discount,
    total: it.total,
  }));
  const totals = computeTotals(normalizedItems);
  const finalTotal = typeof input.totalOverride === "number" ? input.totalOverride : totals.total;

  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<RowDataPacket[]>("SELECT id FROM biz_documents WHERE user_id = ? AND id = ? FOR UPDATE", [userId, id]);
    if (!rows.length) throw new Error("Documento não encontrado.");

    await conn.query(
      `UPDATE biz_documents SET
        party_id = ?, party_name = ?, date = ?, status = ?, notes = ?,
        totals_count = ?, totals_subtotal = ?, totals_discount = ?, totals_total = ?,
        payload_json = ?, updated_at = ?
      WHERE user_id = ? AND id = ?`,
      [
        input.partyId ?? null,
        input.partyName ?? null,
        input.date,
        input.status,
        input.notes ?? null,
        totals.count,
        totals.subtotal,
        totals.discount,
        finalTotal,
        input.payload ? JSON.stringify(input.payload) : null,
        now,
        userId,
        id,
      ]
    );

    await conn.query("DELETE FROM biz_document_items WHERE document_id = ?", [id]);
    for (const item of normalizedItems) {
      await conn.query(
        `INSERT INTO biz_document_items (
          id, document_id, product_id, description, quantity, unit_price, discount, total
        ) VALUES (?,?,?,?,?,?,?,?)`,
        [item.id, id, item.productId, item.description, item.quantity, item.unitPrice, item.discount, item.total]
      );
    }

    await conn.commit();
    return await getBizDocument(userId, id);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function cancelBizDocument(userId: string, id: string) {
  const pool = await getTenantPool(userId);
  const now = new Date();
  await pool.query("UPDATE biz_documents SET status = 'canceled', updated_at = ? WHERE user_id = ? AND id = ?", [now, userId, id]);
  return await getBizDocument(userId, id);
}

