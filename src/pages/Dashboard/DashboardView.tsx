import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Banknote, Boxes, CreditCard, FileText, ShoppingCart, TrendingDown, TrendingUp } from "lucide-react";
import { AdvancedDateFilter } from "@/components/filters/AdvancedDateFilter";
import { computeCompare, computePreset, formatRangeLabel, suggestedGranularity, type DateFilterValue } from "@/components/filters/dateRange";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { getDashboardAnalytics, type AnalyticsGranularity, type DashboardAnalytics } from "@/lib/api_analytics";
import { DashboardKpiCard } from "./DashboardKpiCard";
import { SeriesChart } from "./charts/SeriesChart";

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function toCompareRange(v: DateFilterValue) {
  if (v.compare.mode === "none") return null;
  if (v.compare.mode === "custom") return v.compare.range ?? null;
  const derived = computeCompare(v.range, v.compare.mode);
  return derived ?? null;
}

export function DashboardView() {
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

  const compareRange = useMemo(() => toCompareRange(filter), [filter]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getDashboardAnalytics({
          start: toIsoDate(filter.range.start),
          end: toIsoDate(filter.range.end),
          granularity: filter.granularity as AnalyticsGranularity,
          compareStart: compareRange ? toIsoDate(compareRange.start) : undefined,
          compareEnd: compareRange ? toIsoDate(compareRange.end) : undefined,
        });
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [compareRange, filter.granularity, filter.range.end, filter.range.start]);

  const titlePeriod = useMemo(() => formatRangeLabel(filter.range), [filter.range]);
  const titleCompare = useMemo(() => (compareRange ? formatRangeLabel(compareRange) : null), [compareRange]);

  const k = data?.kpis.current;
  const k2 = data?.kpis.compare as any;

  const kpiHint = useMemo(() => {
    if (!k || !compareRange || !k2) return null;
    const delta = Number(k.salesTotal ?? 0) - Number(k2.salesTotal ?? 0);
    const sign = delta >= 0 ? "+" : "-";
    return `${sign}${formatCurrency(Math.abs(delta))} vs período comparado`;
  }, [compareRange, k, k2]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Período: <span className="font-medium text-slate-700">{titlePeriod}</span>
            {titleCompare ? (
              <>
                {" "}· Comparação: <span className="font-medium text-slate-700">{titleCompare}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AdvancedDateFilter label="Data" value={filter} onChange={setFilter} />
          <Link to="/app/relatorios">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white">Relatórios</Button>
          </Link>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardKpiCard
          label="Vendas (total)"
          value={loading || !k ? "Carregando…" : formatCurrency(k.salesTotal)}
          hint={kpiHint ?? undefined}
          icon={ShoppingCart}
          tone="blue"
        />
        <DashboardKpiCard
          label="Pedidos/Vendas"
          value={loading || !k ? "Carregando…" : String(k.salesCount)}
          hint="Pedidos + PDV (no período)"
          icon={FileText}
          tone="slate"
        />
        <DashboardKpiCard
          label="A Receber (em aberto)"
          value={loading || !k ? "Carregando…" : formatCurrency(k.receivableOpen)}
          hint="Por vencimento (período)"
          icon={TrendingUp}
          tone="green"
        />
        <DashboardKpiCard
          label="A Pagar (em aberto)"
          value={loading || !k ? "Carregando…" : formatCurrency(k.payableOpen)}
          hint="Por vencimento (período)"
          icon={TrendingDown}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SeriesChart
          title="Vendas (linha)"
          subtitle="Pedidos + PDV"
          data={(data?.series.sales ?? []).map((r) => ({ t: r.t, current: r.current, compare: r.compare ?? undefined }))}
          xKey="t"
          currentKey="current"
          compareKey={compareRange ? "compare" : undefined}
          valueFormat="currency"
        />

        <SeriesChart
          title="Caixa (entradas x saídas)"
          subtitle="Movimento de caixa"
          data={(data?.series.cash ?? []).map((r) => ({
            t: r.t,
            entradas: r.inCurrent,
            saidas: r.outCurrent,
            entradasComp: r.inCompare ?? undefined,
            saidasComp: r.outCompare ?? undefined,
          }))}
          xKey="t"
          currentKey="entradas"
          compareKey={compareRange ? "entradasComp" : undefined}
          valueFormat="currency"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DashboardKpiCard
          label="Entradas (caixa)"
          value={loading || !k ? "Carregando…" : formatCurrency(k.cashIn)}
          icon={Banknote}
          tone="green"
        />
        <DashboardKpiCard
          label="Saídas (caixa)"
          value={loading || !k ? "Carregando…" : formatCurrency(k.cashOut)}
          icon={CreditCard}
          tone="red"
        />
        <DashboardKpiCard
          label="Produtos críticos"
          value={loading || !k ? "Carregando…" : `${k.lowStockCount}/${k.productsCount}`}
          hint="Estoque abaixo do mínimo"
          icon={Boxes}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SeriesChart
          title="Estoque (entradas x saídas)"
          subtitle="Movimentações"
          data={(data?.series.stock ?? []).map((r) => ({
            t: r.t,
            entradas: r.inCurrent,
            saidas: r.outCurrent,
            entradasComp: r.inCompare ?? undefined,
            saidasComp: r.outCompare ?? undefined,
          }))}
          xKey="t"
          currentKey="entradas"
          compareKey={compareRange ? "entradasComp" : undefined}
          valueFormat="number"
        />
      </div>
    </div>
  );
}

