import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AdvancedDateFilter } from "@/components/filters/AdvancedDateFilter";
import { suggestedGranularity, type DateFilterValue } from "@/components/filters/dateRange";
import { SeriesChart } from "@/pages/Dashboard/charts/SeriesChart";
import { getCashflow } from "@/lib/api_finance";
import { listBankAccounts, type BankAccount } from "@/lib/api_banks";
import { formatCurrency, toLocalIsoDate } from "@/lib/utils";
import { BlingLayout } from "@/components/BlingLayout";

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(ymd: string, days: number) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function parseYmd(ymd: string) {
  return new Date(`${ymd}T00:00:00`);
}

export default function CashflowPage() {
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [accountId, setAccountId] = useState<string>("");
  const [period, setPeriod] = useState<DateFilterValue>(() => {
    const start = parseYmd(addDays(todayYmd(), -7));
    const end = parseYmd(addDays(todayYmd(), 30));
    const range = { start, end };
    return {
      preset: "custom",
      range,
      granularity: suggestedGranularity(range),
      compare: { mode: "none" },
    };
  });
  const [onlyReconciled, setOnlyReconciled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);

  async function reload() {
    const start = toLocalIsoDate(period.range.start);
    const end = toLocalIsoDate(period.range.end);
    setLoading(true);
    setError(null);
    try {
      const points = await getCashflow({
        start,
        end,
        accountId: accountId || undefined,
        onlyReconciled,
      });
      setRows(
        points.map((p) => ({
          date: p.date,
          predictedNet: (p.predictedIn ?? 0) - (p.predictedOut ?? 0),
          realizedNet: (p.realizedIn ?? 0) - (p.realizedOut ?? 0),
          predictedIn: p.predictedIn,
          predictedOut: p.predictedOut,
          realizedIn: p.realizedIn,
          realizedOut: p.realizedOut,
        }))
      );
    } catch (e: any) {
      setError(e?.message ?? "Falha ao carregar fluxo de caixa.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    listBankAccounts().then(setBanks).catch(() => setBanks([]));
  }, []);

  useEffect(() => {
    reload();
  }, []);

  const totals = useMemo(() => {
    let predictedIn = 0;
    let predictedOut = 0;
    let realizedIn = 0;
    let realizedOut = 0;
    for (const r of rows) {
      predictedIn += Number(r.predictedIn ?? 0);
      predictedOut += Number(r.predictedOut ?? 0);
      realizedIn += Number(r.realizedIn ?? 0);
      realizedOut += Number(r.realizedOut ?? 0);
    }
    return { predictedIn, predictedOut, realizedIn, realizedOut };
  }, [rows]);

  return (
    <BlingLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fluxo de caixa</h1>
            <p className="text-sm text-slate-500 mt-1">Previsto (títulos em aberto) x realizado (liquidações).</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => reload()} disabled={loading}>
              Atualizar
            </Button>
          </div>
        </div>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,260px)_minmax(0,260px)_minmax(0,120px)] gap-4 items-center">
            <div>
              <AdvancedDateFilter label="Período" value={period} onChange={setPeriod} showLabelInChip={false} />
            </div>
            <div className="max-w-xs">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conta bancária</label>
              <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">Todas</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                  type="checkbox"
                  checked={onlyReconciled}
                  onChange={(e) => setOnlyReconciled(e.target.checked)}
                />
                Considerar apenas liquidações conciliadas/caixa
              </label>
            </div>
            <div className="flex items-center justify-end">
              <Button onClick={() => reload()} disabled={loading}>
                Aplicar
              </Button>
            </div>
          </div>
        </div>

      <SeriesChart
        title="Saldo líquido"
        subtitle="Previsto x realizado"
        data={rows}
        xKey="date"
        currentKey="predictedNet"
        compareKey="realizedNet"
        valueFormat="currency"
      />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="text-xs text-slate-500">Totais previstos</div>
            <div className="mt-2 text-sm text-slate-700">Entradas: {formatCurrency(totals.predictedIn)}</div>
            <div className="mt-1 text-sm text-slate-700">Saídas: {formatCurrency(totals.predictedOut)}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="text-xs text-slate-500">Totais realizados</div>
            <div className="mt-2 text-sm text-slate-700">Entradas: {formatCurrency(totals.realizedIn)}</div>
            <div className="mt-1 text-sm text-slate-700">Saídas: {formatCurrency(totals.realizedOut)}</div>
          </div>
        </div>
      </div>
    </BlingLayout>
  );
}
