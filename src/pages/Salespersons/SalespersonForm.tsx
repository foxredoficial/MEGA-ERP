import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft, 
  Save, 
  User,
  FileText,
  Mail,
  Phone,
  Percent,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { 
  getSalesperson, 
  createSalesperson, 
  updateSalesperson, 
  type Salesperson 
} from "@/lib/api_salespersons";

export function SalespersonForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("geral");

  const [formData, setFormData] = useState<Partial<Salesperson>>({
    status: 'active',
    commission_rate: 0
  });

  useEffect(() => {
    if (isEditing && id) {
      setLoading(true);
      getSalesperson(id)
        .then(data => setFormData(data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [id, isEditing]);

  const handleChange = (field: keyof Salesperson, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!formData.name) {
        alert("O nome do vendedor é obrigatório");
        setSaving(false);
        return;
      }

      if (isEditing && id) {
        await updateSalesperson(id, formData);
      } else {
        await createSalesperson(formData);
      }
      navigate("/app/vendedores");
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar vendedor");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <BlingLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </BlingLayout>
    );
  }

  return (
    <BlingLayout>
      <div className="flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-4">
            <Link to="/app/vendedores" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {isEditing ? "Editar Vendedor" : "Novo Vendedor"}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-slate-500">
                  {isEditing ? `ID: ${id}` : "Preencha os dados do vendedor"}
                </span>
                {formData.status && (
                   <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                     formData.status === 'active' 
                       ? 'bg-green-50 text-green-700 border border-green-100' 
                       : 'bg-slate-100 text-slate-600 border border-slate-200'
                   }`}>
                     {formData.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                     {formData.status === 'active' ? 'Ativo' : 'Inativo'}
                   </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate("/app/vendedores")}
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
              { id: "geral", label: "Dados Gerais", icon: User },
              { id: "observacoes", label: "Observações", icon: FileText },
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
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <div className="w-full">
            {activeTab === "geral" && (
              <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-300">
                {/* Basic Info Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Informações Pessoais
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Nome Completo <span className="text-red-500">*</span>
                      </label>
                      <Input 
                        value={formData.name || ""} 
                        onChange={(e) => handleChange("name", e.target.value)}
                        placeholder="Ex: João da Silva"
                        className="bg-slate-50"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                      <Input 
                        value={formData.cpf || ""} 
                        onChange={(e) => handleChange("cpf", e.target.value)}
                        placeholder="000.000.000-00"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                      <Select 
                        value={formData.status || "active"}
                        onChange={(e) => handleChange("status", e.target.value)}
                      >
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Contact Info Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    Contato
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          value={formData.email || ""} 
                          onChange={(e) => handleChange("email", e.target.value)}
                          placeholder="email@exemplo.com"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Telefone / WhatsApp</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          value={formData.phone || ""} 
                          onChange={(e) => handleChange("phone", e.target.value)}
                          placeholder="(00) 00000-0000"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Commission Info Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-blue-600" />
                    Comissionamento
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Comissão (%)</label>
                      <div className="relative">
                        <Input 
                          type="number"
                          value={formData.commission_rate || ""} 
                          onChange={(e) => handleChange("commission_rate", parseFloat(e.target.value))}
                          placeholder="0.00"
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Percentual aplicado sobre as vendas deste vendedor.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "observacoes" && (
              <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-300">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Observações Internas
                  </h2>
                  <div>
                    <textarea 
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 min-h-[150px]"
                      value={formData.observations || ""}
                      onChange={(e) => handleChange("observations", e.target.value)}
                      placeholder="Observações sobre o vendedor..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </BlingLayout>
  );
}
