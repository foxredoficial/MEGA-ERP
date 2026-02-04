import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft, 
  Save, 
  Box,
  FileText,
  DollarSign,
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
    crossdocking: 0,
    location: "",
    has_lot_control: false
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
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="max-w-4xl">
            {activeTab === "geral" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Nome do Serviço</label>
                    <Input 
                      value={formData.name || ""} 
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="Ex: Consultoria Técnica, Instalação, Manutenção..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Código (SKU)</label>
                    <Input 
                      value={formData.sku || ""} 
                      onChange={(e) => handleChange("sku", e.target.value)}
                      placeholder="Ex: SERV-001"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Preço de Venda</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
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
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Unidade</label>
                    <Select 
                      value={formData.unit || "UN"}
                      onChange={(e) => handleChange("unit", e.target.value)}
                    >
                      <option value="UN">Unidade (UN)</option>
                      <option value="HR">Hora (HR)</option>
                      <option value="DIA">Dia (DIA)</option>
                      <option value="SV">Serviço (SV)</option>
                    </Select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Observações</label>
                    <Input 
                      value={formData.observations || ""} 
                      onChange={(e) => handleChange("observations", e.target.value)}
                      placeholder="Detalhes adicionais sobre o serviço..."
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "fiscal" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <h3 className="text-lg font-medium text-zinc-900">Dados fiscais do serviço</h3>
                </div>
                
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg mb-6 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    Estes dados serão utilizados para a emissão de Nota Fiscal de Serviço (NFS-e).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Origem</label>
                        <Select 
                            value={formData.origin || ""}
                            onChange={(e) => handleChange("origin", e.target.value)}
                        >
                            <option value="">Selecione a origem</option>
                            <option value="0">0 - Nacional</option>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Código NBS (Nomenclatura Brasileira de Serviços)</label>
                        <Input 
                            value={formData.ncm || ""} 
                            onChange={(e) => handleChange("ncm", e.target.value)}
                            placeholder="Ex: 1.01"
                        />
                        <p className="text-xs text-zinc-500 mt-1">Utilize o campo NCM para informar o NBS/LC116 se necessário.</p>
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
