import { apiFetch } from "./api";

export type AnalyticsGranularity = "hour" | "day" | "week" | "month";

export type DashboardAnalytics = {
  period: { start: string; end: string; granularity: AnalyticsGranularity };
  compare: { start: string; end: string } | null;
  kpis: {
    current: {
      salesTotal: number;
      salesCount: number;
      cashIn: number;
      cashOut: number;
      cashTransactions: number;
      receivableOpen: number;
      payableOpen: number;
      stockInQty: number;
      stockOutQty: number;
      productsCount: number;
      lowStockCount: number;
    };
    compare: any;
  };
  series: {
    sales: Array<{ t: string; current: number; compare: number | null }>;
    cash: Array<{ t: string; inCurrent: number; outCurrent: number; inCompare: number | null; outCompare: number | null }>;
    stock: Array<{ t: string; inCurrent: number; outCurrent: number; inCompare: number | null; outCompare: number | null }>;
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

