import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  FolderTree,
  ChevronRight,
  CornerDownRight
} from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  getCategories, 
  deleteCategory, 
  type Category,
  buildCategoryTree,
  flattenCategoryTree
} from "@/lib/api_categories";

import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

export function CategoryList() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
      const data = await getCategories();
      setCategories(data || []);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
      setCategories([]);
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
      await deleteCategory(deleteId);
      loadCategories();
    } catch (error) {
      console.error("Erro ao excluir categoria:", error);
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteId(null);
    }
  }

  const getParentName = (parentId: string | null) => {
    if (!parentId) return "-";
    const parent = categories.find(c => c.id === parentId);
    return parent ? parent.name : "N/A";
  };

  // Determine what to display based on search
  let displayCategories: (Category & { level?: number })[] = [];
  
  if (search) {
    displayCategories = categories.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  } else {
    const hierarchy = buildCategoryTree(categories);
    displayCategories = flattenCategoryTree(hierarchy);
  }

  return (
    <BlingLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Categorias de Produtos</h1>
            <p className="text-sm text-zinc-500 mt-1">Organize seus produtos em departamentos e seções.</p>
          </div>
          <div className="flex items-center gap-3">
             <Link to="/app/categorias/nova">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2">
                <Plus className="w-4 h-4" />
                Nova Categoria
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-white p-1 rounded-xl shadow-sm border border-zinc-200 flex flex-col md:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input 
              placeholder="Buscar categorias..." 
              className="pl-10 border-none shadow-none focus-visible:ring-0 bg-transparent h-12 text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50/50 text-zinc-500 font-medium border-b border-zinc-100">
                <tr>
                  <th className="px-6 py-4 w-[60%]">Nome</th>
                  <th className="px-6 py-4">Categoria Pai</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                        <p>Carregando categorias...</p>
                      </div>
                    </td>
                  </tr>
                ) : displayCategories.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <FolderTree className="w-12 h-12 text-zinc-300 mb-4" />
                        <h3 className="text-lg font-medium text-zinc-900 mb-1">Nenhuma categoria encontrada</h3>
                        <p className="text-zinc-500 mb-6">Comece criando sua primeira categoria de produtos.</p>
                        <Link to="/app/categorias/nova">
                          <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                            Adicionar Nova
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayCategories.map((category) => (
                    <tr key={category.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {/* Indentation logic */}
                          <div style={{ width: `${(category.level || 0) * 32}px` }} className="flex-shrink-0" />
                          
                          {category.level && category.level > 0 ? (
                            <CornerDownRight className="w-4 h-4 text-zinc-300 mr-2 -ml-1" />
                          ) : null}
                          
                          <Link to={`/app/categorias/${category.id}`} className="font-semibold text-zinc-900 hover:text-blue-600 transition-colors flex items-center gap-3">
                             <div 
                                className="w-4 h-4 rounded-full flex-shrink-0 border border-black/5 shadow-sm" 
                                style={{ backgroundColor: category.color || '#e4e4e7' }}
                                title="Cor da categoria"
                              ></div>
                            {category.name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-600">
                        {category.parent_id ? (
                          <div className="flex items-center gap-1">
                            <span className="bg-zinc-100 px-2 py-0.5 rounded text-xs text-zinc-500 border border-zinc-200">
                              {getParentName(category.parent_id)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-xs uppercase tracking-wider font-medium">Raiz</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 gap-1 px-2"
                            onClick={() => navigate(`/app/categorias/nova?parent_id=${category.id}`)}
                            title="Adicionar subcategoria"
                          >
                            <Plus className="w-4 h-4" />
                            <span className="text-xs">Sub</span>
                          </Button>
                          <Link to={`/app/categorias/${category.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-blue-600 hover:bg-blue-50">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteClick(category.id)}
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

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir Categoria"
        description="Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        variant="danger"
      />
    </BlingLayout>
  );
}