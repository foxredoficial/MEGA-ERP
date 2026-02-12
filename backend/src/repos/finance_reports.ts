import type { RowDataPacket } from "mysql2/promise";
import { getTenantPool } from "../db_tenant.js";

export type CashflowPoint = {
  date: string;
  predictedIn: number;
  predictedOut: number;
  realizedIn: number;
  realizedOut: number;
};

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getCashflow(
  userId: string,
  input: { start: string; end: string; accountId?: string | null; onlyReconciled?: boolean }
) {
  const pool = await getTenantPool(userId);
  const start = input.start;
  const end = input.end;
  const predictedWhere = ["user_id = ?", "due_date >= ?", "due_date <= ?", "status IN ('open','partial')"]; 
  const predictedParams: any[] = [userId, start, end];

  const [predRows] = await pool.query<(RowDataPacket & any)[]>(
    `SELECT due_date as d,
            SUM(CASE WHEN kind = 'ar' THEN (amount - paid_amount) ELSE 0 END) AS pin,
            SUM(CASE WHEN kind = 'ap' THEN (amount - paid_amount) ELSE 0 END) AS pout
     FROM financial_titles
     WHERE ${predictedWhere.join(" AND ")}
     GROUP BY due_date
     ORDER BY due_date ASC`,
    predictedParams
  );

  const realizedWhere = ["p.user_id = ?", "p.paid_at >= ?", "p.paid_at <= ?"]; 
  const realizedParams: any[] = [userId, `${start} 00:00:00`, `${end} 23:59:59`];
  if (input.accountId) {
    realizedWhere.push("p.bank_account_id = ?");
    realizedParams.push(input.accountId);
  }
  if (input.onlyReconciled) {
    realizedWhere.push("(p.reconciled_at IS NOT NULL OR p.cash_transaction_id IS NOT NULL)");
  }

  const [realRows] = await pool.query<(RowDataPacket & any)[]>(
    `SELECT DATE(p.paid_at) as d,
            SUM(CASE WHEN t.kind = 'ar' THEN p.amount ELSE 0 END) AS rin,
            SUM(CASE WHEN t.kind = 'ap' THEN p.amount ELSE 0 END) AS rout
     FROM financial_payments p
     JOIN financial_titles t ON t.id = p.title_id
     WHERE ${realizedWhere.join(" AND ")}
     GROUP BY DATE(p.paid_at)
     ORDER BY DATE(p.paid_at) ASC`,
    realizedParams
  );

  const map = new Map<string, CashflowPoint>();
  for (const r of predRows) {
    const k = new Date(r.d).toISOString().slice(0, 10);
    map.set(k, {
      date: k,
      predictedIn: Number(r.pin ?? 0),
      predictedOut: Number(r.pout ?? 0),
      realizedIn: 0,
      realizedOut: 0,
    });
  }
  for (const r of realRows) {
    const k = new Date(r.d).toISOString().slice(0, 10);
    const cur = map.get(k) ?? { date: k, predictedIn: 0, predictedOut: 0, realizedIn: 0, realizedOut: 0 };
    cur.realizedIn = Number(r.rin ?? 0);
    cur.realizedOut = Number(r.rout ?? 0);
    map.set(k, cur);
  }

  const out: CashflowPoint[] = [];
  const d0 = new Date(`${start}T00:00:00.000Z`);
  const d1 = new Date(`${end}T00:00:00.000Z`);
  for (let d = new Date(d0); d <= d1; d.setUTCDate(d.getUTCDate() + 1)) {
    const k = dateKey(d);
    out.push(map.get(k) ?? { date: k, predictedIn: 0, predictedOut: 0, realizedIn: 0, realizedOut: 0 });
  }
  return out;
}

export type DreRow = {
  coaAccountId: string;
  code: string;
  name: string;
  nature: "revenue" | "expense";
  amount: number;
};

export async function getDre(
  userId: string,
  input: { start: string; end: string; view: "competence" | "cash"; costCenterId?: string | null }
) {
  const pool = await getTenantPool(userId);
  const start = input.start;
  const end = input.end;

  if (input.view === "competence") {
    const where = ["t.user_id = ?", "t.status <> 'canceled'", "t.competence_date IS NOT NULL", "t.competence_date >= ?", "t.competence_date <= ?"]; 
    const params: any[] = [userId, start, end];
    if (input.costCenterId) {
      where.push("t.cost_center_id = ?");
      params.push(input.costCenterId);
    }
    const [rows] = await pool.query<(RowDataPacket & any)[]>(
      `SELECT a.id as coa_account_id, a.code, a.name, a.nature,
              SUM(CASE WHEN a.nature = 'revenue' THEN t.amount ELSE t.amount END) AS amount
       FROM financial_titles t
       JOIN fin_coa_accounts a ON a.id = t.coa_account_id
       WHERE ${where.join(" AND ")}
         AND a.nature IN ('revenue','expense')
       GROUP BY a.id, a.code, a.name, a.nature
       ORDER BY a.nature ASC, a.code ASC`,
      params
    );
    return rows.map((r) => ({
      coaAccountId: r.coa_account_id,
      code: r.code,
      name: r.name,
      nature: r.nature,
      amount: Number(r.amount ?? 0),
    })) as DreRow[];
  }

  const where = ["p.user_id = ?", "p.paid_at >= ?", "p.paid_at <= ?"]; 
  const params: any[] = [userId, `${start} 00:00:00`, `${end} 23:59:59`];
  if (input.costCenterId) {
    where.push("t.cost_center_id = ?");
    params.push(input.costCenterId);
  }
  const [rows] = await pool.query<(RowDataPacket & any)[]>(
    `SELECT a.id as coa_account_id, a.code, a.name, a.nature,
            SUM(CASE WHEN t.kind = 'ar' THEN p.amount ELSE -p.amount END) AS signed_amount
     FROM financial_payments p
     JOIN financial_titles t ON t.id = p.title_id
     JOIN fin_coa_accounts a ON a.id = t.coa_account_id
     WHERE ${where.join(" AND ")}
       AND a.nature IN ('revenue','expense')
     GROUP BY a.id, a.code, a.name, a.nature
     ORDER BY a.nature ASC, a.code ASC`,
    params
  );

  return rows.map((r) => {
    const signed = Number(r.signed_amount ?? 0);
    const amount = r.nature === "revenue" ? Math.max(0, signed) : Math.max(0, -signed);
    return {
      coaAccountId: r.coa_account_id,
      code: r.code,
      name: r.name,
      nature: r.nature,
      amount,
    };
  }) as DreRow[];
}

