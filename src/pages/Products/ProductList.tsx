import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Copy, 
  ShoppingCart,
  Box,
  Image as ImageIcon,
  Download,
  Calendar
} from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { getProducts, deleteProduct, type Product } from "@/lib/api";
import { formatBRLFromCents } from "@/lib/money";
import { downloadCsv, toCsv } from "@/lib/csv";
import { AdvancedDateFilter } from "@/components/filters/AdvancedDateFilter";
import { computePreset, inRange, suggestedGranularity, type DateFilterValue } from "@/components/filters/dateRange";
import { Pagination } from "@/components/ui/Pagination";

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const [dateFilter, setDateFilter] = useState<DateFilterValue>(() => {
    const r = computePreset("this_month");
    return { preset: "this_month", range: r, granularity: suggestedGranularity(r), compare: { mode: "previous_period" } };
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, dateFilter.range.start.getTime(), dateFilter.range.end.getTime()]);

  async function loadProducts() {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
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
      await deleteProduct(deleteId);
      await loadProducts();
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteId(null);
    }
  }

  const filteredProducts = useMemo(() =>
    products.filter((p) => {
      if (p.type !== "product") return false;
      const dt = new Date((p.updated_at || p.created_at) as any);
      if (!Number.isNaN(dt.getTime()) && !inRange(dt, dateFilter.range)) return false;
      const term = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(term) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        (p.gtin && p.gtin.toLowerCase().includes(term)) ||
        (p.gtin_tax && p.gtin_tax.toLowerCase().includes(term))
      );
    }),
  [products, search, dateFilter.range]);

  const total = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedProducts = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return filteredProducts.slice(start, end);
  }, [filteredProducts, page, pageSize, totalPages]);

  const selectedCount = selectedIds.size;
  const allVisibleSelected = pagedProducts.length > 0 && pagedProducts.every((p) => selectedIds.has(p.id));

  function toggleAllVisible(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const p of pagedProducts) {
        if (checked) next.add(p.id);
        else next.delete(p.id);
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

  async function confirmBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map((id) => deleteProduct(id)));
      setSelectedIds(new Set());
      await loadProducts();
    } catch (error) {
      console.error("Erro ao excluir produtos:", error);
    } finally {
      setBulkDeleteOpen(false);
    }
  }

  function handleExport() {
    const rows = filteredProducts.map((p) => ({
      name: p.name,
      sku: p.sku ?? "",
      price: (p.price ?? 0).toFixed(2),
      stock: String(p.stock ?? 0),
      unit: p.unit ?? "",
      location: (p as any).location ?? "",
    }));
    const csv = toCsv(rows, [
      { key: "name", label: "Nome" },
      { key: "sku", label: "SKU" },
      { key: "price", label: "Preço" },
      { key: "stock", label: "Estoque" },
      { key: "unit", label: "Un" },
      { key: "location", label: "Localização" },
    ]);
    downloadCsv("produtos.csv", csv);
  }

  return (
    <BlingLayout>
      <div className="space-y-6">
        {/* Header Section - Matches ContactList */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Produtos</h1>
            <p className="text-sm text-slate-500 mt-1">Gerencie seu catálogo de produtos e serviços.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/app/produtos/novo">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2">
                <Plus className="w-4 h-4" />
                Novo Produto
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters & Toolbar - Matches ContactList */}
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Pesquisar por nome ou SKU..." 
              className="pl-10 border-none shadow-none focus-visible:ring-0 bg-transparent h-12 text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
          <div className="flex items-center gap-2 pr-2 w-full md:w-auto justify-end">
             <AdvancedDateFilter
               label="Data"
               value={dateFilter}
               onChange={setDateFilter}
               showCompare={false}
               showGranularity={false}
               allowedGranularities={["day", "week", "month"]}
             />
             <Button variant="ghost" className="text-slate-500 hover:text-blue-600" onClick={handleExport}>
               <Download className="w-4 h-4 mr-2" />
               <span className="text-sm">Exportar</span>
             </Button>
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

        {/* Table - Matches ContactList */}
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
                  <th className="px-6 py-4">Produto</th>
                  <th className="px-6 py-4">SKU</th>
                  <th className="px-6 py-4">Preço</th>
                  <th className="px-6 py-4">Estoque</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                        <p>Carregando produtos...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <Box className="w-12 h-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-1">Nenhum produto encontrado</h3>
                        <p className="text-slate-500 mb-6">Comece adicionando seu primeiro produto ou serviço.</p>
                        <Link to="/app/produtos/novo">
                          <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                            Adicionar Novo
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedIds.has(product.id)}
                          onChange={(e) => toggleOne(product.id, e.target.checked)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <Link to={`/app/produtos/${product.id}`} className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                            {product.name}
                          </Link>
                          <span className="text-xs text-slate-500 capitalize">{product.type === 'service' ? 'Serviço' : 'Produto'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                        {product.sku || "-"}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {formatBRLFromCents(product.price * 100)}
                      </td>
                      <td className="px-6 py-4">
                         <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                           product.stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                         }`}>
                           {product.stock} {product.unit}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/app/produtos/${product.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteClick(product.id)}
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
            label="Produtos"
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
        title="Excluir Produto"
        description="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        variant="danger"
      />

      <ConfirmationDialog
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={confirmBulkDelete}
        title="Excluir selecionados"
        description={`Deseja excluir ${selectedCount} produto(s)? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        variant="danger"
      />
    </BlingLayout>
  );
}
