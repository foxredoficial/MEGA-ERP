import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft, 
  Save, 
  Box,
  FileText,
  DollarSign,
  Info,
  Tags,
  AlignLeft,
  Percent
} from "lucide-react";
import { BlingHeader } from "@/components/BlingHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { 
  getProduct, 
  createProduct, 
  updateProduct, 
  type Product
} from "@/lib/api";

export function ServiceForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("geral");
  
  const [formData, setFormData] = useState<Partial<Product>>({
    format: 'simple',
    type: 'service',
    condition_type: 'not_specified',
    stock: 0,
    stock_min: 0,
    stock_max: 0,
    price: 0,
    cost_price: 0,
    crossdocking: 0,
    location: "",
    has_lot_control: false,
    iss_retention: false,
    origin: "0"
  });

  useEffect(() => {
    if (isEditing && id) {
      setLoading(true);
      getProduct(id)
        .then(product => {
          setFormData(product);
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [id, isEditing]);

  const handleChange = (field: keyof Product, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      alert("O nome do serviço é obrigatório");
      return;
    }

    setSaving(true);
    try {
      if (isEditing && id) {
        await updateProduct(id, formData);
      } else {
        await createProduct(formData);
      }
      navigate("/app/servicos");
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar serviço");
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

  return (
    <div className="h-screen w-full flex flex-col bg-white">
      <BlingHeader />
      
      <main className="flex-1 pt-14 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-4">
            <Link to="/app/servicos" className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-zinc-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">
                {isEditing ? "Editar Serviço" : "Novo Serviço"}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-zinc-500">
                  {isEditing ? `ID: ${id}` : "Preencha os dados do serviço"}
                </span>
                {formData.sku && (
                  <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-mono border border-zinc-200">
                    SKU: {formData.sku}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate("/app/servicos")}
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
        <div className="flex-none border-b border-zinc-200 bg-white overflow-x-auto">
          <div className="flex items-center px-6">
            {[
              { id: "geral", label: "Dados Gerais", icon: Box },
              { id: "fiscal", label: "Fiscal", icon: FileText },
              { id: "detalhes", label: "Detalhes", icon: AlignLeft },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-zinc-600 hover:text-zinc-900 hover:border-zinc-300"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50">
          <div className="w-full">
            
            {activeTab === "geral" && (
              <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-300">
                {/* Identificação */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
                  <h3 className="text-lg font-medium text-zinc-900 mb-4 flex items-center gap-2">
                    <Box className="w-4 h-4 text-blue-600" />
                    Identificação
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-8">
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Nome do Serviço <span className="text-red-500">*</span></label>
                      <Input 
                        value={formData.name || ""} 
                        onChange={(e) => handleChange("name", e.target.value)}
                        placeholder="Ex: Consultoria Técnica Especializada"
                        className="focus-visible:ring-blue-500"
                      />
                    </div>
                    
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Código (SKU)</label>
                      <Input 
                        value={formData.sku || ""} 
                        onChange={(e) => handleChange("sku", e.target.value)}
                        placeholder="Ex: SERV-001"
                      />
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Unidade</label>
                      <Select 
                        value={formData.unit || "UN"}
                        onChange={(e) => handleChange("unit", e.target.value)}
                      >
                        <option value="UN">Unidade (UN)</option>
                        <option value="HR">Hora (HR)</option>
                        <option value="DIA">Dia (DIA)</option>
                        <option value="SV">Serviço (SV)</option>
                        <option value="MES">Mês (MÊS)</option>
                        <option value="ANO">Ano (ANO)</option>
                      </Select>
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Categoria</label>
                      <Select 
                        value={formData.category_id || ""}
                        onChange={(e) => handleChange("category_id", e.target.value)}
                      >
                        <option value="">Sem categoria</option>
                        <option value="manutencao">Manutenção</option>
                        <option value="consultoria">Consultoria</option>
                        <option value="instalação">Instalação</option>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Preços */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
                  <h3 className="text-lg font-medium text-zinc-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    Preços
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Preço de Venda</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">R$</span>
                        <Input 
                          className="pl-9 font-medium text-zinc-900"
                          type="number"
                          value={formData.price || 0} 
                          onChange={(e) => handleChange("price", parseFloat(e.target.value))}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Preço de Custo</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">R$</span>
                        <Input 
                          className="pl-9"
                          type="number"
                          value={formData.cost_price || 0} 
                          onChange={(e) => handleChange("cost_price", parseFloat(e.target.value))}
                          placeholder="0.00"
                        />
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">Usado para cálculo de margem.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "fiscal" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-zinc-900">Configuração Fiscal</h3>
                      <p className="text-sm text-zinc-500">Dados obrigatórios para emissão de NFS-e</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-12">
                      <div className="flex items-start gap-3 p-4 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-100 mb-2">
                        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">
                          O <strong>Código do Serviço (LC 116)</strong> e o <strong>Código NBS</strong> são fundamentais para a correta tributação da nota fiscal de serviço. Consulte seu contador em caso de dúvidas.
                        </p>
                      </div>
                    </div>

                    <div className="md:col-span-8">
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Código do Serviço (LC 116/03)</label>
                      <Input 
                        value={formData.service_code_lc116 || ""} 
                        onChange={(e) => handleChange("service_code_lc116", e.target.value)}
                        placeholder="Ex: 14.01 - Lubrificação, limpeza, lustração..."
                      />
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Código NBS</label>
                      <Input 
                        value={formData.nbs_code || ""} 
                        onChange={(e) => handleChange("nbs_code", e.target.value)}
                        placeholder="Ex: 1.01"
                      />
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Alíquota de ISS (%)</label>
                      <div className="relative">
                        <Input 
                          type="number"
                          value={formData.iss_rate || ""} 
                          onChange={(e) => handleChange("iss_rate", parseFloat(e.target.value))}
                          placeholder="0.00"
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">%</span>
                      </div>
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Origem</label>
                      <Select 
                        value={formData.origin || "0"}
                        onChange={(e) => handleChange("origin", e.target.value)}
                      >
                        <option value="0">0 - Nacional</option>
                        <option value="1">1 - Estrangeira (Imp. direta)</option>
                        <option value="2">2 - Estrangeira (Adq. no mercado interno)</option>
                      </Select>
                    </div>

                    <div className="md:col-span-4 flex items-end pb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={formData.iss_retention || false}
                          onChange={(e) => handleChange("iss_retention", e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-zinc-700">Retenção de ISS</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "detalhes" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
                  <h3 className="text-lg font-medium text-zinc-900 mb-4 flex items-center gap-2">
                    <AlignLeft className="w-4 h-4 text-purple-600" />
                    Descrições e Observações
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Descrição Curta</label>
                      <Input 
                        value={formData.description_short || ""} 
                        onChange={(e) => handleChange("description_short", e.target.value)}
                        placeholder="Breve descrição para listagens"
                      />
                      <p className="text-xs text-zinc-500 mt-1">Aparece em listagens simples e resumos.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Descrição Complementar (Propostas/OS)</label>
                      <textarea 
                        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                        value={formData.description_complementary || ""} 
                        onChange={(e) => handleChange("description_complementary", e.target.value)}
                        placeholder="Descreva detalhadamente o escopo do serviço..."
                      />
                      <p className="text-xs text-zinc-500 mt-1">Este texto pode ser usado automaticamente em propostas comerciais e ordens de serviço.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Observações Internas</label>
                      <textarea 
                        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                        value={formData.observations || ""} 
                        onChange={(e) => handleChange("observations", e.target.value)}
                        placeholder="Anotações internas, não visíveis ao cliente..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
