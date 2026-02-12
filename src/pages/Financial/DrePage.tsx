import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatCurrency } from "@/lib/utils";
import { getDre, listFinCostCenters, type DreRow, type FinCostCenter } from "@/lib/api_finance";
import { BlingLayout } from "@/components/BlingLayout";
import { AdvancedDateFilter } from "@/components/filters/AdvancedDateFilter";
import { suggestedGranularity, type DateFilterValue } from "@/components/filters/dateRange";
import { toLocalIsoDate } from "@/lib/utils";

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart(ymd: string) {
  return `${ymd.slice(0, 7)}-01`;
}

function parseYmd(ymd: string) {
  return new Date(`${ymd}T00:00:00`);
}

export default function DrePage() {
  const [view, setView] = useState<"competence" | "cash">("competence");
  const [period, setPeriod] = useState<DateFilterValue>(() => {
    const start = parseYmd(monthStart(todayYmd()));
    const end = parseYmd(todayYmd());
    const range = { start, end };
    return {
      preset: "this_month",
      range,
      granularity: suggestedGranularity(range),
      compare: { mode: "none" },
    };
  });
  const [costCenters, setCostCenters] = useState<FinCostCenter[]>([]);
  const [costCenterId, setCostCenterId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DreRow[]>([]);
  const [totals, setTotals] = useState({ revenue: 0, expense: 0, result: 0 });

  async function reload() {
    const start = toLocalIsoDate(period.range.start);
    const end = toLocalIsoDate(period.range.end);
    setLoading(true);
    setError(null);
    try {
      const data = await getDre({ start, end, view, costCenterId: costCenterId || undefined });
      setRows(data.rows);
      setTotals(data.totals);
    } catch (e: any) {
      setError(e?.message ?? "Falha ao carregar DRE.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    listFinCostCenters().then(setCostCenters).catch(() => setCostCenters([]));
  }, []);

  useEffect(() => {
    reload();
  }, []);

  const grouped = useMemo(() => {
    const revenue = rows.filter((r) => r.nature === "revenue");
    const expense = rows.filter((r) => r.nature === "expense");
    return { revenue, expense };
  }, [rows]);

  return (
    <BlingLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">DRE</h1>
            <p className="text-sm text-slate-500 mt-1">Apuração por competência ou por caixa.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => reload()} disabled={loading}>
              Atualizar
            </Button>
          </div>
        </div>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,200px)_minmax(0,1fr)_minmax(0,220px)_minmax(0,120px)] gap-4 items-center">
            <div className="max-w-xs">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Visão</label>
              <Select value={view} onChange={(e) => setView(e.target.value as any)}>
                <option value="competence">Competência</option>
                <option value="cash">Caixa</option>
              </Select>
            </div>
            <div className="flex justify-center lg:justify-start">
              <AdvancedDateFilter label="Período" value={period} onChange={setPeriod} showLabelInChip={false} />
            </div>
            <div className="max-w-xs">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Centro de custo</label>
              <Select value={costCenterId} onChange={(e) => setCostCenterId(e.target.value)}>
                <option value="">Todos</option>
                {costCenters
                  .filter((c) => c.active)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </div>
            <div className="flex items-center justify-end">
              <Button onClick={() => reload()} disabled={loading}>
                Aplicar
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="text-xs text-slate-500">Receitas</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">{formatCurrency(totals.revenue)}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="text-xs text-slate-500">Despesas</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">{formatCurrency(totals.expense)}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="text-xs text-slate-500">Resultado</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">{formatCurrency(totals.result)}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="text-sm font-semibold text-slate-900">Composição</div>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm text-left min-w-[920px]">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Natureza</th>
                  <th className="px-6 py-4">Conta</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {grouped.revenue.map((r) => (
                  <tr key={r.coaAccountId} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 text-slate-700">Receita</td>
                    <td className="px-6 py-4 text-slate-700">
                      <span className="font-medium text-slate-900">{r.code}</span> — {r.name}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(r.amount)}</td>
                  </tr>
                ))}
                {grouped.expense.map((r) => (
                  <tr key={r.coaAccountId} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 text-slate-700">Despesa</td>
                    <td className="px-6 py-4 text-slate-700">
                      <span className="font-medium text-slate-900">{r.code}</span> — {r.name}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(r.amount)}</td>
                  </tr>
                ))}
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                      Sem dados para o período.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </BlingLayout>
  );
}
