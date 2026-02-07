import { useState, useEffect } from "react";
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
import { getProducts, deleteProduct, type Product } from "@/lib/api";
import { formatBRLFromCents } from "@/lib/money";

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

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

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      await deleteProduct(id);
      loadProducts();
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
    }
  }

  const filteredProducts = products.filter(p => 
    p.type === 'product' && 
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())))
  );

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
             <Button variant="ghost" className="text-slate-500 hover:text-blue-600">
               <Filter className="w-4 h-4 mr-2" />
               <span className="text-sm">Filtros</span>
             </Button>
             <Button variant="ghost" className="text-slate-500 hover:text-blue-600">
               <Download className="w-4 h-4 mr-2" />
               <span className="text-sm">Exportar</span>
             </Button>
          </div>
        </div>

        {/* Table - Matches ContactList */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 w-14">
                    <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
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
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
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
                            onClick={() => handleDelete(product.id)}
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
      </div>
    </BlingLayout>
  );
}
