import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { listBankAccounts } from "@/lib/api_banks";
import { getCurrentOpenSession } from "@/lib/api_cash";
import { listFinancialTitles } from "@/lib/api_financial_titles";

export default function FinanceOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bankTotal, setBankTotal] = useState(0);
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [openAr, setOpenAr] = useState(0);
  const [openAp, setOpenAp] = useState(0);
  const [overdue, setOverdue] = useState(0);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const [banks, cash, arOpen, apOpen] = await Promise.all([
        listBankAccounts(),
        getCurrentOpenSession(),
        listFinancialTitles({ kind: "ar" }),
        listFinancialTitles({ kind: "ap" }),
      ]);
      setBankTotal(banks.reduce((s, a) => s + (a.balance ?? 0), 0));
      setCashBalance(cash ? cash.currentBalance : null);
      const arPending = arOpen.filter((t) => t.status === "open" || t.status === "partial");
      const apPending = apOpen.filter((t) => t.status === "open" || t.status === "partial");
      setOpenAr(arPending.reduce((s, t) => s + Math.max(0, t.amount - t.paidAmount), 0));
      setOpenAp(apPending.reduce((s, t) => s + Math.max(0, t.amount - t.paidAmount), 0));
      const ov = [...arPending, ...apPending].filter((t) => t.dueDate < today);
      setOverdue(ov.reduce((s, t) => s + Math.max(0, t.amount - t.paidAmount), 0));
    } catch (e: any) {
      setError(e?.message ?? "Falha ao carregar visão geral.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <BlingLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financeiro</h1>
            <p className="text-sm text-slate-500 mt-1">Visão geral de bancos, caixa, títulos e relatórios.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => reload()} disabled={loading}>
              Atualizar
            </Button>
          </div>
        </div>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="text-xs text-slate-500">Saldo bancos</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">{formatCurrency(bankTotal)}</div>
            <div className="mt-4">
              <Link to="/app/financeiro/bancos">
                <Button variant="secondary">Ver contas</Button>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="text-xs text-slate-500">Saldo caixa (sessão aberta)</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">
              {cashBalance === null ? "Sem caixa aberto" : formatCurrency(cashBalance)}
            </div>
            <div className="mt-4">
              <Link to="/app/financeiro/caixa">
                <Button variant="secondary">Ver caixa</Button>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="text-xs text-slate-500">A receber (em aberto)</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">{formatCurrency(openAr)}</div>
            <div className="mt-4">
              <Link to="/app/financeiro/titulos?kind=ar">
                <Button variant="secondary">Ver títulos</Button>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="text-xs text-slate-500">Vencidos (AR/AP)</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">{formatCurrency(overdue)}</div>
            <div className="mt-4">
              <Link to="/app/financeiro/titulos">
                <Button variant="secondary">Resolver</Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="text-sm font-semibold text-slate-900">Ações rápidas</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/app/financeiro/cadastros">
                <Button variant="secondary">Cadastros</Button>
              </Link>
              <Link to="/app/financeiro/conciliacao">
                <Button variant="secondary">Conciliação</Button>
              </Link>
              <Link to="/app/financeiro/fluxo-caixa">
                <Button variant="secondary">Fluxo de caixa</Button>
              </Link>
              <Link to="/app/financeiro/dre">
                <Button variant="secondary">DRE</Button>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="text-sm font-semibold text-slate-900">A pagar (em aberto)</div>
            <div className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(openAp)}</div>
            <div className="mt-4">
              <Link to="/app/financeiro/titulos?kind=ap">
                <Button variant="secondary">Abrir contas a pagar</Button>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="text-sm font-semibold text-slate-900">Relatórios</div>
            <div className="mt-3 text-sm text-slate-600">
              Use Fluxo de Caixa e DRE para visão gerencial. Para extrações detalhadas, o Centro de Relatórios continua disponível.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/app/relatorios">
                <Button variant="secondary">Centro de relatórios</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </BlingLayout>
  );
}
