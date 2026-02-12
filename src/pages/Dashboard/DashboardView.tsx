import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Banknote, Boxes, CreditCard, FileText, ShoppingCart, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { AdvancedDateFilter } from "@/components/filters/AdvancedDateFilter";
import { computeCompare, computePreset, formatRangeLabel, suggestedGranularity, type DateFilterValue } from "@/components/filters/dateRange";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { formatCurrency, toLocalIsoDate } from "@/lib/utils";
import { getDashboardAnalytics, type AnalyticsGranularity, type DashboardAnalytics } from "@/lib/api_analytics";
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

export function DashboardView() {
  const aliveRef = useRef(true);
  const [module, setModule] = useState<DashboardModule>("overview");
  const [filter, setFilter] = useState<DateFilterValue>(() => {
    const range = computePreset("this_month");
    return {
      preset: "this_month",
      range,
      granularity: suggestedGranularity(range),
      compare: { mode: "previous_period" },
    };
  });

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      granularity: filter.granularity as AnalyticsGranularity,
      compareStart: compareRange ? toLocalIsoDate(compareRange.start) : undefined,
      compareEnd: compareRange ? toLocalIsoDate(compareRange.end) : undefined,
    });
    if (!aliveRef.current) return;
    setData(res);
    setLoading(false);
  }, [compareRange, filter.granularity, filter.range.end, filter.range.start]);

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
    });
    return off;
  }, [reload]);

  useEffect(() => {
    const onFocus = () => {
      void reload().catch(() => undefined);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void reload().catch(() => undefined);
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reload]);

  const titlePeriod = useMemo(() => formatRangeLabel(filter.range), [filter.range]);
  const titleCompare = useMemo(() => (compareRange ? formatRangeLabel(compareRange) : null), [compareRange]);

  const k = data?.kpis.current;
  const k2 = data?.kpis.compare as any;

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

  const [salesMetric, setSalesMetric] = useState<"total" | "orders" | "pdv">("total");
  const [salesCountMetric, setSalesCountMetric] = useState<"total" | "orders" | "pdv">("total");
  const [cashMetric, setCashMetric] = useState<"in" | "out" | "net">("net");
  const [stockMetric, setStockMetric] = useState<"in" | "out" | "net">("net");
  const [finOpenMetric, setFinOpenMetric] = useState<"ar" | "ap">("ar");
  const [finPaidMetric, setFinPaidMetric] = useState<"ar" | "ap">("ar");
  const [topSort, setTopSort] = useState<"total" | "qty">("total");

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Central</h1>
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
          <Button variant="outline" onClick={() => void reload().catch(() => undefined)} disabled={loading}>
            Atualizar
          </Button>
          <Link to="/app/relatorios">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white">Relatórios</Button>
          </Link>
        </div>
      </div>

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
          <DashboardKpiCard
            label="Vendas (total)"
            value={loading || !k ? "Carregando…" : formatCurrency(k.salesTotal)}
            hint={compareRange && k2 ? deltaHintCurrency(k.salesTotal, Number(k2.salesTotal ?? 0)) : undefined}
            icon={ShoppingCart}
            tone="blue"
          />
          <DashboardKpiCard
            label="Ticket médio"
            value={loading || !k ? "Carregando…" : formatCurrency(k.avgTicket)}
            hint={compareRange && k2 ? deltaHintCurrency(k.avgTicket, Number(k2.avgTicket ?? 0)) : undefined}
            icon={Wallet}
            tone="slate"
          />
          <DashboardKpiCard
            label="Pedidos (total)"
            value={loading || !k ? "Carregando…" : String(k.salesCount)}
            hint={compareRange && k2 ? deltaHintNumber(k.salesCount, Number(k2.salesCount ?? 0)) : "Pedidos + PDV"}
            icon={FileText}
            tone="slate"
          />
          <DashboardKpiCard
            label="PDV (vendas)"
            value={loading || !k ? "Carregando…" : formatCurrency(k.pdvTotal)}
            hint={compareRange && k2 ? deltaHintCurrency(k.pdvTotal, Number(k2.pdvTotal ?? 0)) : undefined}
            icon={ShoppingCart}
            tone="green"
          />
        </div>
      )}

      {(module === "overview" || module === "finance") && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardKpiCard
            label="A Receber (em aberto)"
            value={loading || !k ? "Carregando…" : formatCurrency(k.receivableOpen)}
            hint={compareRange && k2 ? deltaHintCurrency(k.receivableOpen, Number(k2.receivableOpen ?? 0)) : "Por vencimento"}
            icon={TrendingUp}
            tone="green"
          />
          <DashboardKpiCard
            label="A Pagar (em aberto)"
            value={loading || !k ? "Carregando…" : formatCurrency(k.payableOpen)}
            hint={compareRange && k2 ? deltaHintCurrency(k.payableOpen, Number(k2.payableOpen ?? 0)) : "Por vencimento"}
            icon={TrendingDown}
            tone="amber"
          />
          <DashboardKpiCard
            label="A Receber (vencido)"
            value={loading || !k ? "Carregando…" : formatCurrency(k.receivableOverdue)}
            icon={TrendingUp}
            tone="red"
          />
          <DashboardKpiCard
            label="A Pagar (vencido)"
            value={loading || !k ? "Carregando…" : formatCurrency(k.payableOverdue)}
            icon={TrendingDown}
            tone="red"
          />
        </div>
      )}

      {(module === "overview" || module === "stock") && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardKpiCard
            label="Estoque (entradas)"
            value={loading || !k ? "Carregando…" : String(k.stockInQty)}
            hint={compareRange && k2 ? deltaHintNumber(k.stockInQty, Number(k2.stockInQty ?? 0)) : undefined}
            icon={Boxes}
            tone="green"
          />
          <DashboardKpiCard
            label="Estoque (saídas)"
            value={loading || !k ? "Carregando…" : String(k.stockOutQty)}
            hint={compareRange && k2 ? deltaHintNumber(k.stockOutQty, Number(k2.stockOutQty ?? 0)) : undefined}
            icon={Boxes}
            tone="amber"
          />
          <DashboardKpiCard
            label="Saldo (estoque)"
            value={loading || !k ? "Carregando…" : String(k.stockNetQty)}
            hint={compareRange && k2 ? deltaHintNumber(k.stockNetQty, Number(k2.stockNetQty ?? 0)) : undefined}
            icon={Boxes}
            tone="slate"
          />
          <DashboardKpiCard
            label="Produtos críticos"
            value={loading || !k ? "Carregando…" : `${k.lowStockCount}/${k.productsCount}`}
            hint="Abaixo do mínimo"
            icon={Boxes}
            tone="red"
          />
        </div>
      )}

      {(module === "overview" || module === "sales") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SeriesChart
            title="Vendas"
            subtitle="Comparativo no gráfico"
            actions={
              <Select className="h-9" value={salesMetric} onChange={(e) => setSalesMetric(e.target.value as any)}>
                <option value="total">Total</option>
                <option value="orders">Pedidos</option>
                <option value="pdv">PDV</option>
              </Select>
            }
            data={(data?.series.salesDetail ?? []).map((r) => ({
              t: r.t,
              total: r.ordersTotal + r.pdvTotal,
              totalComp: (r.ordersTotalCompare ?? 0) + (r.pdvTotalCompare ?? 0),
              orders: r.ordersTotal,
              ordersComp: r.ordersTotalCompare ?? 0,
              pdv: r.pdvTotal,
              pdvComp: r.pdvTotalCompare ?? 0,
            }))}
            xKey="t"
            currentKey={salesMetric}
            compareKey={compareRange ? (salesMetric === "total" ? "totalComp" : salesMetric === "orders" ? "ordersComp" : "pdvComp") : undefined}
            valueFormat="currency"
          />

          <SeriesChart
            title="Pedidos"
            subtitle="Quantidade (Pedidos + PDV)"
            actions={
              <Select className="h-9" value={salesCountMetric} onChange={(e) => setSalesCountMetric(e.target.value as any)}>
                <option value="total">Total</option>
                <option value="orders">Pedidos</option>
                <option value="pdv">PDV</option>
              </Select>
            }
            data={(data?.series.salesDetail ?? []).map((r) => ({
              t: r.t,
              total: r.ordersCount + r.pdvCount,
              totalComp: (r.ordersCountCompare ?? 0) + (r.pdvCountCompare ?? 0),
              orders: r.ordersCount,
              ordersComp: r.ordersCountCompare ?? 0,
              pdv: r.pdvCount,
              pdvComp: r.pdvCountCompare ?? 0,
            }))}
            xKey="t"
            currentKey={salesCountMetric}
            compareKey={compareRange ? (salesCountMetric === "total" ? "totalComp" : salesCountMetric === "orders" ? "ordersComp" : "pdvComp") : undefined}
            valueFormat="number"
          />
        </div>
      )}

      {(module === "overview" || module === "finance") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SeriesChart
            title="Títulos em aberto"
            subtitle="Por vencimento"
            actions={
              <Select className="h-9" value={finOpenMetric} onChange={(e) => setFinOpenMetric(e.target.value as any)}>
                <option value="ar">A Receber</option>
                <option value="ap">A Pagar</option>
              </Select>
            }
            data={(data?.series.financialOpen ?? []).map((r) => ({
              t: r.t,
              ar: r.arOpenCurrent,
              ap: r.apOpenCurrent,
              arComp: r.arOpenCompare ?? 0,
              apComp: r.apOpenCompare ?? 0,
            }))}
            xKey="t"
            currentKey={finOpenMetric}
            compareKey={compareRange ? (finOpenMetric === "ar" ? "arComp" : "apComp") : undefined}
            valueFormat="currency"
          />

          <SeriesChart
            title="Pagamentos"
            subtitle="Valores pagos/recebidos"
            actions={
              <Select className="h-9" value={finPaidMetric} onChange={(e) => setFinPaidMetric(e.target.value as any)}>
                <option value="ar">Recebido</option>
                <option value="ap">Pago</option>
              </Select>
            }
            data={(data?.series.financialPaid ?? []).map((r) => ({
              t: r.t,
              ar: r.arPaidCurrent,
              ap: r.apPaidCurrent,
              arComp: r.arPaidCompare ?? 0,
              apComp: r.apPaidCompare ?? 0,
            }))}
            xKey="t"
            currentKey={finPaidMetric}
            compareKey={compareRange ? (finPaidMetric === "ar" ? "arComp" : "apComp") : undefined}
            valueFormat="currency"
          />
        </div>
      )}

      {(module === "overview" || module === "stock") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SeriesChart
            title="Estoque"
            subtitle="Entradas, saídas e saldo"
            actions={
              <Select className="h-9" value={stockMetric} onChange={(e) => setStockMetric(e.target.value as any)}>
                <option value="in">Entradas</option>
                <option value="out">Saídas</option>
                <option value="net">Saldo</option>
              </Select>
            }
            data={(data?.series.stock ?? []).map((r) => ({
              t: r.t,
              in: r.inCurrent,
              out: r.outCurrent,
              net: r.inCurrent - r.outCurrent,
              inComp: r.inCompare ?? 0,
              outComp: r.outCompare ?? 0,
              netComp: (r.inCompare ?? 0) - (r.outCompare ?? 0),
            }))}
            xKey="t"
            currentKey={stockMetric}
            compareKey={compareRange ? (stockMetric === "in" ? "inComp" : stockMetric === "out" ? "outComp" : "netComp") : undefined}
            valueFormat="number"
          />

          <SeriesChart
            title="Caixa"
            subtitle="Entradas, saídas e saldo"
            actions={
              <Select className="h-9" value={cashMetric} onChange={(e) => setCashMetric(e.target.value as any)}>
                <option value="in">Entradas</option>
                <option value="out">Saídas</option>
                <option value="net">Saldo</option>
              </Select>
            }
            data={(data?.series.cash ?? []).map((r) => ({
              t: r.t,
              in: r.inCurrent,
              out: r.outCurrent,
              net: r.inCurrent - r.outCurrent,
              inComp: r.inCompare ?? 0,
              outComp: r.outCompare ?? 0,
              netComp: (r.inCompare ?? 0) - (r.outCompare ?? 0),
            }))}
            xKey="t"
            currentKey={cashMetric}
            compareKey={compareRange ? (cashMetric === "in" ? "inComp" : cashMetric === "out" ? "outComp" : "netComp") : undefined}
            valueFormat="currency"
          />
        </div>
      )}

      {(module === "overview" || module === "sales") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Top produtos</div>
                <div className="text-xs text-slate-500 mt-1">Por {topSort === "total" ? "faturamento" : "quantidade"}</div>
              </div>
              <Select className="h-9" value={topSort} onChange={(e) => setTopSort(e.target.value as any)}>
                <option value="total">Faturamento</option>
                <option value="qty">Quantidade</option>
              </Select>
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
                  {(data?.lists.topSalesProducts ?? [])
                    .slice()
                    .sort((a, b) => (topSort === "qty" ? b.qty - a.qty : b.total - a.total))
                    .map((r) => (
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
              {(!data?.lists.topSalesProducts || data.lists.topSalesProducts.length === 0) && (
                <div className="py-6 text-sm text-slate-500">Sem dados no período.</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Produtos críticos</div>
            <div className="text-xs text-slate-500 mt-1">Abaixo do estoque mínimo</div>
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
