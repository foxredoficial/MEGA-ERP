import { useState, useEffect } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { 
  ArrowLeft, 
  Save, 
  FolderTree,
  Check,
  Palette
} from "lucide-react";
import { BlingHeader } from "@/components/BlingHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { 
  getCategory, 
  getCategories,
  createCategory, 
  updateCategory, 
  type Category,
  buildCategoryTree,
  flattenCategoryTree
} from "@/lib/api_categories";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

const PRESET_COLORS = [
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#10b981", // Green
  "#f59e0b", // Yellow
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#6b7280", // Gray
  "#000000", // Black
];

export function CategoryForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialParentId = searchParams.get("parent_id");

  const isEditing = !!id;
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<(Category & { level?: number })[]>([]);

  const [formData, setFormData] = useState<Partial<Category>>({
    parent_id: initialParentId || null,
    color: "#3b82f6"
  });

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: "danger" | "warning" | "info" | "success";
  }>({
    isOpen: false,
    title: "",
    description: "",
    variant: "info"
  });

  const showAlert = (title: string, description: string, variant: "danger" | "warning" | "info" | "success" = "info") => {
    setAlertState({ isOpen: true, title, description, variant });
  };

  useEffect(() => {
    // Load all categories for parent selection
    getCategories()
      .then(cats => {
        const tree = buildCategoryTree(cats);
        const flat = flattenCategoryTree(tree);
        setCategories(flat);
      })
      .catch(console.error);

    if (isEditing && id) {
      setLoading(true);
      getCategory(id)
        .then(data => setFormData(data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [id, isEditing]);

  const handleChange = (field: keyof Category, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!formData.name) {
        showAlert("Campo Obrigatório", "O nome da categoria é obrigatório", "warning");
        setSaving(false);
        return;
      }

      // Prevent selecting itself as parent
      if (isEditing && id && formData.parent_id === id) {
        showAlert("Seleção Inválida", "Uma categoria não pode ser pai dela mesma", "warning");
        setSaving(false);
        return;
      }

      if (isEditing && id) {
        await updateCategory(id, formData);
      } else {
        await createCategory(formData);
      }
      navigate("/app/categorias");
    } catch (error) {
      console.error(error);
      showAlert("Erro", "Erro ao salvar categoria", "danger");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col bg-white">
        <BlingHeader />
        <div className="flex-1 pt-14 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Filter out the current category from parent options to avoid cycles (simple 1-level check)
  const parentOptions = categories.filter(c => c.id !== id);

  return (
    <div className="h-screen w-full flex flex-col bg-white">
      <BlingHeader />
      
      <main className="flex-1 pt-14 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-4">
            <Link to="/app/categorias" className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-zinc-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">
                {isEditing ? "Editar Categoria" : "Nova Categoria"}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-zinc-500">
                  {isEditing ? `ID: ${id}` : "Defina os dados da categoria"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => setCancelDialogOpen(true)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50">
          <div className="w-full mx-auto">
            <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-300">
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderTree className="w-5 h-5 text-blue-600" />
                    Informações Básicas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Name and Description */}
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-2">
                          Nome da Categoria <span className="text-red-500">*</span>
                        </label>
                        <Input 
                          value={formData.name || ""} 
                          onChange={(e) => handleChange("name", e.target.value)}
                          placeholder="Ex: Eletrônicos"
                          className="text-lg h-12"
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-2">Descrição</label>
                        <textarea 
                          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 min-h-[120px] resize-y"
                          value={formData.description || ""}
                          onChange={(e) => handleChange("description", e.target.value)}
                          placeholder="Descrição opcional para esta categoria..."
                        />
                      </div>
                    </div>

                    {/* Right Column: Parent and Color */}
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-2">Categoria Pai</label>
                        <Select 
                          value={formData.parent_id || ""}
                          onChange={(e) => handleChange("parent_id", e.target.value || null)}
                          className="h-12"
                        >
                          <option value="">Nenhuma (Raiz)</option>
                          {parentOptions.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {'\u00A0'.repeat((cat.level || 0) * 4)}{cat.name}
                            </option>
                          ))}
                        </Select>
                        <p className="text-xs text-zinc-500 mt-2">
                          Selecione uma categoria pai para criar uma subcategoria.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-3 flex items-center gap-2">
                          <Palette className="w-4 h-4" />
                          Cor da Etiqueta
                        </label>
                        <div className="flex flex-wrap gap-3">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => handleChange("color", color)}
                              className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${
                                formData.color === color 
                                  ? "border-zinc-900 scale-110 shadow-md" 
                                  : "border-transparent hover:scale-105"
                              }`}
                              style={{ backgroundColor: color }}
                              title={color}
                            >
                              {formData.color === color && (
                                <Check className="w-5 h-5 text-white drop-shadow-md" strokeWidth={3} />
                              )}
                            </button>
                          ))}
                          <div className="relative">
                            <input
                              type="color"
                              value={formData.color || "#3b82f6"}
                              onChange={(e) => handleChange("color", e.target.value)}
                              className="w-10 h-10 rounded-full overflow-hidden opacity-0 absolute inset-0 cursor-pointer"
                              title="Cor personalizada"
                            />
                            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center bg-white ${
                              !PRESET_COLORS.includes(formData.color || "") 
                                ? "border-zinc-900 scale-110 shadow-md" 
                                : "border-zinc-200"
                            }`}>
                              <div 
                                className="w-full h-full rounded-full"
                                style={{ 
                                  background: !PRESET_COLORS.includes(formData.color || "") 
                                    ? formData.color 
                                    : 'conic-gradient(from 180deg at 50% 50%, #FF0000 0deg, #00FF00 120deg, #0000FF 240deg, #FF0000 360deg)'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">
                          Esta cor será usada para identificar visualmente a categoria nas listagens.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </main>

      <ConfirmationDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={() => navigate("/app/categorias")}
        title="Cancelar Edição"
        description="Tem certeza que deseja cancelar? Todas as alterações não salvas serão perdidas."
        confirmText="Sim, cancelar"
        variant="warning"
      />

      <ConfirmationDialog
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        description={alertState.description}
        confirmText="OK"
        variant={alertState.variant}
        showCancel={false}
      />
    </div>
  );
}