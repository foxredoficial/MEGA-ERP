import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Landmark } from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { listBankAccounts, type BankAccount } from "@/lib/api_banks";
import { formatCurrency } from "@/lib/utils";
import { Pagination } from "@/components/ui/Pagination";

export function BankAccountsList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  async function load() {
    try {
      setLoading(true);
      const data = await listBankAccounts();
      setAccounts(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return accounts;
    return accounts.filter((a) => a.name.toLowerCase().includes(q) || (a.bank ?? "").toLowerCase().includes(q));
  }, [accounts, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedAccounts = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return filtered.slice(start, end);
  }, [filtered, page, pageSize, totalPages]);

  return (
    <BlingLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Caixas e Bancos</h1>
            <p className="text-sm text-slate-500 mt-1">Cadastre contas e registre movimentações bancárias.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/app/financeiro/bancos/novo">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2">
                <Plus className="w-4 h-4" />
                Nova Conta
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Pesquisar por nome do banco ou conta..."
              className="pl-10 border-none shadow-none focus-visible:ring-0 bg-transparent h-12 text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-320px)]">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4">Conta</th>
                  <th className="px-6 py-4">Banco</th>
                  <th className="px-6 py-4">Agência</th>
                  <th className="px-6 py-4">Número</th>
                  <th className="px-6 py-4 text-right">Saldo</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pagedAccounts.map((a) => (
                  <tr key={a.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-900">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{a.bank ?? "-"}</td>
                    <td className="px-6 py-4 text-slate-700">{a.agency ?? "-"}</td>
                    <td className="px-6 py-4 text-slate-700">{a.accountNumber ?? "-"}</td>
                    <td className="px-6 py-4 text-right font-medium">
                      <Badge tone={a.balance >= 0 ? "green" : "red"}>{formatCurrency(a.balance)}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="outline" size="sm" className="border-slate-200" onClick={() => navigate(`/app/financeiro/bancos/${a.id}`)}>
                        Abrir
                      </Button>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Nenhuma conta encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
          <Pagination
            label="Contas"
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
        </div>
      </div>
    </BlingLayout>
  );
}
