import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { 
  Save, 
  ArrowLeft,
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
import { getContact, createContact, updateContact, type ContactInput } from "@/lib/api_contacts";
import { maskCpfCnpj, maskPhone, maskZip } from "@/lib/masks";
import { cn } from "@/lib/utils";

export function ContactForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
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
    gender: null
  });

  const isPJ = formData.type === 'juridica';
  const isPF = formData.type === 'fisica';
  const isEstrangeiro = formData.type === 'estrangeiro';

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
      
      setFormData({ ...data, contacts_json: contacts });
    } catch (error) {
      console.error("Erro ao carregar contato:", error);
      alert("Erro ao carregar contato");
      navigate("/app/contatos");
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
      alert("O nome é obrigatório");
      return;
    }

    try {
      setSaving(true);
      if (isEditing) {
        await updateContact(id!, formData);
        alert("Contato atualizado com sucesso!");
      } else {
        await createContact(formData);
        alert("Contato criado com sucesso!");
      }
      navigate("/app/contatos");
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar: " + (error.message || "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <BlingLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-500">Carregando...</div>
        </div>
      </BlingLayout>
    );
  }

  return (
    <BlingLayout>
      <form onSubmit={handleSubmit} className="pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-0">
          <div className="flex items-center gap-4">
            <Link to="/app/contatos">
              <Button variant="ghost" size="icon" type="button" className="hover:bg-blue-50 hover:text-blue-600">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-zinc-800">
                {isEditing ? "Editar Contato" : "Novo Cadastro"}
              </h1>
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Link to="/app" className="hover:underline hover:text-blue-600">Home</Link>
                <span>{'>'}</span>
                <Link to="/app/contatos" className="hover:underline hover:text-blue-600">Contatos</Link>
                <span>{'>'}</span>
                <span className="text-blue-600 font-medium">{isEditing ? formData.name : "Novo Cadastro"}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/app/contatos">
              <Button variant="outline" type="button" className="hover:bg-zinc-50 hover:text-zinc-900">Cancelar</Button>
            </Link>
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px] shadow-lg shadow-blue-200 gap-2 font-medium"
              disabled={saving}
            >
              <Save className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar Contato"}
            </Button>
          </div>
        </div>

        <div className="space-y-6 max-w-full mx-auto">
          
          {/* Dados Cadastrais */}
          <div className="bg-white rounded-lg shadow-sm border border-zinc-200 overflow-hidden">
            <div 
              className="flex items-center justify-between px-6 py-4 bg-zinc-50/50 border-b border-zinc-200 cursor-pointer hover:bg-zinc-50 transition-colors"
              onClick={() => toggleSection('dadosCadastrais')}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded text-blue-600">
                  <Building2 className="w-4 h-4" />
                </div>
                <h2 className="font-semibold text-zinc-800">Dados cadastrais</h2>
              </div>
              {sections.dadosCadastrais ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
            </div>
            
            {sections.dadosCadastrais && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Linha 1: Metadados (Estável) */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Código <span title="Código interno"><Info className="inline w-3.5 h-3.5 text-blue-400 ml-1 cursor-help" /></span>
                  </label>
                  <Input 
                    value={formData.code || ""} 
                    onChange={(e) => handleChange("code", e.target.value)}
                    className="focus-visible:ring-blue-500 border-zinc-300"
                    placeholder="Auto"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Tipo da Pessoa</label>
                  <Select 
                    value={formData.type}
                    onChange={(e) => handleChange("type", e.target.value)}
                  >
                    <option value="fisica">Pessoa Física</option>
                    <option value="juridica">Pessoa Jurídica</option>
                    <option value="estrangeiro">Estrangeiro</option>
                  </Select>
                </div>

                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Contribuinte</label>
                  <Select 
                    value={formData.contributor_type || 9}
                    onChange={(e) => handleChange("contributor_type", parseInt(e.target.value))}
                  >
                    <option value={1}>1 - Contribuinte ICMS</option>
                    <option value={2}>2 - Contribuinte isento</option>
                    <option value={9}>9 - Não contribuinte</option>
                  </Select>
                </div>

                <div className="md:col-span-2">
                    {/* Espaço reservado para manter grid alinhado */}
                </div>

                {/* Linha 2: Nomes (Estável) */}
                <div className="md:col-span-6">
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    {isPJ ? "Razão Social" : "Nome Completo"} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input 
                      value={formData.name || ""} 
                      onChange={(e) => handleChange("name", e.target.value)}
                      className="focus-visible:ring-blue-500 border-zinc-300"
                      placeholder={isPJ ? "Razão Social da Empresa" : "Nome Completo do Contato"}
                    />
                                      <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    {isPJ ? "Data de Fundação" : "Data de Nascimento"}
                  </label>
                  <Input 
                    type="date"
                    value={formData.birth_date?.split('T')[0] || ""} 
                    onChange={(e) => handleChange("birth_date", e.target.value)}
                    className="focus-visible:ring-blue-500 border-zinc-300"
                  />
                  </div>
                </div>
                
                {/* Fantasia ocupa espaço apenas se PJ, senão vazio ou col-span-6 para manter alinhamento da próxima linha */}
                <div className="md:col-span-6">
                  {isPJ ? (
                    <>
                      <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                        Fantasia <span title="Nome fantasia da empresa"><Info className="inline w-3.5 h-3.5 text-blue-400 ml-1 cursor-help" /></span>
                      </label>
                      <Input 
                        value={formData.fantasy_name || ""} 
                        onChange={(e) => handleChange("fantasy_name", e.target.value)}
                        className="focus-visible:ring-blue-500 border-zinc-300"
                        placeholder="Nome Fantasia"
                      />
                    </>
                  ) : (
                    <div className="hidden md:block">
                        {/* Placeholder invisível para manter o grid estável em telas grandes, 
                            garantindo que Documentos comecem na próxima linha */}
                    </div>
                  )}
                </div>
                
                {/* Linha 3: Documentos (Estável) */}
                <div className="md:col-span-6">
                   <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    {isEstrangeiro ? "Documento" : (isPJ ? "CNPJ" : "CPF")}
                  </label>
                  <Input 
                    value={formData.cpf_cnpj || ""} 
                    onChange={(e) => {
                      if (isEstrangeiro) {
                        handleChange("cpf_cnpj", e.target.value);
                      } else {
                        handleMaskedChange("cpf_cnpj", e.target.value, maskCpfCnpj);
                      }
                    }}
                    className="focus-visible:ring-blue-500 border-zinc-300"
                    placeholder={
                      isEstrangeiro 
                        ? "Passaporte ou ID" 
                        : (isPJ ? "00.000.000/0000-00" : "000.000.000-00")
                    }
                  />
                </div>

                <div className="md:col-span-6">
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                     {isEstrangeiro ? "Identificação Adicional" : (isPJ ? "Inscrição Estadual" : "RG")}
                  </label>
                  <Input 
                    value={formData.rg_ie || ""} 
                    onChange={(e) => handleChange("rg_ie", e.target.value)}
                    className="focus-visible:ring-blue-500 border-zinc-300"
                    placeholder={
                      isEstrangeiro 
                        ? "Outro Documento" 
                        : (isPJ ? "Inscrição Estadual" : "RG")
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Endereço */}
          <div className="bg-white rounded-lg shadow-sm border border-zinc-200 overflow-hidden">
            <div 
              className="flex items-center justify-between px-6 py-4 bg-zinc-50/50 border-b border-zinc-200 cursor-pointer hover:bg-zinc-50 transition-colors"
              onClick={() => toggleSection('endereco')}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded text-blue-600">
                  <MapPin className="w-4 h-4" />
                </div>
                <h2 className="font-semibold text-zinc-800">Endereço</h2>
              </div>
              {sections.endereco ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
            </div>
            
            {sections.endereco && (
              <div className="p-6">
                <div className="flex border-b border-zinc-200 mb-6">
                  <button type="button" className="px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600">Geral</button>
                  <button type="button" className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 rounded-t">Cobrança</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">CEP</label>
                    <div className="relative">
                      <Input 
                        value={formData.address_zip || ""} 
                        onChange={(e) => {
                          if (isEstrangeiro) {
                            handleChange("address_zip", e.target.value);
                          } else {
                            handleMaskedChange("address_zip", e.target.value, maskZip);
                          }
                        }}
                        className="focus-visible:ring-blue-500 border-zinc-300 pr-8"
                        placeholder={isEstrangeiro ? "Zip Code" : "00000-000"}
                      />
                      <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 cursor-pointer hover:text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="md:col-span-5">
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Endereço</label>
                    <Input 
                      value={formData.address_street || ""} 
                      onChange={(e) => handleChange("address_street", e.target.value)}
                      className="focus-visible:ring-blue-500 border-zinc-300"
                      placeholder="Rua, Avenida, etc"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Número</label>
                    <Input 
                      value={formData.address_number || ""} 
                      onChange={(e) => handleChange("address_number", e.target.value)}
                      className="focus-visible:ring-blue-500 border-zinc-300"
                    />
                  </div>
                  
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Complemento</label>
                    <Input 
                      value={formData.address_complement || ""} 
                      onChange={(e) => handleChange("address_complement", e.target.value)}
                      className="focus-visible:ring-blue-500 border-zinc-300"
                      placeholder="Apto, Bloco, Sala"
                    />
                  </div>

                  <div className="md:col-span-5">
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Bairro</label>
                    <Input 
                      value={formData.address_neighborhood || ""} 
                      onChange={(e) => handleChange("address_neighborhood", e.target.value)}
                      className="focus-visible:ring-blue-500 border-zinc-300"
                    />
                  </div>

                  <div className="md:col-span-5">
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Cidade</label>
                    <Input 
                      value={formData.address_city || ""} 
                      onChange={(e) => handleChange("address_city", e.target.value)}
                      className="focus-visible:ring-blue-500 border-zinc-300"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">UF</label>
                    <Input 
                      value={formData.address_state || ""} 
                      onChange={(e) => handleChange("address_state", e.target.value)}
                      className="focus-visible:ring-blue-500 border-zinc-300"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contato */}
          <div className="bg-white rounded-lg shadow-sm border border-zinc-200 overflow-hidden">
            <div 
              className="flex items-center justify-between px-6 py-4 bg-zinc-50/50 border-b border-zinc-200 cursor-pointer hover:bg-zinc-50 transition-colors"
              onClick={() => toggleSection('contato')}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded text-blue-600">
                  <Phone className="w-4 h-4" />
                </div>
                <h2 className="font-semibold text-zinc-800">Contato</h2>
              </div>
              {sections.contato ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
            </div>
            
            {sections.contato && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-6">
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">E-mail Principal</label>
                    <Input 
                      value={formData.email || ""} 
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="focus-visible:ring-blue-500 border-zinc-300"
                      type="email"
                      placeholder="exemplo@email.com"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Telefone</label>
                    <Input 
                      value={formData.phone || ""} 
                      onChange={(e) => {
                         if (isEstrangeiro) {
                           handleChange("phone", e.target.value);
                         } else {
                           handleMaskedChange("phone", e.target.value, maskPhone);
                         }
                      }}
                      className="focus-visible:ring-blue-500 border-zinc-300"
                      placeholder={isEstrangeiro ? "+00 000 0000" : "(00) 0000-0000"}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">Celular / WhatsApp</label>
                    <Input 
                      value={formData.mobile || ""} 
                      onChange={(e) => {
                        if (isEstrangeiro) {
                          handleChange("mobile", e.target.value);
                        } else {
                          handleMaskedChange("mobile", e.target.value, maskPhone);
                        }
                      }}
                      className="focus-visible:ring-blue-500 border-zinc-300"
                      placeholder={isEstrangeiro ? "+00 000 0000" : "(00) 00000-0000"}
                    />
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-4">
                  <label className="block text-sm font-medium text-zinc-700 mb-3">Contatos Adicionais</label>
                  
                  {(Array.isArray(formData.contacts_json) ? formData.contacts_json : []).map((contact: any, index: number) => (
                    <div key={index} className="flex gap-3 mb-3 items-start bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                      <div className="flex-1">
                        <label className="text-xs text-zinc-500 mb-1 block">Nome</label>
                        <Input 
                          value={contact.name} 
                          onChange={(e) => updateSubContact(index, 'name', e.target.value)}
                          className="h-9 text-sm focus-visible:ring-blue-500 border-zinc-300"
                          placeholder="Nome do contato"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-zinc-500 mb-1 block">E-mail</label>
                        <Input 
                          value={contact.email} 
                          onChange={(e) => updateSubContact(index, 'email', e.target.value)}
                          className="h-9 text-sm focus-visible:ring-blue-500 border-zinc-300"
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-zinc-500 mb-1 block">Telefone</label>
                        <Input 
                          value={contact.phone} 
                          onChange={(e) => updateSubContact(index, 'phone', e.target.value)}
                          className="h-9 text-sm focus-visible:ring-blue-500 border-zinc-300"
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
                    className="mt-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Plus className="w-3 h-3 mr-2" />
                    Adicionar contato
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Dados Adicionais */}
          <div className="bg-white rounded-lg shadow-sm border border-zinc-200 overflow-hidden">
            <div 
              className="flex items-center justify-between px-6 py-4 bg-zinc-50/50 border-b border-zinc-200 cursor-pointer hover:bg-zinc-50 transition-colors"
              onClick={() => toggleSection('dadosAdicionais')}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded text-blue-600">
                  <FileText className="w-4 h-4" />
                </div>
                <h2 className="font-semibold text-zinc-800">Dados Adicionais</h2>
              </div>
              {sections.dadosAdicionais ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
            </div>
            
            {sections.dadosAdicionais && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-4">
                </div>
                
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Cliente Desde</label>
                  <Input 
                    type="date"
                    value={formData.date_since?.split('T')[0] || ""} 
                    onChange={(e) => handleChange("date_since", e.target.value)}
                    className="focus-visible:ring-blue-500 border-zinc-300"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Vendedor</label>
                  <Select>
                    <option value="">Selecione um vendedor</option>
                  </Select>
                </div>
                
                {isPF && (
                  <>
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-zinc-700 mb-1.5">Gênero</label>
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
                    <div className="md:col-span-4">
                       <label className="block text-sm font-medium text-zinc-700 mb-1.5">Profissão</label>
                       <Input 
                         value={formData.profession || ""} 
                         onChange={(e) => handleChange("profession", e.target.value)}
                         className="focus-visible:ring-blue-500 border-zinc-300"
                         placeholder="Profissão"
                       />
                    </div>
                    <div className="md:col-span-4">
                       <label className="block text-sm font-medium text-zinc-700 mb-1.5">Estado Civil</label>
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
                    <div className="md:col-span-4">
                       <label className="block text-sm font-medium text-zinc-700 mb-1.5">Naturalidade</label>
                       <Input 
                         value={formData.naturalness || ""} 
                         onChange={(e) => handleChange("naturalness", e.target.value)}
                         className="focus-visible:ring-blue-500 border-zinc-300"
                         placeholder="Cidade/Estado"
                       />
                    </div>
                  </>
                )}
                
                {(isPJ || isEstrangeiro) && (
                  <div className="md:col-span-4">
                     <label className="block text-sm font-medium text-zinc-700 mb-1.5">Website</label>
                     <Input 
                       value={formData.website || ""} 
                       onChange={(e) => handleChange("website", e.target.value)}
                       className="focus-visible:ring-blue-500 border-zinc-300"
                       placeholder="www.site.com.br"
                     />
                  </div>
                )}

                <div className="md:col-span-12">
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Observações</label>
                  <textarea 
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 min-h-[100px]"
                    value={formData.observations || ""}
                    onChange={(e) => handleChange("observations", e.target.value)}
                    placeholder="Observações internas sobre este contato..."
                  />
                </div>
              </div>
            )}
          </div>

        </div>
      </form>
    </BlingLayout>
  );
}
