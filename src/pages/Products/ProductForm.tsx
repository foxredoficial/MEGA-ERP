import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft, 
  Save, 
  Box,
  Image as ImageIcon,
  FileText,
  Layers,
  DollarSign,
  Plus as PlusIcon,
  UploadCloud,
  Info
} from "lucide-react";
import { BlingHeader } from "@/components/BlingHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { 
  getProduct, 
  createProduct, 
  updateProduct, 
  getStockHistory, 
  type Product,
  type StockMovement,
  getCategories,
  type Category,
  buildCategoryTree,
  flattenCategoryTree
} from "@/lib/api";
import {
  getProductLots,
  createProductLot,
  updateProductLot,
  deleteProductLot,
  type ProductLot,
  type CreateLotData
} from "@/lib/api_lots";
import { format } from "date-fns";

export function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("geral");
  const [stockHistory, setStockHistory] = useState<StockMovement[]>([]);
  const [categories, setCategories] = useState<(Category & { level?: number })[]>([]);
  
  // Variations state
  const [variationName, setVariationName] = useState("");
  const [variationOptions, setVariationOptions] = useState("");
  const [variationsList, setVariationsList] = useState<{name: string, options: string[]}[]>([]);
  const [generatingVariations, setGeneratingVariations] = useState(false);

  // Initial stock state (only for UI in this version, usually handled via separate movement API)
  const [initialStock, setInitialStock] = useState({
    quantity: 0,
    unitPrice: 0,
    unitCost: 0,
    observations: ""
  });

  const [formData, setFormData] = useState<Partial<Product>>({
    format: 'simple',
    type: 'product',
    condition_type: 'new',
    stock: 0,
    stock_min: 0,
    stock_max: 0,
    price: 0,
    crossdocking: 0,
    location: "",
    has_lot_control: false
  });

  // Lot Management State
  const [lots, setLots] = useState<ProductLot[]>([]);
  const [loadingLots, setLoadingLots] = useState(false);
  const [showLotForm, setShowLotForm] = useState(false);
  const [editingLot, setEditingLot] = useState<ProductLot | null>(null);
  const [lotFormData, setLotFormData] = useState<CreateLotData>({
    code: "",
    manufacturing_date: "",
    expiration_date: "",
    observations: ""
  });

  useEffect(() => {
    // Load categories
    getCategories()
      .then(cats => {
        const tree = buildCategoryTree(cats);
        const flat = flattenCategoryTree(tree);
        setCategories(flat);
      })
      .catch(console.error);

    if (isEditing && id) {
      setLoading(true);
      getProduct(id)
        .then(product => {
          setFormData(product);
          if (product.format === 'variation') {
            // Load variations if needed
          }
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
        
      getStockHistory(id)
        .then(history => setStockHistory(history))
        .catch(console.error);
    }
  }, [id, isEditing]);

  const loadLots = async () => {
    if (!id) return;
    setLoadingLots(true);
    try {
      const fetchedLots = await getProductLots(id, true); // Include inactive to show history/prevent changes
      setLots(fetchedLots);
    } catch (error) {
      console.error("Erro ao carregar lotes:", error);
    } finally {
      setLoadingLots(false);
    }
  };

  useEffect(() => {
    if (isEditing && id && formData.has_lot_control) {
      loadLots();
    }
  }, [id, isEditing, formData.has_lot_control]);

  const handleSaveLot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      if (editingLot) {
        await updateProductLot(id, editingLot.id, {
          ...lotFormData,
          is_active: true // Reactivate if editing? Or keep as is? Usually editing implies active.
        });
      } else {
        await createProductLot(id, lotFormData);
      }
      await loadLots();
      setShowLotForm(false);
      setEditingLot(null);
      setLotFormData({ code: "", manufacturing_date: "", expiration_date: "", observations: "" });
    } catch (error) {
      console.error("Erro ao salvar lote:", error);
      alert("Erro ao salvar lote");
    }
  };

  const handleDeleteLot = async (lotId: string) => {
    if (!id || !confirm("Tem certeza que deseja excluir/inativar este lote?")) return;
    try {
      const result = await deleteProductLot(id, lotId);
      if (result.action === 'deactivated') {
        alert("O lote possui movimentações e foi inativado.");
      }
      await loadLots();
    } catch (error) {
      console.error("Erro ao excluir lote:", error);
      alert("Erro ao excluir lote");
    }
  };

  const openLotForm = (lot?: ProductLot) => {
    if (lot) {
      setEditingLot(lot);
      setLotFormData({
        code: lot.code,
        manufacturing_date: lot.manufacturing_date ? lot.manufacturing_date.split('T')[0] : "",
        expiration_date: lot.expiration_date ? lot.expiration_date.split('T')[0] : "",
        observations: lot.observations || ""
      });
    } else {
      setEditingLot(null);
      setLotFormData({ code: "", manufacturing_date: "", expiration_date: "", observations: "" });
    }
    setShowLotForm(true);
  };

  const handleChange = (field: keyof Product, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing && id) {
        await updateProduct(id, formData);
      } else {
        // If we have initial stock, we might want to set it in formData.stock before creating
        // or handle it as a separate movement after creation.
        // For simplicity, we'll assume the backend handles 'stock' field on creation.
        const dataToSubmit = {
          ...formData,
          stock: initialStock.quantity > 0 ? initialStock.quantity : formData.stock,
          cost_price: initialStock.unitCost > 0 ? initialStock.unitCost : formData.cost_price
        };
        const newProductId = await createProduct(dataToSubmit);

        // Handle Variations Creation
        if (formData.format === 'variation' && variationsList.length > 0) {
            const optionsArrays = variationsList.map(v => v.options);
            // Cartesian product helper
            const cartesian = (a: any[]) => a.reduce((a, b) => a.flatMap((d: any) => b.map((e: any) => [d, e].flat())), [[]]);
            const combinations = cartesian(optionsArrays);
            
            for (const combo of combinations) {
                const suffix = combo.join(" - ");
                const varName = `${formData.name} - ${suffix}`;
                const varSku = formData.sku ? `${formData.sku}-${combo.join("-")}` : null;
                
                await createProduct({
                    ...dataToSubmit,
                    name: varName,
                    sku: varSku,
                    format: 'simple',
                    parent_id: newProductId,
                    stock: 0,
                });
            }
        }
      }
      navigate("/app/produtos");
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar produto");
    } finally {
      setSaving(false);
    }
  };

  const handleAddVariations = () => {
    if (!variationName || !variationOptions) return;
    const options = variationOptions.split(/[\n\t,]+/).map(o => o.trim()).filter(Boolean);
    if (options.length === 0) return;
    
    setVariationsList(prev => [...prev, { name: variationName, options }]);
    setVariationName("");
    setVariationOptions("");
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

  return (
    <div className="h-screen w-full flex flex-col bg-white">
      <BlingHeader />
      
      <main className="flex-1 pt-14 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-4">
            <Link to="/app/produtos" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {isEditing ? "Editar Produto" : "Novo Produto"}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-slate-500">
                  {isEditing ? `ID: ${id}` : "Preencha os dados do produto"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate("/app/produtos")}
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

        {/* Tabs */}
        <div className="flex-none border-b border-slate-200 bg-white overflow-x-auto">
          <div className="flex items-center px-6">
            {[
              { id: "geral", label: "Dados Gerais", icon: Box },
              { id: "fiscal", label: "Fiscal", icon: FileText },
              { id: "variacoes", label: "Variações", icon: Layers },
              { id: "estoque", label: "Estoque", icon: Layers },
              { id: "imagens", label: "Imagens", icon: ImageIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="w-full">
            {activeTab === "geral" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Produto</label>
                    <Input 
                      value={formData.name || ""} 
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="Ex: Camiseta Básica Algodão"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
                    <Input 
                      value={formData.sku || ""} 
                      onChange={(e) => handleChange("sku", e.target.value)}
                      placeholder="Ex: CAM-001"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                    <Select 
                      value={formData.category_id || ""}
                      onChange={(e) => handleChange("category_id", e.target.value || null)}
                    >
                      <option value="">Sem categoria</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {'\u00A0'.repeat((cat.level || 0) * 4)}{cat.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Preço de Venda</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        className="pl-9"
                        type="number"
                        value={formData.price || 0} 
                        onChange={(e) => handleChange("price", parseFloat(e.target.value))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unidade</label>
                    <Select 
                      value={formData.unit || "UN"}
                      onChange={(e) => handleChange("unit", e.target.value)}
                    >
                      <option value="UN">Unidade (UN)</option>
                      <option value="KG">Quilograma (KG)</option>
                      <option value="LT">Litro (LT)</option>
                      <option value="CX">Caixa (CX)</option>
                      <option value="MT">Metro (MT)</option>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Formato</label>
                    <Select 
                      value={formData.format || "simple"}
                      onChange={(e) => handleChange("format", e.target.value)}
                      disabled={formData.has_lot_control}
                      title={formData.has_lot_control ? "Desative o controle de lote para alterar o formato" : ""}
                    >
                      <option value="simple">Simples</option>
                      <option value="variation">Com Variação</option>
                    </Select>
                    {formData.has_lot_control && (
                        <p className="text-xs text-yellow-600 mt-1">
                            Desative o controle de lote para alterar.
                        </p>
                    )}
                  </div>

{/* Type selection removed to enforce separation between Products and Services modules */}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Condição</label>
                    <Select 
                      value={formData.condition_type || "new"}
                      onChange={(e) => handleChange("condition_type", e.target.value)}
                    >
                      <option value="new">Novo</option>
                      <option value="used">Usado</option>
                      <option value="not_specified">Não especificado</option>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "fiscal" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <h3 className="text-lg font-medium text-slate-900">Dados da nota fiscal</h3>
                </div>
                
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg mb-6 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    Preencha somente se for emitir nota fiscal. Estes dados serão utilizados para o cálculo automático de impostos.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Origem</label>
                        <Select 
                            value={formData.origin || ""}
                            onChange={(e) => handleChange("origin", e.target.value)}
                        >
                            <option value="">Selecione a origem</option>
                            <option value="0">0 - Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8</option>
                            <option value="1">1 - Estrangeira - Importação direta, exceto a indicada no código 6</option>
                            <option value="2">2 - Estrangeira - Adquirida no mercado interno, exceto a indicada no código 7</option>
                            <option value="3">3 - Nacional, mercadoria ou bem com Conteúdo de Importação &gt; 40% e &lt;= 70%</option>
                            <option value="4">4 - Nacional, cuja produção tenha sido feita em conformidade com os processos produtivos básicos</option>
                            <option value="5">5 - Nacional, mercadoria ou bem com Conteúdo de Importação &lt;= 40%</option>
                            <option value="6">6 - Estrangeira - Importação direta, sem similar nacional, constante em lista da CAMEX</option>
                            <option value="7">7 - Estrangeira - Adquirida no mercado interno, sem similar nacional, constante em lista da CAMEX</option>
                            <option value="8">8 - Nacional, mercadoria ou bem com Conteúdo de Importação &gt; 70%</option>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">NCM</label>
                        <Input 
                            value={formData.ncm || ""} 
                            onChange={(e) => handleChange("ncm", e.target.value)}
                            placeholder="0000.00.00"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">CEST</label>
                        <Input 
                            value={formData.cest || ""} 
                            onChange={(e) => handleChange("cest", e.target.value)}
                            placeholder="00.000.00"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo do item</label>
                        <Select 
                            value={formData.item_type || ""}
                            onChange={(e) => handleChange("item_type", e.target.value)}
                        >
                            <option value="">Selecione</option>
                            <option value="merchandise">Mercadoria para Revenda</option>
                            <option value="raw_material">Matéria-Prima</option>
                            <option value="packaging">Embalagem</option>
                            <option value="product">Produto Acabado</option>
                            <option value="service">Serviço</option>
                        </Select>
                    </div>
                </div>
              </div>
            )}

            {activeTab === "variacoes" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 mb-4">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <h3 className="text-lg font-medium text-slate-900">Variações do Produto</h3>
                </div>
                
                {formData.format === 'variation' ? (
                    <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-semibold text-blue-900">Adicione opções personalizadas aos seus produtos</h4>
                                <p className="text-sm text-blue-700 mt-1">
                                    Abaixo você poderá cadastrar variações do seu produto, como cor, tamanho, voltagem, etc.
                                    O produto será salvo com formato simples se nenhuma variação for informada.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Nome do atributo *</label>
                              <Input 
                                  placeholder="Ex: Cor, tamanho, largura, voltagem..." 
                                  value={variationName}
                                  onChange={(e) => setVariationName(e.target.value)}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Opções</label>
                              <div className="flex gap-2">
                                <Input 
                                    placeholder="Separe as opções com Enter ou Tab" 
                                    value={variationOptions}
                                    onChange={(e) => setVariationOptions(e.target.value)}
                                />
                                <Button 
                                    onClick={handleAddVariations}
                                    disabled={generatingVariations}
                                    variant="outline"
                                    className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 whitespace-nowrap"
                                >
                                    Adicionar variação
                                </Button>
                              </div>
                              <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                                <Info className="w-3 h-3" /> Separe as diferentes opções pressionando tab ou enter
                              </p>
                          </div>
                        </div>

                        {variationsList.length > 0 && (
                          <div className="mt-6 border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                  <th className="px-4 py-2 font-medium text-slate-700">Atributo</th>
                                  <th className="px-4 py-2 font-medium text-slate-700">Opções</th>
                                  <th className="px-4 py-2 font-medium text-slate-700 w-[50px]"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {variationsList.map((v, i) => (
                                  <tr key={i} className="border-b border-slate-100 last:border-0">
                                    <td className="px-4 py-2">{v.name}</td>
                                    <td className="px-4 py-2">
                                      <div className="flex gap-1 flex-wrap">
                                        {v.options.map((opt, j) => (
                                          <span key={j} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                                            {opt}
                                          </span>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      <button 
                                        onClick={() => setVariationsList(prev => prev.filter((_, idx) => idx !== i))}
                                        className="text-red-500 hover:text-red-700"
                                      >
                                        Excluir
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                        <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-slate-900">Formato Simples</h3>
                        <p className="text-slate-500 max-w-md mx-auto mt-2">
                            Este produto está configurado como "Simples". Para adicionar variações (cor, tamanho, etc), altere o formato para "Com Variação" na aba Dados Gerais.
                        </p>
                        <Button 
                            variant="outline" 
                            className="mt-4 border-blue-200 text-blue-700 hover:bg-blue-50"
                            onClick={() => setActiveTab("geral")}
                        >
                            Ir para Dados Gerais
                        </Button>
                    </div>
                )}
              </div>
            )}

            {activeTab === "estoque" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* Stock Config */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <h3 className="text-lg font-medium text-slate-900">Configurações de Estoque</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Mínimo</label>
                      <Input 
                        type="number"
                        value={formData.stock_min || 0}
                        onChange={(e) => handleChange("stock_min", parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Máximo</label>
                      <Input 
                        type="number"
                        value={formData.stock_max || 0}
                        onChange={(e) => handleChange("stock_max", parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Crossdocking</label>
                      <Input 
                        type="number"
                        value={formData.crossdocking || 0}
                        onChange={(e) => handleChange("crossdocking", parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Localização</label>
                      <Input 
                        value={formData.location || ""}
                        onChange={(e) => handleChange("location", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mt-6 border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Box className="w-4 h-4 text-blue-600" />
                            <h3 className="text-lg font-medium text-slate-900">Controle de Lote</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="lot_control" 
                                checked={formData.has_lot_control || false}
                                onChange={(e) => {
                                    if (formData.format === 'variation' && e.target.checked) {
                                        alert("Produtos com variação (pai) não podem ter controle de lote. Ative o controle nas variações individuais.");
                                        return;
                                    }
                                    if (!e.target.checked && lots.length > 0) {
                                        alert("Não é possível desativar o controle de lote enquanto houver lotes cadastrados. Exclua os lotes primeiro.");
                                        return;
                                    }
                                    handleChange("has_lot_control", e.target.checked);
                                }}
                                disabled={formData.format === 'variation'}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                            />
                            <label htmlFor="lot_control" className="text-sm text-slate-700">
                                {formData.has_lot_control ? "Ativado" : "Desativado"}
                            </label>
                        </div>
                    </div>

                    {formData.has_lot_control && (
                        <div className="animate-in fade-in duration-300">
                             {!isEditing ? (
                                <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg text-sm text-yellow-800">
                                    Salve o produto primeiro para gerenciar os lotes.
                                </div>
                             ) : (
                                <div className="space-y-4">
                                    {!showLotForm ? (
                                        <>
                                            <div className="flex justify-end">
                                                <Button onClick={() => openLotForm()} className="gap-2 h-9">
                                                    <PlusIcon className="w-4 h-4" /> Adicionar Lote
                                                </Button>
                                            </div>
                                            
                                            {loadingLots ? (
                                                <div className="text-center py-4 text-slate-500">Carregando lotes...</div>
                                            ) : lots.length === 0 ? (
                                                <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg text-slate-500">
                                                    Nenhum lote cadastrado.
                                                </div>
                                            ) : (
                                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="bg-slate-50 border-b border-slate-200">
                                                            <tr>
                                                                <th className="px-4 py-2 font-medium text-slate-700">Código</th>
                                                                <th className="px-4 py-2 font-medium text-slate-700">Fabricação</th>
                                                                <th className="px-4 py-2 font-medium text-slate-700">Validade</th>
                                                                <th className="px-4 py-2 font-medium text-slate-700">Saldo</th>
                                                                <th className="px-4 py-2 font-medium text-slate-700">Status</th>
                                                                <th className="px-4 py-2 font-medium text-slate-700 text-right">Ações</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {lots.map(lot => (
                                                                <tr key={lot.id} className={`border-b border-slate-100 last:border-0 ${!lot.is_active ? 'bg-slate-50 opacity-60' : ''}`}>
                                                                    <td className="px-4 py-2">{lot.code}</td>
                                                                    <td className="px-4 py-2">{lot.manufacturing_date ? format(new Date(lot.manufacturing_date), 'dd/MM/yyyy') : '-'}</td>
                                                                    <td className="px-4 py-2">{lot.expiration_date ? format(new Date(lot.expiration_date), 'dd/MM/yyyy') : '-'}</td>
                                                                    <td className="px-4 py-2 font-medium">{lot.stock}</td>
                                                                    <td className="px-4 py-2">
                                                                        <span className={`px-2 py-0.5 rounded text-xs ${lot.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                            {lot.is_active ? 'Ativo' : 'Inativo'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-2 text-right">
                                                                        <div className="flex justify-end gap-2">
                                                                            <button onClick={() => openLotForm(lot)} className="text-blue-600 hover:text-blue-800">Editar</button>
                                                                            <button onClick={() => handleDeleteLot(lot.id)} className="text-red-600 hover:text-red-800">Excluir</button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                            <h4 className="font-medium text-slate-900 mb-4">{editingLot ? 'Editar Lote' : 'Novo Lote'}</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Código do Lote *</label>
                                                    <Input 
                                                        value={lotFormData.code} 
                                                        onChange={e => setLotFormData({...lotFormData, code: e.target.value})}
                                                        placeholder="Ex: LOTE-001"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                                                    <Input 
                                                        value={lotFormData.observations || ""} 
                                                        onChange={e => setLotFormData({...lotFormData, observations: e.target.value})}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Data de Fabricação</label>
                                                    <Input 
                                                        type="date"
                                                        value={lotFormData.manufacturing_date || ""} 
                                                        onChange={e => setLotFormData({...lotFormData, manufacturing_date: e.target.value})}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Data de Validade</label>
                                                    <Input 
                                                        type="date"
                                                        value={lotFormData.expiration_date || ""} 
                                                        onChange={e => setLotFormData({...lotFormData, expiration_date: e.target.value})}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2 mt-4">
                                                <Button variant="outline" onClick={() => setShowLotForm(false)}>Cancelar</Button>
                                                <Button onClick={handleSaveLot} disabled={!lotFormData.code}>Salvar Lote</Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                             )}
                        </div>
                    )}
                  </div>
                </div>

                {/* Initial Balance */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Box className="w-4 h-4 text-blue-600" />
                        <h3 className="text-lg font-medium text-slate-900">Saldo inicial</h3>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
                      <p className="text-slate-600 mb-4">
                        Para gerenciar o estoque de um produto já cadastrado, utilize as movimentações de estoque.
                      </p>
                      <div className="flex justify-center gap-4 text-sm">
                        <div className="bg-white px-4 py-2 rounded border border-slate-200 shadow-sm">
                          <span className="block text-slate-500 text-xs uppercase tracking-wider">Estoque Atual</span>
                          <span className="block text-xl font-bold text-slate-900">{formData.stock || 0}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-lg p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Depósito</label>
                          <Select defaultValue="geral">
                            <option value="geral">Geral</option>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade</label>
                          <Input 
                            type="number"
                            value={initialStock.quantity}
                            onChange={(e) => setInitialStock({...initialStock, quantity: parseFloat(e.target.value)})}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Preço de compra unitário</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input 
                              className="pl-9"
                              type="number"
                              value={initialStock.unitPrice}
                              onChange={(e) => setInitialStock({...initialStock, unitPrice: parseFloat(e.target.value)})}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Custo de compra Un</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input 
                              className="pl-9"
                              type="number"
                              value={initialStock.unitCost}
                              onChange={(e) => setInitialStock({...initialStock, unitCost: parseFloat(e.target.value)})}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Observações do saldo inicial</label>
                        <textarea 
                          className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 min-h-[80px]"
                          value={initialStock.observations}
                          onChange={(e) => setInitialStock({...initialStock, observations: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "imagens" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 mb-4">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <h3 className="text-lg font-medium text-slate-900">Imagem principal do produto</h3>
                </div>

                <div className="bg-purple-50 border border-purple-100 p-3 rounded-lg flex items-center gap-2 mb-6">
                  <div className="p-1 bg-purple-100 rounded">
                    <ImageIcon className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-sm text-purple-800">Beta: Clique na imagem para opção de remover fundo.</span>
                </div>

                <p className="text-sm text-slate-500 mb-4">
                  Você pode remover o fundo das imagens para atender aos requisitos dos canais de venda.
                </p>

                <div className="border-2 border-dashed border-green-400/50 bg-white rounded-lg p-12 text-center transition-colors hover:bg-green-50/30 cursor-pointer">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="p-3 bg-slate-50 rounded-full">
                      <UploadCloud className="w-8 h-8 text-slate-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">Arraste arquivos para cá</h4>
                      <p className="text-sm text-slate-500 mt-1">
                        ou se preferir <span className="text-blue-600 hover:underline">anexar arquivos</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 text-sm text-slate-500">
                  <Info className="w-4 h-4" />
                  <span>Imagens armazenadas no Sistema</span>
                  <button className="text-blue-600 hover:underline">clique aqui</button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
}
