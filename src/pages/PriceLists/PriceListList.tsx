
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Tag,
  Calendar,
  Percent,
  DollarSign
} from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getPriceLists, deletePriceList, type PriceList } from "@/lib/api_price_lists";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { format } from "date-fns";
import { Pagination } from "@/components/ui/Pagination";

export function PriceListList() {
  const [lists, setLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    loadLists();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  async function loadLists() {
    try {
      setLoading(true);
      const data = await getPriceLists();
      setLists(data);
    } catch (error) {
      console.error("Erro ao carregar listas de preços:", error);
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
      await deletePriceList(deleteId);
      loadLists();
    } catch (error) {
      console.error("Erro ao excluir lista:", error);
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteId(null);
    }
  }

  const filteredLists = useMemo(() => {
    const q = search.toLowerCase();
    return lists.filter((l) => l.name.toLowerCase().includes(q));
  }, [lists, search]);

  const total = filteredLists.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedLists = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return filteredLists.slice(start, end);
  }, [filteredLists, page, pageSize, totalPages]);

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'percentage': return 'Percentual';
      case 'fixed_value': return 'Valor Fixo';
      case 'custom': return 'Personalizada';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-700' 
      : 'bg-slate-100 text-slate-600';
  };

  return (
    <BlingLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Listas de Preços</h1>
            <p className="text-sm text-slate-500 mt-1">Gerencie regras de precificação e tabelas personalizadas.</p>
          </div>
          <Link to="/app/listas-preco/novo">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2">
              <Plus className="w-4 h-4" />
              Nova Lista
            </Button>
          </Link>
        </div>

        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar lista de preços..." 
              className="pl-10 border-none shadow-none focus-visible:ring-0 bg-transparent h-12 text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Ajuste</th>
                  <th className="px-6 py-4">Vigência</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Carregando listas...
                    </td>
                  </tr>
                ) : filteredLists.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Nenhuma lista de preços encontrada.
                    </td>
                  </tr>
                ) : (
                  pagedLists.map((list) => (
                    <tr key={list.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <Link to={`/app/listas-preco/${list.id}`} className="font-semibold text-slate-900 hover:text-blue-600">
                          {list.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {list.type === 'percentage' && <Percent className="w-4 h-4 text-blue-500" />}
                          {list.type === 'fixed_value' && <DollarSign className="w-4 h-4 text-green-500" />}
                          {list.type === 'custom' && <Tag className="w-4 h-4 text-purple-500" />}
                          <span>{getTypeLabel(list.type)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {list.type === 'custom' ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <span className={list.adjustment_type === 'increase' ? 'text-green-600' : 'text-red-600'}>
                            {list.adjustment_type === 'increase' ? '+' : '-'}
                            {list.adjustment_value}
                            {list.type === 'percentage' ? '%' : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        <div className="flex flex-col gap-0.5">
                          {list.start_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> De: {format(new Date(list.start_date), 'dd/MM/yyyy')}
                            </span>
                          )}
                          {list.end_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Até: {format(new Date(list.end_date), 'dd/MM/yyyy')}
                            </span>
                          )}
                          {!list.start_date && !list.end_date && <span>Indeterminado</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(list.status)}`}>
                          {list.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/app/listas-preco/${list.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-red-600"
                            onClick={() => handleDeleteClick(list.id)}
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
            label="Listas"
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
        title="Excluir Lista de Preços"
        description="Tem certeza que deseja excluir esta lista? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        variant="danger"
      />
    </BlingLayout>
  );
}
