import { apiFetch } from "./api";

export type AnalyticsGranularity = "hour" | "day" | "week" | "month";

export type DashboardAnalytics = {
  period: { start: string; end: string; granularity: AnalyticsGranularity };
  compare: { start: string; end: string } | null;
  kpis: {
    current: {
      salesTotal: number;
      salesCount: number;
      avgTicket: number;
      salesOrdersTotal: number;
      salesOrdersCount: number;
      pdvTotal: number;
      pdvCount: number;
      cashIn: number;
      cashOut: number;
      cashNet: number;
      cashTransactions: number;
      receivableOpen: number;
      payableOpen: number;
      receivableOverdue: number;
      payableOverdue: number;
      stockInQty: number;
      stockOutQty: number;
      stockNetQty: number;
      productsCount: number;
      lowStockCount: number;
    };
    compare: any;
  };
  series: {
    sales: Array<{ t: string; current: number; compare: number | null }>;
    salesDetail: Array<{
      t: string;
      ordersTotal: number;
      pdvTotal: number;
      ordersCount: number;
      pdvCount: number;
      ordersTotalCompare: number | null;
      pdvTotalCompare: number | null;
      ordersCountCompare: number | null;
      pdvCountCompare: number | null;
    }>;
    cash: Array<{ t: string; inCurrent: number; outCurrent: number; inCompare: number | null; outCompare: number | null }>;
    stock: Array<{ t: string; inCurrent: number; outCurrent: number; inCompare: number | null; outCompare: number | null }>;
    financialOpen: Array<{ t: string; arOpenCurrent: number; apOpenCurrent: number; arOpenCompare: number | null; apOpenCompare: number | null }>;
    financialPaid: Array<{ t: string; arPaidCurrent: number; apPaidCurrent: number; arPaidCompare: number | null; apPaidCompare: number | null }>;
  };
  lists: {
    topSalesProducts: Array<{ productId: string; name: string; qty: number; total: number }>;
    lowStockProducts: Array<{ id: string; name: string; sku: string | null; stock: number; stockMin: number }>;
  };
};

export async function getDashboardAnalytics(args: {
  start: string;
  end: string;
  granularity: AnalyticsGranularity;
  compareStart?: string;
  compareEnd?: string;
}) {
  const params = new URLSearchParams();
  params.set("start", args.start);
  params.set("end", args.end);
  params.set("granularity", args.granularity);
  if (args.compareStart && args.compareEnd) {
    params.set("compareStart", args.compareStart);
    params.set("compareEnd", args.compareEnd);
  }

  return apiFetch<DashboardAnalytics>(`/api/analytics/dashboard?${params.toString()}`, { method: "GET" });
}

export type TopProductsItem = { productId: string; name: string; qty: number; total: number };

export async function getTopProducts(args: {
  start: string;
  end: string;
  metric: "total" | "qty";
  order: "top" | "bottom";
  limit: number;
}) {
  const params = new URLSearchParams();
  params.set("start", args.start);
  params.set("end", args.end);
  params.set("productsMetric", args.metric);
  params.set("productsOrder", args.order);
  params.set("productsLimit", String(args.limit));
  return apiFetch<{ items: TopProductsItem[] }>(`/api/analytics/top-products?${params.toString()}`, { method: "GET" });
}
