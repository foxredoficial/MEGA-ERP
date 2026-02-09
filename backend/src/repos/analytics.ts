import type { RowDataPacket } from "mysql2/promise";
import { getTenantPool } from "../db_tenant.js";

export type AnalyticsGranularity = "hour" | "day" | "week" | "month";

export type AnalyticsRange = {
  start: string;
  end: string;
};

export type DashboardQuery = {
  range: AnalyticsRange;
  compare?: AnalyticsRange;
  granularity: AnalyticsGranularity;
};

type SeriesRow = { t: string; total: number };

function bucketExpr(col: string, granularity: AnalyticsGranularity) {
  if (granularity === "hour") return `DATE_FORMAT(${col}, '%Y-%m-%d %H:00:00')`;
  if (granularity === "day") return `DATE_FORMAT(DATE(${col}), '%Y-%m-%d')`;
  if (granularity === "week") return `DATE_FORMAT(DATE_SUB(DATE(${col}), INTERVAL (DAYOFWEEK(${col})-1) DAY), '%Y-%m-%d')`;
  return `DATE_FORMAT(${col}, '%Y-%m-01')`;
}

function mergeTotals(a: SeriesRow[], b: SeriesRow[]) {
  const map = new Map<string, number>();
  for (const r of a) map.set(r.t, (map.get(r.t) ?? 0) + Number(r.total ?? 0));
  for (const r of b) map.set(r.t, (map.get(r.t) ?? 0) + Number(r.total ?? 0));
  return Array.from(map.entries())
    .map(([t, total]) => ({ t, total }))
    .sort((x, y) => x.t.localeCompare(y.t));
}

async function salesSeries(userId: string, range: AnalyticsRange, granularity: AnalyticsGranularity) {
  const pool = await getTenantPool(userId);

  const salesBucket = bucketExpr("date", granularity === "hour" ? "day" : granularity);
  const [orderRows] = await pool.query<RowDataPacket[]>(
    `SELECT ${salesBucket} as t, SUM(totals_total) as total
     FROM sales_orders
     WHERE user_id = ? AND date BETWEEN ? AND ? AND status <> 'canceled'
     GROUP BY t ORDER BY t ASC`,
    [userId, range.start, range.end]
  );

  const pdvBucket = bucketExpr("created_at", granularity);
  const [pdvRows] = await pool.query<RowDataPacket[]>(
    `SELECT ${pdvBucket} as t, SUM(total) as total
     FROM pdv_sales
     WHERE user_id = ? AND created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY) AND status = 'completed'
     GROUP BY t ORDER BY t ASC`,
    [userId, range.start, range.end]
  );

  const orders = (orderRows as any[]).map((r) => ({ t: String(r.t), total: Number(r.total ?? 0) }));
  const pdv = (pdvRows as any[]).map((r) => ({ t: String(r.t), total: Number(r.total ?? 0) }));
  return mergeTotals(orders, pdv);
}

async function cashFlowSeries(userId: string, range: AnalyticsRange, granularity: AnalyticsGranularity) {
  const pool = await getTenantPool(userId);
  const bucket = bucketExpr("created_at", granularity);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${bucket} as t,
       SUM(CASE WHEN type='in' THEN amount ELSE 0 END) as amount_in,
       SUM(CASE WHEN type='out' THEN amount ELSE 0 END) as amount_out
     FROM cash_transactions
     WHERE user_id = ? AND created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
     GROUP BY t ORDER BY t ASC`,
    [userId, range.start, range.end]
  );

  return (rows as any[]).map((r) => ({
    t: String(r.t),
    amountIn: Number(r.amount_in ?? 0),
    amountOut: Number(r.amount_out ?? 0),
  }));
}

async function stockSeries(userId: string, range: AnalyticsRange, granularity: AnalyticsGranularity) {
  const pool = await getTenantPool(userId);
  const bucket = bucketExpr("created_at", granularity);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${bucket} as t,
       SUM(CASE WHEN type='in' THEN quantity ELSE 0 END) as qty_in,
       SUM(CASE WHEN type='out' THEN quantity ELSE 0 END) as qty_out
     FROM stock_movements
     WHERE user_id = ? AND created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
     GROUP BY t ORDER BY t ASC`,
    [userId, range.start, range.end]
  );

  return (rows as any[]).map((r) => ({
    t: String(r.t),
    qtyIn: Number(r.qty_in ?? 0),
    qtyOut: Number(r.qty_out ?? 0),
  }));
}

async function kpis(userId: string, range: AnalyticsRange) {
  const pool = await getTenantPool(userId);
  const [salesAgg] = await pool.query<RowDataPacket[]>(
    `SELECT
      (SELECT COALESCE(SUM(totals_total),0) FROM sales_orders WHERE user_id = ? AND date BETWEEN ? AND ? AND status <> 'canceled') as sales_orders_total,
      (SELECT COUNT(*) FROM sales_orders WHERE user_id = ? AND date BETWEEN ? AND ? AND status <> 'canceled') as sales_orders_count,
      (SELECT COALESCE(SUM(total),0) FROM pdv_sales WHERE user_id = ? AND created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY) AND status='completed') as pdv_total,
      (SELECT COUNT(*) FROM pdv_sales WHERE user_id = ? AND created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY) AND status='completed') as pdv_count
    `,
    [
      userId,
      range.start,
      range.end,
      userId,
      range.start,
      range.end,
      userId,
      range.start,
      range.end,
      userId,
      range.start,
      range.end,
    ]
  );

  const r = (salesAgg as any[])[0] ?? {};
  const salesTotal = Number(r.sales_orders_total ?? 0) + Number(r.pdv_total ?? 0);
  const salesCount = Number(r.sales_orders_count ?? 0) + Number(r.pdv_count ?? 0);

  const [cashAgg] = await pool.query<RowDataPacket[]>(
    `SELECT
      COALESCE(SUM(CASE WHEN type='in' THEN amount ELSE 0 END),0) as amount_in,
      COALESCE(SUM(CASE WHEN type='out' THEN amount ELSE 0 END),0) as amount_out,
      COUNT(*) as count
     FROM cash_transactions
     WHERE user_id = ? AND created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)`,
    [userId, range.start, range.end]
  );
  const c = (cashAgg as any[])[0] ?? {};

  const [finAgg] = await pool.query<RowDataPacket[]>(
    `SELECT
      COALESCE(SUM(CASE WHEN kind='ar' AND status IN ('open','partial') THEN (amount - paid_amount) ELSE 0 END),0) as ar_open,
      COALESCE(SUM(CASE WHEN kind='ap' AND status IN ('open','partial') THEN (amount - paid_amount) ELSE 0 END),0) as ap_open
     FROM financial_titles
     WHERE user_id = ? AND due_date BETWEEN ? AND ?`,
    [userId, range.start, range.end]
  );
  const f = (finAgg as any[])[0] ?? {};

  const [stockAgg] = await pool.query<RowDataPacket[]>(
    `SELECT
      COALESCE(SUM(CASE WHEN type='in' THEN quantity ELSE 0 END),0) as qty_in,
      COALESCE(SUM(CASE WHEN type='out' THEN quantity ELSE 0 END),0) as qty_out
     FROM stock_movements
     WHERE user_id = ? AND created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)`,
    [userId, range.start, range.end]
  );
  const s = (stockAgg as any[])[0] ?? {};

  const [prodAgg] = await pool.query<RowDataPacket[]>(
    `SELECT
      COUNT(*) as products_count,
      SUM(CASE WHEN stock_min IS NOT NULL AND stock <= stock_min THEN 1 ELSE 0 END) as low_stock
     FROM products
     WHERE user_id = ?`,
    [userId]
  );
  const p = (prodAgg as any[])[0] ?? {};

  return {
    salesTotal,
    salesCount,
    cashIn: Number(c.amount_in ?? 0),
    cashOut: Number(c.amount_out ?? 0),
    cashTransactions: Number(c.count ?? 0),
    receivableOpen: Number(f.ar_open ?? 0),
    payableOpen: Number(f.ap_open ?? 0),
    stockInQty: Number(s.qty_in ?? 0),
    stockOutQty: Number(s.qty_out ?? 0),
    productsCount: Number(p.products_count ?? 0),
    lowStockCount: Number(p.low_stock ?? 0),
  };
}

export async function getDashboardAnalytics(userId: string, q: DashboardQuery) {
  const current = q.range;
  const compare = q.compare;

  const [kpiCurrent, salesCurrent, cashCurrent, stockCurrent] = await Promise.all([
    kpis(userId, current),
    salesSeries(userId, current, q.granularity),
    cashFlowSeries(userId, current, q.granularity),
    stockSeries(userId, current, q.granularity),
  ]);

  let kpiCompare: any = null;
  let salesCompare: SeriesRow[] | null = null;
  let cashCompare: Array<{ t: string; amountIn: number; amountOut: number }> | null = null;
  let stockCompare: Array<{ t: string; qtyIn: number; qtyOut: number }> | null = null;

  if (compare) {
    [kpiCompare, salesCompare, cashCompare, stockCompare] = await Promise.all([
      kpis(userId, compare),
      salesSeries(userId, compare, q.granularity),
      cashFlowSeries(userId, compare, q.granularity),
      stockSeries(userId, compare, q.granularity),
    ]);
  }

  const compareSalesMap = new Map((salesCompare ?? []).map((r) => [r.t, Number(r.total ?? 0)]));
  const compareCashMap = new Map((cashCompare ?? []).map((r) => [r.t, r]));
  const compareStockMap = new Map((stockCompare ?? []).map((r) => [r.t, r]));

  const salesSeriesMerged = salesCurrent.map((r) => ({
    t: r.t,
    current: Number(r.total ?? 0),
    compare: compare ? Number(compareSalesMap.get(r.t) ?? 0) : null,
  }));

  const cashSeriesMerged = cashCurrent.map((r) => {
    const c2 = compare ? compareCashMap.get(r.t) : undefined;
    return {
      t: r.t,
      inCurrent: r.amountIn,
      outCurrent: r.amountOut,
      inCompare: compare ? Number(c2?.amountIn ?? 0) : null,
      outCompare: compare ? Number(c2?.amountOut ?? 0) : null,
    };
  });

  const stockSeriesMerged = stockCurrent.map((r) => {
    const s2 = compare ? compareStockMap.get(r.t) : undefined;
    return {
      t: r.t,
      inCurrent: r.qtyIn,
      outCurrent: r.qtyOut,
      inCompare: compare ? Number(s2?.qtyIn ?? 0) : null,
      outCompare: compare ? Number(s2?.qtyOut ?? 0) : null,
    };
  });

  return {
    period: { ...current, granularity: q.granularity },
    compare: compare ? { ...compare } : null,
    kpis: { current: kpiCurrent, compare: kpiCompare },
    series: {
      sales: salesSeriesMerged,
      cash: cashSeriesMerged,
      stock: stockSeriesMerged,
    },
  };
}

