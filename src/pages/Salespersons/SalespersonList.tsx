import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  User,
  Percent,
  Phone,
  Mail
} from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { getSalespersons, deleteSalesperson, type Salesperson } from "@/lib/api_salespersons";
import { Select } from "@/components/ui/Select";
import { AdvancedDateFilter } from "@/components/filters/AdvancedDateFilter";
import { computePreset, inRange, suggestedGranularity, type DateFilterValue } from "@/components/filters/dateRange";
import { Pagination } from "@/components/ui/Pagination";

export function SalespersonList() {
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | Salesperson["status"]>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const [dateFilter, setDateFilter] = useState<DateFilterValue>(() => {
    const r = computePreset("this_month");
    return { preset: "this_month", range: r, granularity: suggestedGranularity(r), compare: { mode: "previous_period" } };
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    loadSalespersons();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateFilter.range.start.getTime(), dateFilter.range.end.getTime()]);

  async function loadSalespersons() {
    try {
      setLoading(true);
      const data = await getSalespersons();
      setSalespersons(data || []);
    } catch (error) {
      console.error("Erro ao carregar vendedores:", error);
      setSalespersons([]);
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteClick(id: string) {
    setDeleteId(id);
    setIsDeleteDialogOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deleteId) return;
    try {
      await deleteSalesperson(deleteId);
      await loadSalespersons();
    } catch (error) {
      console.error("Erro ao excluir vendedor:", error);
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteId(null);
    }
  }

  async function confirmBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map((id) => deleteSalesperson(id)));
      setSelectedIds(new Set());
      await loadSalespersons();
    } catch (error) {
      console.error("Erro ao excluir vendedores:", error);
    } finally {
      setBulkDeleteOpen(false);
    }
  }

  const filteredSalespersons = useMemo(() => {
    const term = search.toLowerCase();
    return salespersons.filter((s) => {
      const dt = new Date(((s.updated_at || s.created_at) as any) ?? "");
      if (!Number.isNaN(dt.getTime()) && !inRange(dt, dateFilter.range)) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      return (
        s.name.toLowerCase().includes(term) ||
        (s.email && s.email.toLowerCase().includes(term)) ||
        (s.phone && s.phone.includes(search))
      );
    });
  }, [salespersons, search, statusFilter, dateFilter.range]);

  const total = filteredSalespersons.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedSalespersons = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return filteredSalespersons.slice(start, end);
  }, [filteredSalespersons, page, pageSize, totalPages]);

  const selectedCount = selectedIds.size;
  const allVisibleSelected = pagedSalespersons.length > 0 && pagedSalespersons.every((s) => selectedIds.has(s.id));

  function toggleAllVisible(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const s of pagedSalespersons) {
        if (checked) next.add(s.id);
        else next.delete(s.id);
      }
      return next;
    });
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <BlingLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Vendedores</h1>
            <p className="text-sm text-slate-500 mt-1">Gerencie sua equipe de vendas e comissões.</p>
          </div>
          <div className="flex items-center gap-3">
             <Link to="/app/vendedores/novo">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2">
                <Plus className="w-4 h-4" />
                Novo Vendedor
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar vendedores..." 
              className="pl-10 border-none shadow-none focus-visible:ring-0 bg-transparent h-12 text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
          <div className="flex items-center gap-2 pr-2 w-full md:w-auto justify-end">
            <AdvancedDateFilter label="Data" value={dateFilter} onChange={setDateFilter} />
            <Select className="h-11" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
              <option value="all">Status: Todos</option>
              <option value="active">Status: Ativo</option>
              <option value="inactive">Status: Inativo</option>
            </Select>
          </div>
        </div>

        {selectedCount > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-slate-700">Selecionados: <span className="font-semibold">{selectedCount}</span></div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setSelectedIds(new Set())}>
                Limpar seleção
              </Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setBulkDeleteOpen(true)}>
                Excluir selecionados
              </Button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 w-14">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={allVisibleSelected}
                      onChange={(e) => toggleAllVisible(e.target.checked)}
                    />
                  </th>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Contato</th>
                  <th className="px-6 py-4">Comissão (%)</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                        <p>Carregando vendedores...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredSalespersons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <User className="w-12 h-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-1">Nenhum vendedor encontrado</h3>
                        <p className="text-slate-500 mb-6">Comece adicionando seu primeiro vendedor.</p>
                        <Link to="/app/vendedores/novo">
                          <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                            Adicionar Novo
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedSalespersons.map((salesperson) => (
                    <tr key={salesperson.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedIds.has(salesperson.id)}
                          onChange={(e) => toggleOne(salesperson.id, e.target.checked)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <Link to={`/app/vendedores/${salesperson.id}`} className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                          {salesperson.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                           {salesperson.email && (
                             <div className="flex items-center gap-1.5 text-slate-600">
                               <Mail className="w-3.5 h-3.5 text-slate-400" />
                               <span className="text-xs">{salesperson.email}</span>
                             </div>
                           )}
                           {salesperson.phone && (
                             <div className="flex items-center gap-1.5 text-slate-600">
                               <Phone className="w-3.5 h-3.5 text-slate-400" />
                               <span className="text-xs">{salesperson.phone}</span>
                             </div>
                           )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Percent className="w-4 h-4 text-slate-400" />
                          {salesperson.commission_rate ? salesperson.commission_rate.toFixed(2) : "0.00"}%
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          salesperson.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {salesperson.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/app/vendedores/${salesperson.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteClick(salesperson.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
          <Pagination
            label="Vendedores"
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

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir Vendedor"
        description="Tem certeza que deseja excluir este vendedor? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        variant="danger"
      />

      <ConfirmationDialog
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={confirmBulkDelete}
        title="Excluir selecionados"
        description={`Deseja excluir ${selectedCount} vendedor(es)? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        variant="danger"
      />
    </BlingLayout>
  );
}
