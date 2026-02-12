import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  Save, 
  ChevronDown,
  ChevronRight,
  Plus,
  Info,
  Search,
  Trash2,
  Building2,
  MapPin,
  Phone,
  FileText,
  DollarSign,
  MessageSquare
} from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { getContact, createContact, updateContact, type ContactInput } from "@/lib/api_contacts";
import { maskCpfCnpj, 
  maskCPF,
  maskCNPJ,
  maskPhone, 
  maskZip,
} from "@/lib/masks";
import { cn } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

interface ContactFormProps {
  type?: 'client' | 'supplier';
}

export function ContactForm({ type }: ContactFormProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const isSupplier = type === 'supplier';
  const basePath = isSupplier ? "/app/fornecedores" : "/app/clientes";
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Collapsible sections state
  const [sections, setSections] = useState({
    dadosCadastrais: true,
    endereco: true,
    contato: true,
    dadosAdicionais: false,
    financeiro: true,
    observacoes: true
  });

  const toggleSection = (section: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const [formData, setFormData] = useState<Partial<ContactInput>>({
    type: 'fisica',
    status: 'ativo',
    credit_limit_type: 'limitado',
    contacts_json: [],
    gender: null,
    contact_type: isSupplier ? 'fornecedor' : 'cliente'
  });

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: "danger" | "warning" | "info" | "success";
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    variant: "info"
  });

  const showAlert = (title: string, description: string, variant: "danger" | "warning" | "info" | "success" = "info", onConfirm?: () => void) => {
    setAlertState({ isOpen: true, title, description, variant, onConfirm });
  };

  const isPJ = formData.type === 'juridica';
  const isPF = formData.type === 'fisica';

  useEffect(() => {
    if (isPF && formData.contributor_type != null) {
      setFormData((prev) => ({ ...prev, contributor_type: null }));
    }
  }, [isPF]);

  useEffect(() => {
    if (isEditing) {
      loadContact();
    }
  }, [id]);

  async function loadContact() {
    try {
      setLoading(true);
      const data = await getContact(id!);
      
      // Ensure contacts_json is an array
      let contacts = data.contacts_json;
      if (typeof contacts === 'string') {
        try {
          contacts = JSON.parse(contacts);
        } catch (e) {
          contacts = [];
        }
      }
      if (!Array.isArray(contacts)) contacts = [];

      // Ensure parents_json is an object
      let parents = data.parents_json;
      if (typeof parents === 'string') {
        try {
          parents = JSON.parse(parents);
        } catch (e) {
          parents = {};
        }
      }
      if (typeof parents !== 'object' || parents === null) parents = {};
      
      setFormData({ ...data, contacts_json: contacts, parents_json: parents });
    } catch (error) {
      console.error("Erro ao carregar contato:", error);
      showAlert("Erro", "Erro ao carregar contato", "danger", () => navigate(basePath));
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (field: keyof ContactInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMaskedChange = (field: keyof ContactInput, value: string, maskFunction: (v: string) => string) => {
    handleChange(field, maskFunction(value));
  };

  const addSubContact = () => {
    const newContact = { name: "", email: "", phone: "" };
    const currentContacts = Array.isArray(formData.contacts_json) ? formData.contacts_json : [];
    handleChange("contacts_json", [...currentContacts, newContact]);
  };

  const removeSubContact = (index: number) => {
    const currentContacts = Array.isArray(formData.contacts_json) ? formData.contacts_json : [];
    const newContacts = [...currentContacts];
    newContacts.splice(index, 1);
    handleChange("contacts_json", newContacts);
  };

  const updateSubContact = (index: number, field: string, value: string) => {
    const currentContacts = Array.isArray(formData.contacts_json) ? formData.contacts_json : [];
    const newContacts = [...currentContacts];
    
    let processedValue = value;
    if (field === 'phone') {
      processedValue = maskPhone(value);
    }

    newContacts[index] = { ...newContacts[index], [field]: processedValue };
    handleChange("contacts_json", newContacts);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.name) {
      showAlert("Campo Obrigatório", "O nome é obrigatório", "warning");
      return;
    }

    try {
      setSaving(true);
      const payload: any = { ...formData };
      payload.contact_type = isSupplier ? "fornecedor" : "cliente";
      if (payload.type === "fisica") {
        payload.contributor_type = null;
      }
      if (isEditing) {
        await updateContact(id!, payload);
        showAlert("Sucesso", "Contato atualizado com sucesso!", "success", () => navigate(basePath));
      } else {
        await createContact(payload);
        showAlert("Sucesso", "Contato criado com sucesso!", "success", () => navigate(basePath));
      }
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      showAlert("Erro", "Erro ao salvar: " + (error.message || "Erro desconhecido"), "danger");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <BlingLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500">Carregando...</div>
        </div>
      </BlingLayout>
    );
  }

  return (
    <BlingLayout>
      <form onSubmit={handleSubmit} className="pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-0">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {isEditing ? (isSupplier ? "Editar Fornecedor" : "Editar Cliente") : isSupplier ? "Novo Fornecedor" : "Novo Cliente"}
            </h1>
            <div className="text-sm text-slate-500 mt-1">Cadastros</div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              type="button" 
              className="hover:bg-slate-50 hover:text-slate-900"
              onClick={() => setCancelDialogOpen(true)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className={cn(
                "text-white min-w-[120px] shadow-lg gap-2 font-medium",
                "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
              )}
              disabled={saving}
            >
              <Save className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar Contato"}
            </Button>
          </div>
        </div>

        <div className="space-y-6 max-w-full mx-auto">
          
          {/* Dados Cadastrais */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div 
              className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggleSection('dadosCadastrais')}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-blue-100 text-blue-600">
                  <Building2 className="w-4 h-4" />
                </div>
                <h2 className="font-semibold text-slate-800">Dados cadastrais</h2>
              </div>
              {sections.dadosCadastrais ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </div>
            
            {sections.dadosCadastrais && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Linha 1: Tipo, Código, Contribuinte */}
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo da Pessoa</label>
                  <Select 
                    value={formData.type}
                    onChange={(e) => handleChange("type", e.target.value as any)}
                  >
                    <option value="fisica">Pessoa Física</option>
                    <option value="juridica">Pessoa Jurídica</option>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Código <span title="Código interno"><Info className="inline w-3.5 h-3.5 ml-1 cursor-help text-blue-400" /></span>
                  </label>
                  <Input 
                    value={formData.code || ""} 
                    onChange={(e) => handleChange("code", e.target.value)}
                    className="focus-visible:ring-blue-500 border-slate-300"
                    placeholder="Auto"
                  />
                </div>

                {isPJ && (
                <div className="md:col-span-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Contribuinte</label>
                  <Select 
                    value={formData.contributor_type || 9}
                    onChange={(e) => handleChange("contributor_type", parseInt(e.target.value))}
                  >
                    <option value={1}>1 - Contribuinte ICMS</option>
                    <option value={2}>2 - Contribuinte isento</option>
                    <option value={9}>9 - Não contribuinte</option>
                  </Select>
                </div>
                )}

                {/* Linha 2: Nomes */}
                <div className="md:col-span-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {isPJ ? "Razão Social" : "Nome Completo"} <span className="text-red-500">*</span>
                  </label>
                  <Input 
                    value={formData.name || ""} 
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="focus-visible:ring-blue-500 border-slate-300"
                    placeholder={isPJ ? "Razão Social da Empresa" : "Nome Completo do Contato"}
                  />
                </div>
                
                <div className="md:col-span-6">
                  {isPJ ? (
                    <>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Fantasia <span title="Nome fantasia da empresa"><Info className="inline w-3.5 h-3.5 ml-1 cursor-help text-blue-400" /></span>
                      </label>
                      <Input 
                        value={formData.fantasy_name || ""} 
                        onChange={(e) => handleChange("fantasy_name", e.target.value)}
                        className="focus-visible:ring-blue-500 border-slate-300"
                        placeholder="Nome Fantasia"
                      />
                    </>
                  ) : (
                    <>
                       <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Data de Nascimento
                      </label>
                      <Input 
                        type="date"
                        value={formData.birth_date?.split('T')[0] || ""} 
                        onChange={(e) => handleChange("birth_date", e.target.value)}
                        className="focus-visible:ring-blue-500 border-slate-300"
                      />
                    </>
                  )}
                </div>

                {/* Linha 3: Documentos e Fundação (se PJ) */}
                <div className="md:col-span-4">
                   <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {isPJ ? "CNPJ" : "CPF"}
                  </label>
                  <Input 
                    value={formData.cpf_cnpj || ""} 
                    onChange={(e) => {
                      if (isPJ) {
                        handleMaskedChange("cpf_cnpj", e.target.value, maskCNPJ);
                      } else {
                        handleMaskedChange("cpf_cnpj", e.target.value, maskCPF);
                      }
                    }}
                    maxLength={isPJ ? 18 : 14}
                    className="focus-visible:ring-blue-500 border-slate-300"
                    placeholder={isPJ ? "00.000.000/0000-00" : "000.000.000-00"}
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                     {isPJ ? "Inscrição Estadual" : "RG"}
                  </label>
                  <Input 
                    value={formData.rg_ie || ""} 
                    onChange={(e) => handleChange("rg_ie", e.target.value)}
                    className="focus-visible:ring-blue-500 border-slate-300"
                    placeholder={isPJ ? "Inscrição Estadual" : "RG"}
                  />
                </div>

                {isPJ && (
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Data de Fundação
                    </label>
                    <Input 
                      type="date"
                      value={formData.birth_date?.split('T')[0] || ""} 
                      onChange={(e) => handleChange("birth_date", e.target.value)}
                      className="focus-visible:ring-blue-500 border-slate-300"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contato */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div 
              className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggleSection('contato')}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-blue-100 text-blue-600">
                  <Phone className="w-4 h-4" />
                </div>
                <h2 className="font-semibold text-slate-800">Contato</h2>
              </div>
              {sections.contato ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </div>
            
            {sections.contato && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Celular / WhatsApp</label>
                    <Input 
                      value={formData.mobile || ""} 
                      onChange={(e) => handleMaskedChange("mobile", e.target.value, maskPhone)}
                      className="focus-visible:ring-blue-500 border-slate-300"
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefone</label>
                    <Input 
                      value={formData.phone || ""} 
                      onChange={(e) => handleMaskedChange("phone", e.target.value, maskPhone)}
                      className="focus-visible:ring-blue-500 border-slate-300"
                      placeholder="(00) 0000-0000"
                    />
                  </div>

                  <div className="md:col-span-6">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail Principal</label>
                    <Input 
                      value={formData.email || ""} 
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="focus-visible:ring-blue-500 border-slate-300"
                      type="email"
                      placeholder="exemplo@email.com"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-3">Contatos Adicionais</label>
                  
                  {(Array.isArray(formData.contacts_json) ? formData.contacts_json : []).map((contact: any, index: number) => (
                    <div key={index} className="flex gap-3 mb-3 items-start bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <label className="text-xs text-slate-500 mb-1 block">Nome</label>
                        <Input 
                          value={contact.name} 
                          onChange={(e) => updateSubContact(index, 'name', e.target.value)}
                          className="h-9 text-sm focus-visible:ring-blue-500 border-slate-300"
                          placeholder="Nome do contato"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-slate-500 mb-1 block">E-mail</label>
                        <Input 
                          value={contact.email} 
                          onChange={(e) => updateSubContact(index, 'email', e.target.value)}
                          className="h-9 text-sm focus-visible:ring-blue-500 border-slate-300"
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefone</label>
                        <Input 
                          value={contact.phone} 
                          onChange={(e) => updateSubContact(index, 'phone', e.target.value)}
                          className="h-9 text-sm focus-visible:ring-blue-500 border-slate-300"
                          placeholder="(00) 0000-0000"
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeSubContact(index)}
                        className="mt-6 text-red-500 hover:text-red-700 p-1"
                        title="Remover contato"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addSubContact}
                    className={cn(
                      "mt-2",
                      "text-blue-600 border-blue-200 hover:bg-blue-50"
                    )}
                  >
                    <Plus className="w-3 h-3 mr-2" />
                    Adicionar contato
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Endereço */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div 
              className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggleSection('endereco')}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-blue-100 text-blue-600">
                  <MapPin className="w-4 h-4" />
                </div>
                <h2 className="font-semibold text-slate-800">Endereço</h2>
              </div>
              {sections.endereco ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </div>
            
            {sections.endereco && (
              <div className="p-6">
                <div className="flex border-b border-slate-200 mb-6">
                  <button
                    type="button"
                    className={cn(
                      "px-4 py-2 text-sm font-medium border-b-2",
                      "text-blue-600 border-blue-600"
                    )}
                  >
                    Geral
                  </button>
                  <button type="button" className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t">Cobrança</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">CEP</label>
                    <div className="relative">
                      <Input 
                        value={formData.address_zip || ""} 
                        onChange={(e) => handleMaskedChange("address_zip", e.target.value, maskZip)}
                        className="focus-visible:ring-blue-500 border-slate-300 pr-8"
                        placeholder="00000-000"
                      />
                      <Search
                        className={cn(
                          "absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 cursor-pointer",
                          "hover:text-blue-600"
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="md:col-span-5">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Endereço</label>
                    <Input 
                      value={formData.address_street || ""} 
                      onChange={(e) => handleChange("address_street", e.target.value)}
                      className="focus-visible:ring-blue-500 border-slate-300"
                      placeholder="Rua, Avenida, etc"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Número</label>
                    <Input 
                      value={formData.address_number || ""} 
                      onChange={(e) => handleChange("address_number", e.target.value)}
                      className="focus-visible:ring-blue-500 border-slate-300"
                    />
                  </div>
                  
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Complemento</label>
                    <Input 
                      value={formData.address_complement || ""} 
                      onChange={(e) => handleChange("address_complement", e.target.value)}
                      className="focus-visible:ring-blue-500 border-slate-300"
                      placeholder="Apto, Bloco, Sala"
                    />
                  </div>

                  <div className="md:col-span-5">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Bairro</label>
                    <Input 
                      value={formData.address_neighborhood || ""} 
                      onChange={(e) => handleChange("address_neighborhood", e.target.value)}
                      className="focus-visible:ring-blue-500 border-slate-300"
                    />
                  </div>

                  <div className="md:col-span-5">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Cidade</label>
                    <Input 
                      value={formData.address_city || ""} 
                      onChange={(e) => handleChange("address_city", e.target.value)}
                      className="focus-visible:ring-blue-500 border-slate-300"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">UF</label>
                    <Input 
                      value={formData.address_state || ""} 
                      onChange={(e) => handleChange("address_state", e.target.value)}
                      className="focus-visible:ring-blue-500 border-slate-300"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Dados Adicionais */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div 
              className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggleSection('dadosAdicionais')}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-blue-100 text-blue-600">
                  <FileText className="w-4 h-4" />
                </div>
                <h2 className="font-semibold text-slate-800">Dados Adicionais</h2>
              </div>
              {sections.dadosAdicionais ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </div>
            
            {sections.dadosAdicionais && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Linha 1: Situação e Vendedor */}
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Situação</label>
                  <Select 
                    value={formData.status || "ativo"}
                    onChange={(e) => handleChange("status", e.target.value)}
                    className={cn(
                      "font-medium",
                      formData.status === 'ativo' ? "text-green-600 bg-green-50" : 
                      formData.status === 'inativo' ? "text-red-600 bg-red-50" : "text-slate-600 bg-slate-50"
                    )}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="sem_movimento">Sem Movimento</option>
                  </Select>
                </div>

                {!isSupplier && (
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Vendedor</label>
                    <Select>
                      <option value="">Selecione um vendedor</option>
                    </Select>
                  </div>
                )}

                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{isSupplier ? "Fornecedor Desde" : "Cliente Desde"}</label>
                  <Input 
                    type="date"
                    value={formData.date_since?.split('T')[0] || ""} 
                    onChange={(e) => handleChange("date_since", e.target.value)}
                    className="focus-visible:ring-blue-500 border-slate-300"
                  />
                </div>

                {/* Linha 2: Operação e Carga */}
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Natureza de Operação Padrão</label>
                  <Input 
                    value={formData.operation_nature || ""} 
                    onChange={(e) => handleChange("operation_nature", e.target.value)}
                    className="focus-visible:ring-blue-500 border-slate-300"
                    placeholder="Ex: Venda de Mercadoria"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">% Carga Média (Opcional)</label>
                  <Input 
                    type="number"
                    value={formData.avg_load || ""} 
                    onChange={(e) => handleChange("avg_load", parseFloat(e.target.value))}
                    className="focus-visible:ring-blue-500 border-slate-300"
                    placeholder="0.00"
                  />
                </div>

                {/* Dados PF Específicos */}
                {isPF && (
                  <>
                    <div className="md:col-span-12 border-t border-slate-100 my-2"></div>
                    
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Gênero</label>
                      <Select 
                        value={formData.gender || ""}
                        onChange={(e) => handleChange("gender", e.target.value)}
                      >
                        <option value="">Selecione</option>
                        <option value="masculino">Masculino</option>
                        <option value="feminino">Feminino</option>
                        <option value="outro">Outro</option>
                      </Select>
                    </div>

                    <div className="md:col-span-3">
                       <label className="block text-sm font-medium text-slate-700 mb-1.5">Estado Civil</label>
                       <Select 
                         value={formData.marital_status || ""}
                         onChange={(e) => handleChange("marital_status", e.target.value)}
                       >
                         <option value="">Selecione</option>
                         <option value="solteiro">Solteiro(a)</option>
                         <option value="casado">Casado(a)</option>
                         <option value="divorciado">Divorciado(a)</option>
                         <option value="viuvo">Viúvo(a)</option>
                         <option value="uniao_estavel">União Estável</option>
                       </Select>
                    </div>

                    <div className="md:col-span-3">
                       <label className="block text-sm font-medium text-slate-700 mb-1.5">Profissão</label>
                       <Input 
                         value={formData.profession || ""} 
                         onChange={(e) => handleChange("profession", e.target.value)}
                         className="focus-visible:ring-blue-500 border-slate-300"
                         placeholder="Profissão"
                       />
                    </div>

                    <div className="md:col-span-3">
                       <label className="block text-sm font-medium text-slate-700 mb-1.5">Naturalidade</label>
                       <Input 
                         value={formData.naturalness || ""} 
                         onChange={(e) => handleChange("naturalness", e.target.value)}
                         className="focus-visible:ring-blue-500 border-slate-300"
                         placeholder="Cidade/Estado"
                       />
                    </div>

                    {/* Filiação */}
                    <div className="md:col-span-6">
                       <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome do Pai</label>
                       <Input 
                         value={formData.parents_json?.father || ""} 
                         onChange={(e) => handleChange("parents_json", { ...formData.parents_json, father: e.target.value })}
                         className="focus-visible:ring-blue-500 border-slate-300"
                         placeholder="Nome do Pai"
                       />
                    </div>
                    <div className="md:col-span-6">
                       <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome da Mãe</label>
                       <Input 
                         value={formData.parents_json?.mother || ""} 
                         onChange={(e) => handleChange("parents_json", { ...formData.parents_json, mother: e.target.value })}
                         className="focus-visible:ring-blue-500 border-slate-300"
                         placeholder="Nome da Mãe"
                       />
                    </div>
                  </>
                )}
                
                {/* Web/Contato Extra */}
                <div className="md:col-span-12 border-t border-slate-100 my-2"></div>

                <div className="md:col-span-6">
                   <label className="block text-sm font-medium text-slate-700 mb-1.5">Website</label>
                   <Input 
                     value={formData.website || ""} 
                     onChange={(e) => handleChange("website", e.target.value)}
                     className="focus-visible:ring-blue-500 border-slate-300"
                     placeholder="www.site.com.br"
                   />
                </div>
                <div className="md:col-span-6">
                   <label className="block text-sm font-medium text-slate-700 mb-1.5">Skype</label>
                   <Input 
                     value={formData.skype || ""} 
                     onChange={(e) => handleChange("skype", e.target.value)}
                     className="focus-visible:ring-blue-500 border-slate-300"
                     placeholder="Skype ID"
                   />
                </div>

              </div>
            )}
          </div>

          {/* Financeiro */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div 
              className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggleSection('financeiro')}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-blue-100 text-blue-600">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h2 className="font-semibold text-slate-800">Financeiro</h2>
              </div>
              {sections.financeiro ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </div>
            
            {sections.financeiro && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                
                <div className="md:col-span-12">
                  <label className="block text-sm font-medium text-slate-700 mb-3">Limite de Crédito</label>
                  <div className="flex flex-wrap gap-6 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="credit_limit_type"
                        checked={formData.credit_limit_type === 'ilimitado'}
                        onChange={() => handleChange("credit_limit_type", 'ilimitado')}
                        className={cn(
                          "w-4 h-4 border-slate-300",
                          "text-blue-600 focus:ring-blue-500"
                        )}
                      />
                      <span className="text-sm text-slate-700">Ilimitado</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="credit_limit_type"
                        checked={formData.credit_limit_type === 'limitado'}
                        onChange={() => handleChange("credit_limit_type", 'limitado')}
                        className={cn(
                          "w-4 h-4 border-slate-300",
                          "text-blue-600 focus:ring-blue-500"
                        )}
                      />
                      <span className="text-sm text-slate-700">Limitado</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="credit_limit_type"
                        checked={formData.credit_limit_type === 'zero'}
                        onChange={() => handleChange("credit_limit_type", 'zero')}
                        className={cn(
                          "w-4 h-4 border-slate-300",
                          "text-blue-600 focus:ring-blue-500"
                        )}
                      />
                      <span className="text-sm text-slate-700">Limite zero</span>
                    </label>
                  </div>
                  
                  {formData.credit_limit_type === 'limitado' && (
                    <div className="max-w-xs">
                      <div className="relative">
                        <MoneyInput
                          value={formData.credit_limit || 0}
                          onValueChange={(v) => handleChange("credit_limit", Math.round(v * 100) / 100)}
                          withSymbol
                          className="pl-3 focus-visible:ring-blue-500 border-slate-300"
                          placeholder="R$ 0,00"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-6">
                   <label className="block text-sm font-medium text-slate-700 mb-1.5">Condição de Pagamento</label>
                   <Select 
                     value={formData.payment_condition || ""}
                     onChange={(e) => handleChange("payment_condition", e.target.value)}
                   >
                     <option value="">Padrão</option>
                     <option value="a_vista">À Vista</option>
                     <option value="30_dias">30 Dias</option>
                     <option value="30_60_dias">30/60 Dias</option>
                   </Select>
                </div>

                <div className="md:col-span-6">
                   <label className="block text-sm font-medium text-slate-700 mb-1.5">Categoria</label>
                   <Select 
                     value={formData.category_id || ""}
                     onChange={(e) => handleChange("category_id", e.target.value)}
                   >
                     <option value="">Sem categoria</option>
                     <option value="vip">Cliente VIP</option>
                     <option value="revenda">Revenda</option>
                   </Select>
                </div>
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div 
              className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggleSection('observacoes')}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-blue-100 text-blue-600">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h2 className="font-semibold text-slate-800">Observações</h2>
              </div>
              {sections.observacoes ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </div>
            
            {sections.observacoes && (
              <div className="p-6">
                <textarea 
                  className={cn(
                    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 min-h-[120px]",
                    "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  )}
                  value={formData.observations || ""}
                  onChange={(e) => handleChange("observations", e.target.value)}
                  placeholder="Observações internas sobre este contato..."
                />
              </div>
            )}
          </div>

        </div>
      </form>

      <ConfirmationDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={() => navigate(basePath)}
        title="Cancelar Edição"
        description="Tem certeza que deseja cancelar? Todas as alterações não salvas serão perdidas."
        confirmText="Sim, cancelar"
        variant="warning"
      />

      <ConfirmationDialog
        isOpen={alertState.isOpen}
        onClose={() => {
          setAlertState(prev => ({ ...prev, isOpen: false }));
          if (alertState.onConfirm) alertState.onConfirm();
        }}
        onConfirm={() => {
          setAlertState(prev => ({ ...prev, isOpen: false }));
          if (alertState.onConfirm) alertState.onConfirm();
        }}
        title={alertState.title}
        description={alertState.description}
        confirmText="OK"
        variant={alertState.variant}
        showCancel={false}
      />
    </BlingLayout>
  );
}
