import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FinanceCadastrosCategories } from "./FinanceCadastrosCategories";
import { FinanceCadastrosCostCenters } from "./FinanceCadastrosCostCenters";
import { FinanceCadastrosCoa } from "./FinanceCadastrosCoa";
import { listCoaAccounts, listFinCategories, listFinCostCenters, type FinCategory, type FinCoaAccount, type FinCostCenter } from "@/lib/api_finance";
import { BlingLayout } from "@/components/BlingLayout";

type TabKey = "categories" | "costCenters" | "coa";

function TabButton(props: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={
        props.active
          ? "rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm"
          : "rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      }
    >
      {props.children}
    </button>
  );
}

export default function FinanceCadastros() {
  const [tab, setTab] = useState<TabKey>("categories");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<FinCategory[]>([]);
  const [costCenters, setCostCenters] = useState<FinCostCenter[]>([]);
  const [coa, setCoa] = useState<FinCoaAccount[]>([]);

  async function reloadAll() {
    setLoading(true);
    setError(null);
    try {
      const [c1, c2, c3] = await Promise.all([listFinCategories(), listFinCostCenters(), listCoaAccounts()]);
      setCategories(c1);
      setCostCenters(c2);
      setCoa(c3);
    } catch (e: any) {
      setError(e?.message ?? "Falha ao carregar cadastros.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reloadAll();
  }, []);

  return (
    <BlingLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cadastros financeiros</h1>
            <p className="text-sm text-slate-500 mt-1">Categorias, centros de custo e plano de contas.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => reloadAll()} variant="secondary" disabled={loading}>
              Atualizar
            </Button>
          </div>
        </div>

        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-1 items-center w-fit">
          <TabButton active={tab === "categories"} onClick={() => setTab("categories")}>
            Categorias
          </TabButton>
          <TabButton active={tab === "costCenters"} onClick={() => setTab("costCenters")}>
            Centros de custo
          </TabButton>
          <TabButton active={tab === "coa"} onClick={() => setTab("coa")}>
            Plano de contas
          </TabButton>
        </div>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

        {tab === "categories" ? (
          <FinanceCadastrosCategories loading={loading} items={categories} onChanged={reloadAll} />
        ) : tab === "costCenters" ? (
          <FinanceCadastrosCostCenters loading={loading} items={costCenters} onChanged={reloadAll} />
        ) : (
          <FinanceCadastrosCoa loading={loading} items={coa} onChanged={reloadAll} />
        )}
      </div>
    </BlingLayout>
  );
}
