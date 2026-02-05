
import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { 
  Save, 
  ArrowLeft,
  Calendar,
  Search,
  Plus,
  Trash2,
  DollarSign,
  Percent
} from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { 
  createPriceList, 
  getPriceList, 
  updatePriceList, 
  type PriceListInput,
  type PriceListItem
} from "@/lib/api_price_lists";
import { getProducts, type Product } from "@/lib/api_products";
import { formatCurrency, parseCurrency, maskCurrency } from "@/lib/masks";

export function PriceListForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Search state for product selection
  const [productSearch, setProductSearch] = useState("");
  
  const [formData, setFormData] = useState<Partial<PriceListInput>>({
    name: "",
    type: "percentage",
    adjustment_type: "increase",
    adjustment_value: 0,
    status: "active",
    start_date: null,
    end_date: null
  });

  // Local state for items to manage UI efficiently
  // We store product_id and price (for custom lists)
  // For rule lists, price is calculated on the fly for display, but sent as null/calculated
  const [selectedItems, setSelectedItems] = useState<Array<{
    product_id: string;
    price?: number | null; // Custom price
    product?: Product; // Populated for display
  }>>([]);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [productsData, listData] = await Promise.all([
        getProducts(),
        id ? getPriceList(id) : null
      ]);

      setProducts(productsData);

      if (listData) {
        setFormData({
          name: listData.name,
          type: listData.type,
          adjustment_type: listData.adjustment_type,
          adjustment_value: listData.adjustment_value,
          status: listData.status,
          start_date: listData.start_date,
          end_date: listData.end_date
        });

        if (listData.items) {
          const itemsWithProduct = listData.items.map(item => ({
            product_id: item.product_id,
            price: item.price,
            product: productsData.find(p => p.id === item.product_id)
          })).filter(i => i.product);
          setSelectedItems(itemsWithProduct as any);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (field: keyof PriceListInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddItem = (product: Product) => {
    if (selectedItems.some(i => i.product_id === product.id)) return;
    
    setSelectedItems(prev => [
      ...prev, 
      { 
        product_id: product.id, 
        price: product.price, // Default to current price
        product 
      }
    ]);
  };

  const handleRemoveItem = (productId: string) => {
    setSelectedItems(prev => prev.filter(i => i.product_id !== productId));
  };

  const handleCustomPriceChange = (productId: string, newPrice: number) => {
    setSelectedItems(prev => prev.map(item => 
      item.product_id === productId ? { ...item, price: newPrice } : item
    ));
  };

  const calculateFinalPrice = (originalPrice: number) => {
    if (formData.type === 'custom') return originalPrice; // Should use item.price instead
    
    const value = formData.adjustment_value || 0;
    const isIncrease = formData.adjustment_type === 'increase';
    
    if (formData.type === 'fixed_value') {
      return isIncrease ? originalPrice + value : Math.max(0, originalPrice - value);
    } else {
      // Percentage
      const factor = value / 100;
      return isIncrease 
        ? originalPrice * (1 + factor) 
        : Math.max(0, originalPrice * (1 - factor));
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name) return;

    try {
      setSaving(true);
      
      const payload: PriceListInput = {
        name: formData.name!,
        type: formData.type!,
        adjustment_type: formData.adjustment_type,
        adjustment_value: formData.adjustment_value,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: formData.status!,
        items: selectedItems.map(item => ({
          product_id: item.product_id,
          price: formData.type === 'custom' ? item.price : calculateFinalPrice(item.product?.price || 0)
        }))
      };

      if (isEditing) {
        await updatePriceList(id!, payload);
      } else {
        await createPriceList(payload);
      }
      
      navigate("/app/listas-preco");
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setSaving(false);
    }
  }

  const availableProducts = products.filter(p => 
    !selectedItems.some(i => i.product_id === p.id) &&
    (p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
     p.sku?.toLowerCase().includes(productSearch.toLowerCase()))
  );

  return (
    <BlingLayout>
      <form onSubmit={handleSubmit} className="pb-20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/app/listas-preco">
              <Button variant="ghost" size="icon" type="button">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-zinc-800">
                {isEditing ? "Editar Lista de Preços" : "Nova Lista de Preços"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/app/listas-preco">
              <Button variant="outline" type="button">Cancelar</Button>
            </Link>
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Salvando..." : "Salvar Lista"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Config */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
              <h2 className="font-semibold text-zinc-800 mb-4">Configurações Gerais</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Nome da Lista</label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Ex: Tabela Atacado 2024"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Tipo de Precificação</label>
                  <Select 
                    value={formData.type} 
                    onChange={(e) => handleChange("type", e.target.value)}
                  >
                    <option value="percentage">Percentual (%)</option>
                    <option value="fixed_value">Valor Fixo (R$)</option>
                    <option value="custom">Personalizada (Por Produto)</option>
                  </Select>
                </div>

                {formData.type !== 'custom' && (
                  <div className="p-4 bg-zinc-50 rounded-md border border-zinc-100 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Regra de Ajuste</label>
                      <div className="flex gap-2">
                        <Button 
                          type="button"
                          variant={formData.adjustment_type === 'increase' ? 'primary' : 'outline'}
                          onClick={() => handleChange("adjustment_type", "increase")}
                          className={`flex-1 ${formData.adjustment_type === 'increase' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        >
                          Acrescer (+)
                        </Button>
                        <Button 
                          type="button"
                          variant={formData.adjustment_type === 'decrease' ? 'primary' : 'outline'}
                          onClick={() => handleChange("adjustment_type", "decrease")}
                          className={`flex-1 ${formData.adjustment_type === 'decrease' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                        >
                          Descontar (-)
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        Valor do Ajuste {formData.type === 'percentage' ? '(%)' : '(R$)'}
                      </label>
                      <Input 
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.adjustment_value || ""}
                        onChange={(e) => handleChange("adjustment_value", parseFloat(e.target.value))}
                        placeholder={formData.type === 'percentage' ? "Ex: 10" : "Ex: 50.00"}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Data Início</label>
                    <Input 
                      type="date"
                      value={formData.start_date ? new Date(formData.start_date).toISOString().split('T')[0] : ""}
                      onChange={(e) => handleChange("start_date", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Data Fim</label>
                    <Input 
                      type="date"
                      value={formData.end_date ? new Date(formData.end_date).toISOString().split('T')[0] : ""}
                      onChange={(e) => handleChange("end_date", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Status</label>
                  <Select 
                    value={formData.status} 
                    onChange={(e) => handleChange("status", e.target.value)}
                  >
                    <option value="active">Ativa</option>
                    <option value="inactive">Inativa</option>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Products Selection */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200 min-h-[600px] flex flex-col">
              <h2 className="font-semibold text-zinc-800 mb-4">Produtos da Lista</h2>
              
              {/* Product Adder */}
              <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input 
                  placeholder="Pesquisar produto para adicionar..." 
                  className="pl-10"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
                {productSearch && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-zinc-200 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto z-10">
                    {availableProducts.length === 0 ? (
                      <div className="p-3 text-sm text-zinc-500 text-center">Nenhum produto encontrado</div>
                    ) : (
                      availableProducts.map(product => (
                        <div 
                          key={product.id}
                          className="p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b border-zinc-50 last:border-0"
                          onClick={() => {
                            handleAddItem(product);
                            setProductSearch("");
                          }}
                        >
                          <div>
                            <div className="font-medium text-sm">{product.name}</div>
                            <div className="text-xs text-zinc-500">SKU: {product.sku || '-'}</div>
                          </div>
                          <div className="text-sm font-medium text-zinc-700">
                            {formatCurrency(product.price)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected Products Table */}
              <div className="flex-1 overflow-auto border rounded-md border-zinc-200">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50 text-zinc-500 font-medium sticky top-0 z-0">
                    <tr>
                      <th className="px-4 py-3">Produto</th>
                      <th className="px-4 py-3 text-right">Preço Original</th>
                      {formData.type !== 'custom' && (
                        <th className="px-4 py-3 text-right">Ajuste</th>
                      )}
                      <th className="px-4 py-3 text-right">Preço Final</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {selectedItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                          Nenhum produto selecionado. Adicione produtos acima.
                        </td>
                      </tr>
                    ) : (
                      selectedItems.map((item) => {
                        const originalPrice = item.product?.price || 0;
                        const finalPrice = formData.type === 'custom' 
                          ? (item.price || 0) 
                          : calculateFinalPrice(originalPrice);

                        return (
                          <tr key={item.product_id} className="hover:bg-zinc-50">
                            <td className="px-4 py-3">
                              <div className="font-medium">{item.product?.name}</div>
                              <div className="text-xs text-zinc-400">{item.product?.sku}</div>
                            </td>
                            <td className="px-4 py-3 text-right text-zinc-500">
                              {formatCurrency(originalPrice)}
                            </td>
                            {formData.type !== 'custom' && (
                              <td className="px-4 py-3 text-right text-xs">
                                <span className={formData.adjustment_type === 'increase' ? 'text-green-600' : 'text-red-600'}>
                                  {formData.adjustment_type === 'increase' ? '+' : '-'}
                                  {formData.adjustment_value}
                                  {formData.type === 'percentage' ? '%' : ''}
                                </span>
                              </td>
                            )}
                            <td className="px-4 py-3 text-right font-medium">
                              {formData.type === 'custom' ? (
                                <div className="flex justify-end">
                                  <Input 
                                    className="w-32 text-right h-8"
                                    value={formatCurrency(item.price || 0)}
                                    onChange={(e) => {
                                      const numeric = parseCurrency(maskCurrency(e.target.value));
                                      handleCustomPriceChange(item.product_id, numeric);
                                    }}
                                  />
                                </div>
                              ) : (
                                <span className={finalPrice !== originalPrice ? "text-blue-600" : ""}>
                                  {formatCurrency(finalPrice)}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button 
                                type="button"
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 text-zinc-400 hover:text-red-600"
                                onClick={() => handleRemoveItem(item.product_id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-sm text-zinc-500 text-right">
                {selectedItems.length} produtos selecionados
              </div>
            </div>
          </div>
        </div>
      </form>
    </BlingLayout>
  );
}
