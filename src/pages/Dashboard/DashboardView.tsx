import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Banknote, Boxes, CreditCard, FileText, ShoppingCart, TrendingDown, TrendingUp, Wallet, X } from "lucide-react";
import { subDays } from "date-fns";
import { AdvancedDateFilter } from "@/components/filters/AdvancedDateFilter";
import { computeCompare, computePreset, formatRangeLabel, suggestedGranularity, type DateFilterValue } from "@/components/filters/dateRange";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatCurrency, toLocalIsoDate } from "@/lib/utils";
import { getDashboardAnalytics, getTopProducts, type AnalyticsGranularity, type DashboardAnalytics, type TopProductsItem } from "@/lib/api_analytics";
import { DashboardKpiCard } from "./DashboardKpiCard";
import { SeriesChart } from "./charts/SeriesChart";
import { onAppEvent } from "@/lib/appEvents";

type DashboardModule = "overview" | "sales" | "stock" | "finance";

function toCompareRange(v: DateFilterValue) {
  if (v.compare.mode === "none") return null;
  if (v.compare.mode === "custom") return v.compare.range ?? null;
  const derived = computeCompare(v.range, v.compare.mode);
  return derived ?? null;
}

function normalizeDashboardGranularity(g: DateFilterValue["granularity"]): AnalyticsGranularity {
  return (g === "hour" ? "day" : g) as AnalyticsGranularity;
}

export function DashboardView() {
  const aliveRef = useRef(true);
  const [module, setModule] = useState<DashboardModule>("overview");
  const [filter, setFilter] = useState<DateFilterValue>(() => {
    const range = computePreset("this_month");
    return {
      preset: "this_month",
      range,
      granularity: suggestedGranularity(range),
      compare: { mode: "none" },
    };
  });

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [salesMetric, setSalesMetric] = useState<"total" | "orders" | "pdv">("total");
  const [salesCountMetric, setSalesCountMetric] = useState<"total" | "orders" | "pdv">("total");
  const [cashMetric, setCashMetric] = useState<"in" | "out" | "net">("net");
  const [stockMetric, setStockMetric] = useState<"in" | "out" | "net">("net");
  const [finOpenMetric, setFinOpenMetric] = useState<"ar" | "ap">("ar");
  const [finPaidMetric, setFinPaidMetric] = useState<"ar" | "ap">("ar");
  const [topSort, setTopSort] = useState<"total" | "qty">("total");
  const [topOrder, setTopOrder] = useState<"top" | "bottom">("top");
  const [topLimit, setTopLimit] = useState(10);
  const [topLimitInput, setTopLimitInput] = useState("10");

  const [kpiOverrides, setKpiOverrides] = useState<Record<string, DateFilterValue | null>>({});
  const [kpiState, setKpiState] = useState<
    Record<
      string,
      {
        loading: boolean;
        error: string | null;
        data: DashboardAnalytics | null;
      }
    >
  >({});
  const kpiReqRef = useRef<Record<string, number>>({});

  const compareRange = useMemo(() => toCompareRange(filter), [filter]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    if (!aliveRef.current) return;
    setLoading(true);
    setError(null);
    const res = await getDashboardAnalytics({
      start: toLocalIsoDate(filter.range.start),
      end: toLocalIsoDate(filter.range.end),
      granularity: normalizeDashboardGranularity(filter.granularity),
      compareStart: compareRange ? toLocalIsoDate(compareRange.start) : undefined,
      compareEnd: compareRange ? toLocalIsoDate(compareRange.end) : undefined,
    });
    if (!aliveRef.current) return;
    setData(res);
    setLoading(false);
  }, [compareRange, filter.granularity, filter.range.end, filter.range.start]);

  const [topProductsLoading, setTopProductsLoading] = useState(false);
  const [topProductsError, setTopProductsError] = useState<string | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductsItem[]>([]);
  const topProductsReqRef = useRef(0);

  const refreshTopProducts = useCallback(async () => {
    const reqId = ++topProductsReqRef.current;
    setTopProductsLoading(true);
    setTopProductsError(null);
    try {
      const res = await getTopProducts({
        start: toLocalIsoDate(filter.range.start),
        end: toLocalIsoDate(filter.range.end),
        metric: topSort,
        order: topOrder,
        limit: topLimit,
      });
      if (topProductsReqRef.current !== reqId) return;
      setTopProducts(res.items ?? []);
    } catch (e) {
      if (topProductsReqRef.current !== reqId) return;
      setTopProducts([]);
      setTopProductsError((e as Error).message);
    } finally {
      if (topProductsReqRef.current === reqId) setTopProductsLoading(false);
    }
  }, [filter.range.end, filter.range.start, topLimit, topOrder, topSort]);

  useEffect(() => {
    void refreshTopProducts().catch(() => undefined);
  }, [refreshTopProducts]);

  const applyKpiFilter = useCallback(
    async (id: string, next: DateFilterValue | null) => {
      setKpiOverrides((prev) => ({ ...prev, [id]: next }));
      if (!next) {
        setKpiState((prev) => ({ ...prev, [id]: { loading: false, error: null, data: null } }));
        return;
      }

      const reqId = (kpiReqRef.current[id] ?? 0) + 1;
      kpiReqRef.current[id] = reqId;

      setKpiState((prev) => ({ ...prev, [id]: { loading: true, error: null, data: prev[id]?.data ?? null } }));
      const r2 = toCompareRange(next);
      try {
        const res = await getDashboardAnalytics({
          start: toLocalIsoDate(next.range.start),
          end: toLocalIsoDate(next.range.end),
          granularity: normalizeDashboardGranularity(next.granularity),
          compareStart: r2 ? toLocalIsoDate(r2.start) : undefined,
          compareEnd: r2 ? toLocalIsoDate(r2.end) : undefined,
        });
        if (kpiReqRef.current[id] !== reqId) return;
        setKpiState((prev) => ({ ...prev, [id]: { loading: false, error: null, data: res } }));
      } catch (e) {
        if (kpiReqRef.current[id] !== reqId) return;
        setKpiState((prev) => ({ ...prev, [id]: { loading: false, error: (e as Error).message, data: null } }));
      }
    },
    []
  );

  const [chartOverrides, setChartOverrides] = useState<Record<string, DateFilterValue | null>>({});
  const [chartState, setChartState] = useState<
    Record<
      string,
      {
        loading: boolean;
        error: string | null;
        data: DashboardAnalytics | null;
      }
    >
  >({});
  const chartReqRef = useRef<Record<string, number>>({});

  const applyChartFilter = useCallback(async (id: string, next: DateFilterValue | null) => {
    setChartOverrides((prev) => ({ ...prev, [id]: next }));
    if (!next) {
      setChartState((prev) => ({ ...prev, [id]: { loading: false, error: null, data: null } }));
      return;
    }

    const reqId = (chartReqRef.current[id] ?? 0) + 1;
    chartReqRef.current[id] = reqId;

    setChartState((prev) => ({ ...prev, [id]: { loading: true, error: null, data: prev[id]?.data ?? null } }));
    const r2 = toCompareRange(next);
    try {
      const res = await getDashboardAnalytics({
        start: toLocalIsoDate(next.range.start),
        end: toLocalIsoDate(next.range.end),
        granularity: normalizeDashboardGranularity(next.granularity),
        compareStart: r2 ? toLocalIsoDate(r2.start) : undefined,
        compareEnd: r2 ? toLocalIsoDate(r2.end) : undefined,
      });
      if (chartReqRef.current[id] !== reqId) return;
      setChartState((prev) => ({ ...prev, [id]: { loading: false, error: null, data: res } }));
    } catch (e) {
      if (chartReqRef.current[id] !== reqId) return;
      setChartState((prev) => ({ ...prev, [id]: { loading: false, error: (e as Error).message, data: null } }));
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await reload();
      } catch (e) {
        if (aliveRef.current) setError((e as Error).message);
        if (aliveRef.current) setLoading(false);
      }
    })();
  }, [reload]);

  useEffect(() => {
    const off = onAppEvent("data:changed", (d) => {
      if (d.scope && d.scope !== "all") {
        if (d.scope !== "finance" && d.scope !== "cash" && d.scope !== "stock" && d.scope !== "sales") return;
      }
      void reload().catch(() => undefined);
      void refreshTopProducts().catch(() => undefined);
    });
    return off;
  }, [refreshTopProducts, reload]);

  useEffect(() => {
    const onFocus = () => {
      void reload().catch(() => undefined);
      void refreshTopProducts().catch(() => undefined);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void reload().catch(() => undefined);
        void refreshTopProducts().catch(() => undefined);
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshTopProducts, reload]);

  const titlePeriod = useMemo(() => formatRangeLabel(filter.range), [filter.range]);
  const titleCompare = useMemo(() => (compareRange ? formatRangeLabel(compareRange) : null), [compareRange]);

  const k = data?.kpis.current;
  const k2 = data?.kpis.compare as any;

  const chartSubtitle = useCallback((base: string) => base, []);

  function deltaHintCurrency(cur?: number, prev?: number) {
    if (cur === undefined || prev === undefined || prev === null) return undefined;
    const d = Number(cur) - Number(prev);
    const sign = d >= 0 ? "+" : "-";
    const pct = prev !== 0 ? Math.abs(d / prev) * 100 : null;
    return `${sign}${formatCurrency(Math.abs(d))}${pct !== null ? ` (${pct.toFixed(1)}%)` : ""} vs período anterior`;
  }

  function deltaHintNumber(cur?: number, prev?: number) {
    if (cur === undefined || prev === undefined || prev === null) return undefined;
    const d = Number(cur) - Number(prev);
    const sign = d >= 0 ? "+" : "-";
    const pct = prev !== 0 ? Math.abs(d / prev) * 100 : null;
    return `${sign}${Math.abs(d).toFixed(0)}${pct !== null ? ` (${pct.toFixed(1)}%)` : ""} vs período anterior`;
  }

  const [kpiMenu, setKpiMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!kpiMenu) return;
    const onDown = () => setKpiMenu(null);
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setKpiMenu(null);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onDown, { passive: true, capture: true } as any);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onDown, { capture: true } as any);
      window.removeEventListener("keydown", onEsc);
    };
  }, [kpiMenu]);

  function kpiFilterLabel(v: DateFilterValue) {
    const parts: string[] = [`Filtro: ${formatRangeLabel(v.range)}`];
    const cr = toCompareRange(v);
    if (cr) parts.push(`Comparação: ${formatRangeLabel(cr)}`);
    return parts.join(" · ");
  }

  function makeRangeLastDays(days: number) {
    const end = new Date();
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const start = subDays(endDay, Math.max(0, days - 1));
    return { start, end: endDay };
  }

  function makeKpiFilter(preset: "today" | "last_7" | "last_30" | "this_month" | "last_month", compareMode: "none" | "previous_period") {
    const range =
      preset === "today"
        ? computePreset("today")
        : preset === "this_month"
          ? computePreset("this_month")
          : preset === "last_month"
            ? computePreset("last_month")
            : preset === "last_7"
              ? makeRangeLastDays(7)
              : makeRangeLastDays(30);

    return {
      preset: "custom" as const,
      range,
      granularity: suggestedGranularity(range),
      compare: { mode: compareMode },
    } satisfies DateFilterValue;
  }

  function openKpiMenu(e: any, id: string) {
    e.preventDefault();
    setKpiMenu({ id, x: e.clientX, y: e.clientY });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Central</h1>
        </div>
        <div className="flex items-center gap-2">
          <AdvancedDateFilter
            label="Data"
            value={filter}
            onChange={setFilter}
            showLabelInChip={false}
            size="md"
            allowedGranularities={["day", "week", "month"]}
          />
          <Button
            variant="outline"
            onClick={() => {
              void reload().catch(() => undefined);
              void refreshTopProducts().catch(() => undefined);
            }}
            disabled={loading || topProductsLoading}
          >
            Atualizar
          </Button>
          <Link to="/app/relatorios">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white">Relatórios</Button>
          </Link>
        </div>
      </div>

      {kpiMenu ? (
        <div
          className="fixed inset-0 z-50"
          onContextMenu={(e) => {
            e.preventDefault();
            setKpiMenu(null);
          }}
        >
          <div
            className="fixed rounded-xl border border-slate-200 bg-white shadow-xl p-1 w-72"
            style={{ left: Math.min(kpiMenu.x, window.innerWidth - 300), top: Math.min(kpiMenu.y, window.innerHeight - 260) }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 text-xs font-semibold text-slate-500">Filtrar este card</div>
            <button
              type="button"
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-100 text-slate-800"
              onClick={() => void applyKpiFilter(kpiMenu.id, null).finally(() => setKpiMenu(null))}
            >
              Usar filtro global
            </button>
            <div className="my-1 h-px bg-slate-100" />
            <button
              type="button"
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-100 text-slate-800"
              onClick={() => void applyKpiFilter(kpiMenu.id, makeKpiFilter("today", "none")).finally(() => setKpiMenu(null))}
            >
              Hoje
            </button>
            <button
              type="button"
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-100 text-slate-800"
              onClick={() => void applyKpiFilter(kpiMenu.id, makeKpiFilter("last_7", "previous_period")).finally(() => setKpiMenu(null))}
            >
              Últimos 7 dias (comparar anterior)
            </button>
            <button
              type="button"
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-100 text-slate-800"
              onClick={() => void applyKpiFilter(kpiMenu.id, makeKpiFilter("last_30", "previous_period")).finally(() => setKpiMenu(null))}
            >
              Últimos 30 dias (comparar anterior)
            </button>
            <button
              type="button"
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-100 text-slate-800"
              onClick={() => void applyKpiFilter(kpiMenu.id, makeKpiFilter("this_month", "previous_period")).finally(() => setKpiMenu(null))}
            >
              Este mês (comparar anterior)
            </button>
            <button
              type="button"
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-100 text-slate-800"
              onClick={() => void applyKpiFilter(kpiMenu.id, makeKpiFilter("last_month", "previous_period")).finally(() => setKpiMenu(null))}
            >
              Mês passado (comparar anterior)
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          className={module === "overview" ? "rounded-full bg-slate-900 px-4 py-2 text-sm text-white" : "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"}
          onClick={() => setModule("overview")}
        >
          Visão geral
        </button>
        <button
          className={module === "sales" ? "rounded-full bg-slate-900 px-4 py-2 text-sm text-white" : "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"}
          onClick={() => setModule("sales")}
        >
          Vendas
        </button>
        <button
          className={module === "stock" ? "rounded-full bg-slate-900 px-4 py-2 text-sm text-white" : "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"}
          onClick={() => setModule("stock")}
        >
          Estoque
        </button>
        <button
          className={module === "finance" ? "rounded-full bg-slate-900 px-4 py-2 text-sm text-white" : "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"}
          onClick={() => setModule("finance")}
        >
          Financeiro
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {(module === "overview" || module === "sales") && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(() => {
            const v = kpiOverrides["salesTotal"];
            const st = kpiState["salesTotal"];
            const src = v ? st?.data : data;
            const srcLoading = v ? Boolean(st?.loading) : loading;
            const srcK = src?.kpis.current;
            const srcK2 = src?.kpis.compare as any;
            const srcCompare = v ? toCompareRange(v) : compareRange;
            const delta = srcCompare && srcK2 ? deltaHintCurrency(srcK?.salesTotal, Number(srcK2.salesTotal ?? 0)) : undefined;
            const hint = [v ? kpiFilterLabel(v) : null, delta].filter(Boolean).join(" · ") || undefined;
            const value = srcLoading || !srcK ? "Carregando…" : formatCurrency(srcK.salesTotal);
            return (
              <div onContextMenu={(e) => openKpiMenu(e, "salesTotal")}>
                <DashboardKpiCard label="Vendas (total)" value={value} hint={hint} icon={ShoppingCart} tone="blue" />
              </div>
            );
          })()}
          {(() => {
            const v = kpiOverrides["avgTicket"];
            const st = kpiState["avgTicket"];
            const src = v ? st?.data : data;
            const srcLoading = v ? Boolean(st?.loading) : loading;
            const srcK = src?.kpis.current;
            const srcK2 = src?.kpis.compare as any;
            const srcCompare = v ? toCompareRange(v) : compareRange;
            const delta = srcCompare && srcK2 ? deltaHintCurrency(srcK?.avgTicket, Number(srcK2.avgTicket ?? 0)) : undefined;
            const hint = [v ? kpiFilterLabel(v) : null, delta].filter(Boolean).join(" · ") || undefined;
            const value = srcLoading || !srcK ? "Carregando…" : formatCurrency(srcK.avgTicket);
            return (
              <div onContextMenu={(e) => openKpiMenu(e, "avgTicket")}>
                <DashboardKpiCard label="Ticket médio" value={value} hint={hint} icon={Wallet} tone="slate" />
              </div>
            );
          })()}
          {(() => {
            const v = kpiOverrides["salesCount"];
            const st = kpiState["salesCount"];
            const src = v ? st?.data : data;
            const srcLoading = v ? Boolean(st?.loading) : loading;
            const srcK = src?.kpis.current;
            const srcK2 = src?.kpis.compare as any;
            const srcCompare = v ? toCompareRange(v) : compareRange;
            const delta = srcCompare && srcK2 ? deltaHintNumber(srcK?.salesCount, Number(srcK2.salesCount ?? 0)) : undefined;
            const hintBase = delta ?? (srcLoading ? undefined : "Pedidos + PDV");
            const hint = [v ? kpiFilterLabel(v) : null, hintBase].filter(Boolean).join(" · ") || undefined;
            const value = srcLoading || !srcK ? "Carregando…" : String(srcK.salesCount);
            return (
              <div onContextMenu={(e) => openKpiMenu(e, "salesCount")}>
                <DashboardKpiCard label="Pedidos (total)" value={value} hint={hint} icon={FileText} tone="slate" />
              </div>
            );
          })()}
          {(() => {
            const v = kpiOverrides["pdvTotal"];
            const st = kpiState["pdvTotal"];
            const src = v ? st?.data : data;
            const srcLoading = v ? Boolean(st?.loading) : loading;
            const srcK = src?.kpis.current;
            const srcK2 = src?.kpis.compare as any;
            const srcCompare = v ? toCompareRange(v) : compareRange;
            const delta = srcCompare && srcK2 ? deltaHintCurrency(srcK?.pdvTotal, Number(srcK2.pdvTotal ?? 0)) : undefined;
            const hint = [v ? kpiFilterLabel(v) : null, delta].filter(Boolean).join(" · ") || undefined;
            const value = srcLoading || !srcK ? "Carregando…" : formatCurrency(srcK.pdvTotal);
            return (
              <div onContextMenu={(e) => openKpiMenu(e, "pdvTotal")}>
                <DashboardKpiCard label="PDV (vendas)" value={value} hint={hint} icon={ShoppingCart} tone="green" />
              </div>
            );
          })()}
        </div>
      )}

      {(module === "overview" || module === "finance") && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(() => {
            const v = kpiOverrides["receivableOpen"];
            const st = kpiState["receivableOpen"];
            const src = v ? st?.data : data;
            const srcLoading = v ? Boolean(st?.loading) : loading;
            const srcK = src?.kpis.current;
            const srcK2 = src?.kpis.compare as any;
            const srcCompare = v ? toCompareRange(v) : compareRange;
            const delta = srcCompare && srcK2 ? deltaHintCurrency(srcK?.receivableOpen, Number(srcK2.receivableOpen ?? 0)) : undefined;
            const hintBase = delta ?? (srcLoading ? undefined : "Por vencimento");
            const hint = [v ? kpiFilterLabel(v) : null, hintBase].filter(Boolean).join(" · ") || undefined;
            const value = srcLoading || !srcK ? "Carregando…" : formatCurrency(srcK.receivableOpen);
            return (
              <div onContextMenu={(e) => openKpiMenu(e, "receivableOpen")}>
                <DashboardKpiCard label="A Receber (em aberto)" value={value} hint={hint} icon={TrendingUp} tone="green" />
              </div>
            );
          })()}
          {(() => {
            const v = kpiOverrides["payableOpen"];
            const st = kpiState["payableOpen"];
            const src = v ? st?.data : data;
            const srcLoading = v ? Boolean(st?.loading) : loading;
            const srcK = src?.kpis.current;
            const srcK2 = src?.kpis.compare as any;
            const srcCompare = v ? toCompareRange(v) : compareRange;
            const delta = srcCompare && srcK2 ? deltaHintCurrency(srcK?.payableOpen, Number(srcK2.payableOpen ?? 0)) : undefined;
            const hintBase = delta ?? (srcLoading ? undefined : "Por vencimento");
            const hint = [v ? kpiFilterLabel(v) : null, hintBase].filter(Boolean).join(" · ") || undefined;
            const value = srcLoading || !srcK ? "Carregando…" : formatCurrency(srcK.payableOpen);
            return (
              <div onContextMenu={(e) => openKpiMenu(e, "payableOpen")}>
                <DashboardKpiCard label="A Pagar (em aberto)" value={value} hint={hint} icon={TrendingDown} tone="amber" />
              </div>
            );
          })()}
          {(() => {
            const v = kpiOverrides["receivableOverdue"];
            const st = kpiState["receivableOverdue"];
            const src = v ? st?.data : data;
            const srcLoading = v ? Boolean(st?.loading) : loading;
            const srcK = src?.kpis.current;
            const srcK2 = src?.kpis.compare as any;
            const srcCompare = v ? toCompareRange(v) : compareRange;
            const delta = srcCompare && srcK2 ? deltaHintCurrency(srcK?.receivableOverdue, Number(srcK2.receivableOverdue ?? 0)) : undefined;
            const hint = [v ? kpiFilterLabel(v) : null, delta].filter(Boolean).join(" · ") || undefined;
            const value = srcLoading || !srcK ? "Carregando…" : formatCurrency(srcK.receivableOverdue);
            return (
              <div onContextMenu={(e) => openKpiMenu(e, "receivableOverdue")}>
                <DashboardKpiCard label="A Receber (vencido)" value={value} hint={hint} icon={TrendingUp} tone="red" />
              </div>
            );
          })()}
          {(() => {
            const v = kpiOverrides["payableOverdue"];
            const st = kpiState["payableOverdue"];
            const src = v ? st?.data : data;
            const srcLoading = v ? Boolean(st?.loading) : loading;
            const srcK = src?.kpis.current;
            const srcK2 = src?.kpis.compare as any;
            const srcCompare = v ? toCompareRange(v) : compareRange;
            const delta = srcCompare && srcK2 ? deltaHintCurrency(srcK?.payableOverdue, Number(srcK2.payableOverdue ?? 0)) : undefined;
            const hint = [v ? kpiFilterLabel(v) : null, delta].filter(Boolean).join(" · ") || undefined;
            const value = srcLoading || !srcK ? "Carregando…" : formatCurrency(srcK.payableOverdue);
            return (
              <div onContextMenu={(e) => openKpiMenu(e, "payableOverdue")}>
                <DashboardKpiCard label="A Pagar (vencido)" value={value} hint={hint} icon={TrendingDown} tone="red" />
              </div>
            );
          })()}
        </div>
      )}

      {(module === "overview" || module === "stock") && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(() => {
            const v = kpiOverrides["stockInQty"];
            const st = kpiState["stockInQty"];
            const src = v ? st?.data : data;
            const srcLoading = v ? Boolean(st?.loading) : loading;
            const srcK = src?.kpis.current;
            const srcK2 = src?.kpis.compare as any;
            const srcCompare = v ? toCompareRange(v) : compareRange;
            const delta = srcCompare && srcK2 ? deltaHintNumber(srcK?.stockInQty, Number(srcK2.stockInQty ?? 0)) : undefined;
            const hint = [v ? kpiFilterLabel(v) : null, delta].filter(Boolean).join(" · ") || undefined;
            const value = srcLoading || !srcK ? "Carregando…" : String(srcK.stockInQty);
            return (
              <div onContextMenu={(e) => openKpiMenu(e, "stockInQty")}>
                <DashboardKpiCard label="Estoque (entradas)" value={value} hint={hint} icon={Boxes} tone="green" />
              </div>
            );
          })()}
          {(() => {
            const v = kpiOverrides["stockOutQty"];
            const st = kpiState["stockOutQty"];
            const src = v ? st?.data : data;
            const srcLoading = v ? Boolean(st?.loading) : loading;
            const srcK = src?.kpis.current;
            const srcK2 = src?.kpis.compare as any;
            const srcCompare = v ? toCompareRange(v) : compareRange;
            const delta = srcCompare && srcK2 ? deltaHintNumber(srcK?.stockOutQty, Number(srcK2.stockOutQty ?? 0)) : undefined;
            const hint = [v ? kpiFilterLabel(v) : null, delta].filter(Boolean).join(" · ") || undefined;
            const value = srcLoading || !srcK ? "Carregando…" : String(srcK.stockOutQty);
            return (
              <div onContextMenu={(e) => openKpiMenu(e, "stockOutQty")}>
                <DashboardKpiCard label="Estoque (saídas)" value={value} hint={hint} icon={Boxes} tone="amber" />
              </div>
            );
          })()}
          {(() => {
            const v = kpiOverrides["stockNetQty"];
            const st = kpiState["stockNetQty"];
            const src = v ? st?.data : data;
            const srcLoading = v ? Boolean(st?.loading) : loading;
            const srcK = src?.kpis.current;
            const srcK2 = src?.kpis.compare as any;
            const srcCompare = v ? toCompareRange(v) : compareRange;
            const delta = srcCompare && srcK2 ? deltaHintNumber(srcK?.stockNetQty, Number(srcK2.stockNetQty ?? 0)) : undefined;
            const hint = [v ? kpiFilterLabel(v) : null, delta].filter(Boolean).join(" · ") || undefined;
            const value = srcLoading || !srcK ? "Carregando…" : String(srcK.stockNetQty);
            return (
              <div onContextMenu={(e) => openKpiMenu(e, "stockNetQty")}>
                <DashboardKpiCard label="Saldo (estoque)" value={value} hint={hint} icon={Boxes} tone="slate" />
              </div>
            );
          })()}
          {(() => {
            const v = kpiOverrides["lowStock"];
            const st = kpiState["lowStock"];
            const src = v ? st?.data : data;
            const srcLoading = v ? Boolean(st?.loading) : loading;
            const srcK = src?.kpis.current;
            const value = srcLoading || !srcK ? "Carregando…" : `${srcK.lowStockCount}/${srcK.productsCount}`;
            const hint = v ? kpiFilterLabel(v) : "Abaixo do mínimo";
            return (
              <div onContextMenu={(e) => openKpiMenu(e, "lowStock")}>
                <DashboardKpiCard label="Produtos críticos" value={value} hint={hint} icon={Boxes} tone="red" />
              </div>
            );
          })()}
        </div>
      )}

      {(module === "overview" || module === "sales") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(() => {
            const id = "chart_sales_amount";
            const v = chartOverrides[id];
            const st = chartState[id];
            const src = v ? st?.data : data;
            const srcLoading = v ? Boolean(st?.loading) : loading;
            const cr = v ? toCompareRange(v) : compareRange;
            const subtitle = v ? `Comparativo no gráfico · ${kpiFilterLabel(v)}` : chartSubtitle("Comparativo no gráfico");
            const series = (src?.series.salesDetail ?? []).map((r) => ({
              t: r.t,
              total: r.ordersTotal + r.pdvTotal,
              totalComp: (r.ordersTotalCompare ?? 0) + (r.pdvTotalCompare ?? 0),
              orders: r.ordersTotal,
              ordersComp: r.ordersTotalCompare ?? 0,
              pdv: r.pdvTotal,
              pdvComp: r.pdvTotalCompare ?? 0,
            }));
            return (
              <SeriesChart
                title="Vendas"
                subtitle={subtitle}
                actions={
                  <div className="flex items-center gap-2">
                    <AdvancedDateFilter
                      label="Data"
                      value={v ?? filter}
                      onChange={(next) => void applyChartFilter(id, next)}
                      variant="icon"
                      size="sm"
                      showLabelInChip={false}
                      showClear={false}
                      allowedGranularities={["day", "week", "month"]}
                    />
                    {v ? (
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        title="Usar filtro global"
                        aria-label="Usar filtro global"
                        onClick={() => void applyChartFilter(id, null)}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : null}
                    <Select className="h-9" value={salesMetric} onChange={(e) => setSalesMetric(e.target.value as any)}>
                      <option value="total">Total</option>
                      <option value="orders">Pedidos</option>
                      <option value="pdv">PDV</option>
                    </Select>
                  </div>
                }
                data={series}
                xKey="t"
                currentKey={salesMetric}
                compareKey={cr ? (salesMetric === "total" ? "totalComp" : salesMetric === "orders" ? "ordersComp" : "pdvComp") : undefined}
                valueFormat="currency"
              />
            );
          })()}

          {(() => {
            const id = "chart_sales_count";
            const v = chartOverrides[id];
            const st = chartState[id];
            const src = v ? st?.data : data;
            const srcLoading = v ? Boolean(st?.loading) : loading;
            const cr = v ? toCompareRange(v) : compareRange;
            const subtitle = v ? `Quantidade (Pedidos + PDV) · ${kpiFilterLabel(v)}` : chartSubtitle("Quantidade (Pedidos + PDV)");
            const series = (src?.series.salesDetail ?? []).map((r) => ({
              t: r.t,
              total: r.ordersCount + r.pdvCount,
              totalComp: (r.ordersCountCompare ?? 0) + (r.pdvCountCompare ?? 0),
              orders: r.ordersCount,
              ordersComp: r.ordersCountCompare ?? 0,
              pdv: r.pdvCount,
              pdvComp: r.pdvCountCompare ?? 0,
            }));
            return (
              <SeriesChart
                title="Pedidos"
                subtitle={subtitle}
                actions={
                  <div className="flex items-center gap-2">
                    <AdvancedDateFilter
                      label="Data"
                      value={v ?? filter}
                      onChange={(next) => void applyChartFilter(id, next)}
                      variant="icon"
                      size="sm"
                      showLabelInChip={false}
                      showClear={false}
                      allowedGranularities={["day", "week", "month"]}
                    />
                    {v ? (
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        title="Usar filtro global"
                        aria-label="Usar filtro global"
                        onClick={() => void applyChartFilter(id, null)}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : null}
                    <Select className="h-9" value={salesCountMetric} onChange={(e) => setSalesCountMetric(e.target.value as any)}>
                      <option value="total">Total</option>
                      <option value="orders">Pedidos</option>
                      <option value="pdv">PDV</option>
                    </Select>
                  </div>
                }
                data={series}
                xKey="t"
                currentKey={salesCountMetric}
                compareKey={cr ? (salesCountMetric === "total" ? "totalComp" : salesCountMetric === "orders" ? "ordersComp" : "pdvComp") : undefined}
                valueFormat="number"
              />
            );
          })()}
        </div>
      )}

      {(module === "overview" || module === "finance") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(() => {
            const id = "chart_fin_open";
            const v = chartOverrides[id];
            const st = chartState[id];
            const src = v ? st?.data : data;
            const srcLoading = v ? Boolean(st?.loading) : loading;
            const cr = v ? toCompareRange(v) : compareRange;
            const subtitle = v ? `Por vencimento · ${kpiFilterLabel(v)}` : chartSubtitle("Por vencimento");
            const series = (src?.series.financialOpen ?? []).map((r) => ({
              t: r.t,
              ar: r.arOpenCurrent,
              ap: r.apOpenCurrent,
              arComp: r.arOpenCompare ?? 0,
              apComp: r.apOpenCompare ?? 0,
            }));
            return (
              <SeriesChart
                title="Títulos em aberto"
                subtitle={subtitle}
                actions={
                  <div className="flex items-center gap-2">
                    <AdvancedDateFilter
                      label="Data"
                      value={v ?? filter}
                      onChange={(next) => void applyChartFilter(id, next)}
                      variant="icon"
                      size="sm"
                      showLabelInChip={false}
                      showClear={false}
                      allowedGranularities={["day", "week", "month"]}
                    />
                    {v ? (
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        title="Usar filtro global"
                        aria-label="Usar filtro global"
                        onClick={() => void applyChartFilter(id, null)}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : null}
                    <Select className="h-9" value={finOpenMetric} onChange={(e) => setFinOpenMetric(e.target.value as any)}>
                      <option value="ar">A Receber</option>
                      <option value="ap">A Pagar</option>
                    </Select>
                  </div>
                }
                data={series}
                xKey="t"
                currentKey={finOpenMetric}
                compareKey={cr ? (finOpenMetric === "ar" ? "arComp" : "apComp") : undefined}
                valueFormat="currency"
              />
            );
          })()}

          {(() => {
            const id = "chart_fin_paid";
            const v = chartOverrides[id];
            const st = chartState[id];
            const src = v ? st?.data : data;
            const srcLoading = v ? Boolean(st?.loading) : loading;
            const cr = v ? toCompareRange(v) : compareRange;
            const subtitle = v ? `Valores pagos/recebidos · ${kpiFilterLabel(v)}` : chartSubtitle("Valores pagos/recebidos");
            const series = (src?.series.financialPaid ?? []).map((r) => ({
              t: r.t,
              ar: r.arPaidCurrent,
              ap: r.apPaidCurrent,
              arComp: r.arPaidCompare ?? 0,
              apComp: r.apPaidCompare ?? 0,
            }));
            return (
              <SeriesChart
                title="Pagamentos"
                subtitle={subtitle}
                actions={
                  <div className="flex items-center gap-2">
                    <AdvancedDateFilter
                      label="Data"
                      value={v ?? filter}
                      onChange={(next) => void applyChartFilter(id, next)}
                      variant="icon"
                      size="sm"
                      showLabelInChip={false}
                      showClear={false}
                      allowedGranularities={["day", "week", "month"]}
                    />
                    {v ? (
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        title="Usar filtro global"
                        aria-label="Usar filtro global"
                        onClick={() => void applyChartFilter(id, null)}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : null}
                    <Select className="h-9" value={finPaidMetric} onChange={(e) => setFinPaidMetric(e.target.value as any)}>
                      <option value="ar">Recebido</option>
                      <option value="ap">Pago</option>
                    </Select>
                  </div>
                }
                data={series}
                xKey="t"
                currentKey={finPaidMetric}
                compareKey={cr ? (finPaidMetric === "ar" ? "arComp" : "apComp") : undefined}
                valueFormat="currency"
              />
            );
          })()}
        </div>
      )}

      {(module === "overview" || module === "stock") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(() => {
            const id = "chart_stock";
            const v = chartOverrides[id];
            const st = chartState[id];
            const src = v ? st?.data : data;
            const srcLoading = v ? Boolean(st?.loading) : loading;
            const cr = v ? toCompareRange(v) : compareRange;
            const subtitle = v ? `Entradas, saídas e saldo · ${kpiFilterLabel(v)}` : chartSubtitle("Entradas, saídas e saldo");
            const series = (src?.series.stock ?? []).map((r) => ({
              t: r.t,
              in: r.inCurrent,
              out: r.outCurrent,
              net: r.inCurrent - r.outCurrent,
              inComp: r.inCompare ?? 0,
              outComp: r.outCompare ?? 0,
              netComp: (r.inCompare ?? 0) - (r.outCompare ?? 0),
            }));
            return (
              <SeriesChart
                title="Estoque"
                subtitle={subtitle}
                actions={
                  <div className="flex items-center gap-2">
                    <AdvancedDateFilter
                      label="Data"
                      value={v ?? filter}
                      onChange={(next) => void applyChartFilter(id, next)}
                      variant="icon"
                      size="sm"
                      showLabelInChip={false}
                      showClear={false}
                      allowedGranularities={["day", "week", "month"]}
                    />
                    {v ? (
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        title="Usar filtro global"
                        aria-label="Usar filtro global"
                        onClick={() => void applyChartFilter(id, null)}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : null}
                    <Select className="h-9" value={stockMetric} onChange={(e) => setStockMetric(e.target.value as any)}>
                      <option value="in">Entradas</option>
                      <option value="out">Saídas</option>
                      <option value="net">Saldo</option>
                    </Select>
                  </div>
                }
                data={series}
                xKey="t"
                currentKey={stockMetric}
                compareKey={cr ? (stockMetric === "in" ? "inComp" : stockMetric === "out" ? "outComp" : "netComp") : undefined}
                valueFormat="number"
              />
            );
          })()}

          {(() => {
            const id = "chart_cash";
            const v = chartOverrides[id];
            const st = chartState[id];
            const src = v ? st?.data : data;
            const srcLoading = v ? Boolean(st?.loading) : loading;
            const cr = v ? toCompareRange(v) : compareRange;
            const subtitle = v ? `Entradas, saídas e saldo · ${kpiFilterLabel(v)}` : chartSubtitle("Entradas, saídas e saldo");
            const series = (src?.series.cash ?? []).map((r) => ({
              t: r.t,
              in: r.inCurrent,
              out: r.outCurrent,
              net: r.inCurrent - r.outCurrent,
              inComp: r.inCompare ?? 0,
              outComp: r.outCompare ?? 0,
              netComp: (r.inCompare ?? 0) - (r.outCompare ?? 0),
            }));
            return (
              <SeriesChart
                title="Caixa"
                subtitle={subtitle}
                actions={
                  <div className="flex items-center gap-2">
                    <AdvancedDateFilter
                      label="Data"
                      value={v ?? filter}
                      onChange={(next) => void applyChartFilter(id, next)}
                      variant="icon"
                      size="sm"
                      showLabelInChip={false}
                      showClear={false}
                      allowedGranularities={["day", "week", "month"]}
                    />
                    {v ? (
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        title="Usar filtro global"
                        aria-label="Usar filtro global"
                        onClick={() => void applyChartFilter(id, null)}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : null}
                    <Select className="h-9" value={cashMetric} onChange={(e) => setCashMetric(e.target.value as any)}>
                      <option value="in">Entradas</option>
                      <option value="out">Saídas</option>
                      <option value="net">Saldo</option>
                    </Select>
                  </div>
                }
                data={series}
                xKey="t"
                currentKey={cashMetric}
                compareKey={cr ? (cashMetric === "in" ? "inComp" : cashMetric === "out" ? "outComp" : "netComp") : undefined}
                valueFormat="currency"
              />
            );
          })()}
        </div>
      )}

      {(module === "overview" || module === "sales") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Top produtos</div>
                <div className="text-xs text-slate-500 mt-1">
                  {`${topOrder === "top" ? "Mais vendidos" : "Menos vendidos"} · Por ${topSort === "total" ? "faturamento" : "quantidade"} · ${topLimit} itens`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select className="h-9" value={topOrder} onChange={(e) => setTopOrder(e.target.value as any)}>
                  <option value="top">Mais vendidos</option>
                  <option value="bottom">Menos vendidos</option>
                </Select>
                <Select className="h-9" value={topSort} onChange={(e) => setTopSort(e.target.value as any)}>
                  <option value="total">Faturamento</option>
                  <option value="qty">Quantidade</option>
                </Select>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="h-9 w-24 text-right"
                  value={topLimitInput}
                  onChange={(e) => setTopLimitInput(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    const n = Math.max(1, Math.min(200, Math.trunc(Number.parseInt(topLimitInput || "10", 10) || 10)));
                    setTopLimit(n);
                    setTopLimitInput(String(n));
                  }}
                  onBlur={() => {
                    const n = Math.max(1, Math.min(200, Math.trunc(Number.parseInt(topLimitInput || "10", 10) || 10)));
                    setTopLimit(n);
                    setTopLimitInput(String(n));
                  }}
                />
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="py-2 text-left font-medium">Produto</th>
                    <th className="py-2 text-right font-medium">Qtd</th>
                    <th className="py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {topProducts.map((r) => (
                    <tr key={r.productId} className="hover:bg-slate-50">
                      <td className="py-2 pr-2">
                        <div className="font-medium text-slate-900 truncate max-w-[420px]">{r.name || r.productId}</div>
                      </td>
                      <td className="py-2 text-right tabular-nums">{r.qty.toFixed(3)}</td>
                      <td className="py-2 text-right tabular-nums">{formatCurrency(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {topProductsLoading ? <div className="py-6 text-sm text-slate-500">Carregando…</div> : null}
              {!topProductsLoading && topProductsError ? (
                <div className="py-6 text-sm text-red-700">Erro ao carregar: {topProductsError}</div>
              ) : null}
              {!topProductsLoading && !topProductsError && topProducts.length === 0 ? (
                <div className="py-6 text-sm text-slate-500">Sem dados no período.</div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Produtos críticos</div>
                <div className="text-xs text-slate-500 mt-1">Abaixo do estoque mínimo</div>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="py-2 text-left font-medium">Produto</th>
                    <th className="py-2 text-right font-medium">Estoque</th>
                    <th className="py-2 text-right font-medium">Mínimo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(data?.lists.lowStockProducts ?? []).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2 pr-2">
                        <Link to={`/app/produtos/${p.id}`} className="font-medium text-slate-900 hover:text-blue-700">
                          <span className="truncate inline-block max-w-[420px] align-bottom">{p.name}</span>
                        </Link>
                        {p.sku ? <div className="text-xs text-slate-500 font-mono">SKU: {p.sku}</div> : null}
                      </td>
                      <td className="py-2 text-right tabular-nums">{p.stock.toFixed(3)}</td>
                      <td className="py-2 text-right tabular-nums">{p.stockMin.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!data?.lists.lowStockProducts || data.lists.lowStockProducts.length === 0) && (
                <div className="py-6 text-sm text-slate-500">Nenhum produto crítico no momento.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
