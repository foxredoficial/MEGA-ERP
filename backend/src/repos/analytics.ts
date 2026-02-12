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

type SalesDetailRow = { t: string; ordersTotal: number; ordersCount: number; pdvTotal: number; pdvCount: number };

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

function mergeSalesDetail(a: Array<{ t: string; ordersTotal: number; ordersCount: number }>, b: Array<{ t: string; pdvTotal: number; pdvCount: number }>) {
  const map = new Map<string, SalesDetailRow>();
  for (const r of a) {
    map.set(r.t, { t: r.t, ordersTotal: r.ordersTotal, ordersCount: r.ordersCount, pdvTotal: 0, pdvCount: 0 });
  }
  for (const r of b) {
    const prev = map.get(r.t);
    if (prev) {
      prev.pdvTotal = r.pdvTotal;
      prev.pdvCount = r.pdvCount;
    } else {
      map.set(r.t, { t: r.t, ordersTotal: 0, ordersCount: 0, pdvTotal: r.pdvTotal, pdvCount: r.pdvCount });
    }
  }
  return Array.from(map.values()).sort((x, y) => x.t.localeCompare(y.t));
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

async function salesDetailSeries(userId: string, range: AnalyticsRange, granularity: AnalyticsGranularity) {
  const pool = await getTenantPool(userId);
  const salesBucket = bucketExpr("date", granularity === "hour" ? "day" : granularity);
  const [orderRows] = await pool.query<RowDataPacket[]>(
    `SELECT ${salesBucket} as t, SUM(totals_total) as total, COUNT(*) as count
     FROM sales_orders
     WHERE user_id = ? AND date BETWEEN ? AND ? AND status <> 'canceled'
     GROUP BY t ORDER BY t ASC`,
    [userId, range.start, range.end]
  );

  const pdvBucket = bucketExpr("created_at", granularity);
  const [pdvRows] = await pool.query<RowDataPacket[]>(
    `SELECT ${pdvBucket} as t, SUM(total) as total, COUNT(*) as count
     FROM pdv_sales
     WHERE user_id = ? AND created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY) AND status = 'completed'
     GROUP BY t ORDER BY t ASC`,
    [userId, range.start, range.end]
  );

  const orders = (orderRows as any[]).map((r) => ({ t: String(r.t), ordersTotal: Number(r.total ?? 0), ordersCount: Number(r.count ?? 0) }));
  const pdv = (pdvRows as any[]).map((r) => ({ t: String(r.t), pdvTotal: Number(r.total ?? 0), pdvCount: Number(r.count ?? 0) }));
  return mergeSalesDetail(orders, pdv);
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

async function financialOpenSeries(userId: string, range: AnalyticsRange, granularity: AnalyticsGranularity) {
  const pool = await getTenantPool(userId);
  const bucket = bucketExpr("due_date", granularity === "hour" ? "day" : granularity);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${bucket} as t,
      COALESCE(SUM(CASE WHEN kind='ar' AND status IN ('open','partial') THEN (amount - paid_amount) ELSE 0 END),0) as ar_open,
      COALESCE(SUM(CASE WHEN kind='ap' AND status IN ('open','partial') THEN (amount - paid_amount) ELSE 0 END),0) as ap_open
     FROM financial_titles
     WHERE user_id = ? AND due_date BETWEEN ? AND ?
     GROUP BY t ORDER BY t ASC`,
    [userId, range.start, range.end]
  );

  return (rows as any[]).map((r) => ({ t: String(r.t), arOpen: Number(r.ar_open ?? 0), apOpen: Number(r.ap_open ?? 0) }));
}

async function financialPaidSeries(userId: string, range: AnalyticsRange, granularity: AnalyticsGranularity) {
  const pool = await getTenantPool(userId);
  const bucket = bucketExpr("paid_at", granularity);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${bucket} as t,
      COALESCE(SUM(CASE WHEN ft.kind='ar' THEN fp.amount ELSE 0 END),0) as ar_paid,
      COALESCE(SUM(CASE WHEN ft.kind='ap' THEN fp.amount ELSE 0 END),0) as ap_paid
     FROM financial_payments fp
     JOIN financial_titles ft ON ft.id = fp.title_id
     WHERE fp.user_id = ? AND fp.paid_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
     GROUP BY t ORDER BY t ASC`,
    [userId, range.start, range.end]
  );
  return (rows as any[]).map((r) => ({ t: String(r.t), arPaid: Number(r.ar_paid ?? 0), apPaid: Number(r.ap_paid ?? 0) }));
}

async function topSalesProducts(userId: string, range: AnalyticsRange) {
  const pool = await getTenantPool(userId);
  const [orderRows] = await pool.query<RowDataPacket[]>(
    `SELECT soi.product_id as product_id,
      MAX(soi.description) as name,
      SUM(soi.quantity) as qty,
      SUM(soi.total) as total
     FROM sales_order_items soi
     JOIN sales_orders so ON so.id = soi.order_id
     WHERE so.user_id = ? AND so.date BETWEEN ? AND ? AND so.status <> 'canceled'
     GROUP BY soi.product_id
     ORDER BY total DESC
     LIMIT 10`,
    [userId, range.start, range.end]
  );

  const [pdvRows] = await pool.query<RowDataPacket[]>(
    `SELECT psi.product_id as product_id,
      MAX(psi.name) as name,
      SUM(psi.quantity) as qty,
      SUM(psi.line_total) as total
     FROM pdv_sale_items psi
     JOIN pdv_sales ps ON ps.id = psi.sale_id
     WHERE ps.user_id = ? AND ps.created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY) AND ps.status='completed'
     GROUP BY psi.product_id
     ORDER BY total DESC
     LIMIT 10`,
    [userId, range.start, range.end]
  );

  const map = new Map<string, { productId: string; name: string; qty: number; total: number }>();
  for (const r of orderRows as any[]) {
    const id = String(r.product_id ?? "");
    if (!id) continue;
    map.set(id, { productId: id, name: String(r.name ?? ""), qty: Number(r.qty ?? 0), total: Number(r.total ?? 0) });
  }
  for (const r of pdvRows as any[]) {
    const id = String(r.product_id ?? "");
    if (!id) continue;
    const prev = map.get(id);
    if (prev) {
      prev.qty += Number(r.qty ?? 0);
      prev.total += Number(r.total ?? 0);
      if (!prev.name) prev.name = String(r.name ?? "");
    } else {
      map.set(id, { productId: id, name: String(r.name ?? ""), qty: Number(r.qty ?? 0), total: Number(r.total ?? 0) });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 10);
}

async function lowStockProducts(userId: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, sku, stock, stock_min
     FROM products
     WHERE user_id = ? AND stock_min IS NOT NULL AND stock <= stock_min
     ORDER BY (stock_min - stock) DESC
     LIMIT 10`,
    [userId]
  );
  return (rows as any[]).map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ""),
    sku: r.sku ? String(r.sku) : null,
    stock: Number(r.stock ?? 0),
    stockMin: Number(r.stock_min ?? 0),
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

  const [finOverdueAgg] = await pool.query<RowDataPacket[]>(
    `SELECT
      COALESCE(SUM(CASE WHEN kind='ar' AND status IN ('open','partial') AND due_date < CURDATE() THEN (amount - paid_amount) ELSE 0 END),0) as ar_overdue,
      COALESCE(SUM(CASE WHEN kind='ap' AND status IN ('open','partial') AND due_date < CURDATE() THEN (amount - paid_amount) ELSE 0 END),0) as ap_overdue
     FROM financial_titles
     WHERE user_id = ?`,
    [userId]
  );
  const fo = (finOverdueAgg as any[])[0] ?? {};

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
    avgTicket: salesCount > 0 ? salesTotal / salesCount : 0,
    salesOrdersTotal: Number(r.sales_orders_total ?? 0),
    salesOrdersCount: Number(r.sales_orders_count ?? 0),
    pdvTotal: Number(r.pdv_total ?? 0),
    pdvCount: Number(r.pdv_count ?? 0),
    cashIn: Number(c.amount_in ?? 0),
    cashOut: Number(c.amount_out ?? 0),
    cashNet: Number(c.amount_in ?? 0) - Number(c.amount_out ?? 0),
    cashTransactions: Number(c.count ?? 0),
    receivableOpen: Number(f.ar_open ?? 0),
    payableOpen: Number(f.ap_open ?? 0),
    receivableOverdue: Number(fo.ar_overdue ?? 0),
    payableOverdue: Number(fo.ap_overdue ?? 0),
    stockInQty: Number(s.qty_in ?? 0),
    stockOutQty: Number(s.qty_out ?? 0),
    stockNetQty: Number(s.qty_in ?? 0) - Number(s.qty_out ?? 0),
    productsCount: Number(p.products_count ?? 0),
    lowStockCount: Number(p.low_stock ?? 0),
  };
}

export async function getDashboardAnalytics(userId: string, q: DashboardQuery) {
  const current = q.range;
  const compare = q.compare;

  const [kpiCurrent, salesCurrent, salesDetailCurrent, cashCurrent, stockCurrent, finOpenCurrent, finPaidCurrent, topSalesCurrent, lowStock] = await Promise.all([
    kpis(userId, current),
    salesSeries(userId, current, q.granularity),
    salesDetailSeries(userId, current, q.granularity),
    cashFlowSeries(userId, current, q.granularity),
    stockSeries(userId, current, q.granularity),
    financialOpenSeries(userId, current, q.granularity),
    financialPaidSeries(userId, current, q.granularity),
    topSalesProducts(userId, current),
    lowStockProducts(userId),
  ]);

  let kpiCompare: any = null;
  let salesCompare: SeriesRow[] | null = null;
  let salesDetailCompare: SalesDetailRow[] | null = null;
  let cashCompare: Array<{ t: string; amountIn: number; amountOut: number }> | null = null;
  let stockCompare: Array<{ t: string; qtyIn: number; qtyOut: number }> | null = null;
  let finOpenCompare: Array<{ t: string; arOpen: number; apOpen: number }> | null = null;
  let finPaidCompare: Array<{ t: string; arPaid: number; apPaid: number }> | null = null;

  if (compare) {
    [kpiCompare, salesCompare, salesDetailCompare, cashCompare, stockCompare, finOpenCompare, finPaidCompare] = await Promise.all([
      kpis(userId, compare),
      salesSeries(userId, compare, q.granularity),
      salesDetailSeries(userId, compare, q.granularity),
      cashFlowSeries(userId, compare, q.granularity),
      stockSeries(userId, compare, q.granularity),
      financialOpenSeries(userId, compare, q.granularity),
      financialPaidSeries(userId, compare, q.granularity),
    ]);
  }

  const compareSalesMap = new Map((salesCompare ?? []).map((r) => [r.t, Number(r.total ?? 0)]));
  const compareSalesDetailMap = new Map((salesDetailCompare ?? []).map((r) => [r.t, r]));
  const compareCashMap = new Map((cashCompare ?? []).map((r) => [r.t, r]));
  const compareStockMap = new Map((stockCompare ?? []).map((r) => [r.t, r]));
  const compareFinOpenMap = new Map((finOpenCompare ?? []).map((r) => [r.t, r]));
  const compareFinPaidMap = new Map((finPaidCompare ?? []).map((r) => [r.t, r]));

  const salesSeriesMerged = salesCurrent.map((r) => ({
    t: r.t,
    current: Number(r.total ?? 0),
    compare: compare ? Number(compareSalesMap.get(r.t) ?? 0) : null,
  }));

  const salesDetailMerged = salesDetailCurrent.map((r) => {
    const c2 = compare ? compareSalesDetailMap.get(r.t) : undefined;
    return {
      t: r.t,
      ordersTotal: r.ordersTotal,
      pdvTotal: r.pdvTotal,
      ordersCount: r.ordersCount,
      pdvCount: r.pdvCount,
      ordersTotalCompare: compare ? Number(c2?.ordersTotal ?? 0) : null,
      pdvTotalCompare: compare ? Number(c2?.pdvTotal ?? 0) : null,
      ordersCountCompare: compare ? Number(c2?.ordersCount ?? 0) : null,
      pdvCountCompare: compare ? Number(c2?.pdvCount ?? 0) : null,
    };
  });

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

  const financialOpenMerged = finOpenCurrent.map((r) => {
    const c2 = compare ? compareFinOpenMap.get(r.t) : undefined;
    return {
      t: r.t,
      arOpenCurrent: r.arOpen,
      apOpenCurrent: r.apOpen,
      arOpenCompare: compare ? Number(c2?.arOpen ?? 0) : null,
      apOpenCompare: compare ? Number(c2?.apOpen ?? 0) : null,
    };
  });

  const financialPaidMerged = finPaidCurrent.map((r) => {
    const c2 = compare ? compareFinPaidMap.get(r.t) : undefined;
    return {
      t: r.t,
      arPaidCurrent: r.arPaid,
      apPaidCurrent: r.apPaid,
      arPaidCompare: compare ? Number(c2?.arPaid ?? 0) : null,
      apPaidCompare: compare ? Number(c2?.apPaid ?? 0) : null,
    };
  });

  return {
    period: { ...current, granularity: q.granularity },
    compare: compare ? { ...compare } : null,
    kpis: { current: kpiCurrent, compare: kpiCompare },
    series: {
      sales: salesSeriesMerged,
      salesDetail: salesDetailMerged,
      cash: cashSeriesMerged,
      stock: stockSeriesMerged,
      financialOpen: financialOpenMerged,
      financialPaid: financialPaidMerged,
    },
    lists: {
      topSalesProducts: topSalesCurrent,
      lowStockProducts: lowStock,
    },
  };
}
