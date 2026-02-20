import { useState, useEffect } from "react";
import { 
  Building2, 
  MapPin, 
  User, 
  Lock, 
  CreditCard, 
  FileText,
  Palette,
  Save,
  Check,
  AlertCircle
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cancelMySubscription, syncMySubscription, updatePassword, getMySubscription, type ApiError, type Subscription } from "@/lib/api";
import { maskCpfCnpj, maskPhone, maskZip, maskNumber } from "@/lib/masks";
import { formatBRLFromCents } from "@/lib/money";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type SettingsTab = "company" | "address" | "profile" | "security" | "preferences" | "fiscal" | "subscription";

export function SettingsPage({ defaultTab = "company" }: { defaultTab?: SettingsTab }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);
  
  // Auth Store
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const authDetails = useAuthStore((s) => s.authDetails);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const preferences = useAuthStore((s) => s.preferences);
  const updatePreferences = useAuthStore((s) => s.updatePreferences);
  
  // Local State for Forms
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile Form Fields
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [personType, setPersonType] = useState<"fisica" | "juridica">("juridica");
  const [ie, setIe] = useState("");
  const [im, setIm] = useState("");
  const [cnae, setCnae] = useState("");
  const [taxRegime, setTaxRegime] = useState("");
  const [mobile, setMobile] = useState("");
  const [emailBilling, setEmailBilling] = useState("");
  const [website, setWebsite] = useState("");

  // Subscription State
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subBusy, setSubBusy] = useState<null | 'sync' | 'cancel'>(null);
  const trialEndMs = subscription?.trial?.endsAt ? new Date(subscription.trial.endsAt).getTime() : null;
  const trialDaysLeft = trialEndMs && trialEndMs > Date.now() ? Math.ceil((trialEndMs - Date.now()) / 86400000) : null;
  const showTrial = Boolean(subscription?.status === "active" && subscription?.trial?.active && trialDaysLeft);

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Initialize Data
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName ?? "");
      setCompanyName(profile.companyName ?? "");
      setDocument(profile.document ?? "");
      setPhone(profile.phone ?? "");
      setAddressZip(profile.addressZip ?? "");
      setAddressStreet(profile.addressStreet ?? "");
      setAddressNumber(profile.addressNumber ?? "");
      setAddressNeighborhood(profile.addressNeighborhood ?? "");
      setAddressCity(profile.addressCity ?? "");
      setAddressState(profile.addressState ?? "");
      setAddressComplement(profile.addressComplement ?? "");
      setPersonType(profile.personType ?? "juridica");
      setIe(profile.ie ?? "");
      setIm(profile.im ?? "");
      setCnae(profile.cnae ?? "");
      setTaxRegime(profile.taxRegime ?? "");
      setMobile(profile.mobile ?? "");
      setEmailBilling(profile.emailBilling ?? "");
      setWebsite(profile.website ?? "");
    }
  }, [profile]);

  const refreshSubscription = async () => {
    try {
      const { subscription } = await getMySubscription();
      setSubscription(subscription);
    } catch (e) {
      console.error("Failed to fetch subscription", e);
    }
  };

  useEffect(() => {
    if (activeTab === 'subscription') {
      void refreshSubscription();
    }
  }, [activeTab]);

  const handleSyncSubscription = async () => {
    setSubBusy('sync');
    try {
      await syncMySubscription();
      await refreshSubscription();
    } catch (e: any) {
      alert(e?.message ?? 'Falha ao sincronizar assinatura.');
    } finally {
      setSubBusy(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;
    const ok = window.confirm('Deseja cancelar sua assinatura no Mercado Pago?');
    if (!ok) return;
    setSubBusy('cancel');
    try {
      await cancelMySubscription();
      await refreshSubscription();
    } catch (e: any) {
      alert(e?.message ?? 'Falha ao cancelar assinatura.');
    } finally {
      setSubBusy(null);
    }
  };

  // Handle Save Profile
  const handleSaveProfile = async () => {
    setBusy(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await updateProfile({ 
        fullName: fullName.trim(), 
        companyName: companyName.trim() || null,
        document: document.trim() || null,
        phone: phone.trim() || null,
        addressZip: addressZip.trim() || null,
        addressStreet: addressStreet.trim() || null,
        addressNumber: addressNumber.trim() || null,
        addressNeighborhood: addressNeighborhood.trim() || null,
        addressCity: addressCity.trim() || null,
        addressState: addressState.trim() || null,
        addressComplement: addressComplement.trim() || null,
        personType: (personType === 'fisica' || personType === 'juridica') ? personType : null,
        ie: ie.trim() || null,
        im: im.trim() || null,
        cnae: cnae.trim() || null,
        taxRegime: taxRegime.trim() || null,
        mobile: mobile.trim() || null,
        emailBilling: emailBilling.trim() || null,
        website: website.trim() || null,
      });
      setSuccessMsg("Informações salvas com sucesso!");
    } catch (e) {
      setErrorMsg("Erro ao salvar informações.");
    } finally {
      setBusy(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (authDetails?.hasPassword && !currentPassword) {
      return setErrorMsg("Digite sua senha atual.");
    }
    if (!newPassword || !confirmPassword) {
      return setErrorMsg("Preencha a nova senha e a confirmação.");
    }
    if (newPassword !== confirmPassword) {
      return setErrorMsg("A nova senha e a confirmação não coincidem.");
    }
    if (newPassword.length < 8) {
      return setErrorMsg("A nova senha deve ter pelo menos 8 caracteres.");
    }

    setBusy(true);
    try {
      await updatePassword({ 
        currentPassword: authDetails?.hasPassword ? currentPassword : undefined, 
        newPassword 
      });
      setSuccessMsg("Senha alterada com sucesso.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      const err = e as ApiError;
      setErrorMsg(err.message || "Erro ao alterar senha.");
    } finally {
      setBusy(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const tabs = [
    { id: "company", label: "Dados da Empresa", icon: Building2 },
    { id: "address", label: "Endereço", icon: MapPin },
    { id: "profile", label: "Meu Perfil", icon: User },
    { id: "security", label: "Segurança", icon: Lock },
    { id: "preferences", label: "Preferências", icon: Palette },
    { id: "fiscal", label: "Fiscal (NFe)", icon: FileText },
    { id: "subscription", label: "Assinatura", icon: CreditCard },
  ];

  const [fiscalEnv, setFiscalEnv] = useState<"homolog" | "prod">("homolog");

  useEffect(() => {
    const fiscal = (preferences as any)?.fiscal;
    if (fiscal) {
      setFiscalEnv(fiscal.environment === "prod" ? "prod" : "homolog");
    }
  }, [preferences]);

  const handleSaveFiscal = async () => {
    setBusy(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await updatePreferences({
        fiscal: {
          environment: fiscalEnv,
        },
      });
      setSuccessMsg("Configurações fiscais salvas com sucesso!");
    } catch {
      setErrorMsg("Erro ao salvar configurações fiscais.");
    } finally {
      setBusy(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Configurações</h1>
        <p className="text-slate-500 dark:text-slate-400">Gerencie as configurações da sua loja e do seu perfil.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <aside className="lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTab)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                    isActive 
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" 
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400")} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          {/* Feedback Messages */}
          {(successMsg || errorMsg) && (
            <div className={cn(
              "p-4 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2",
              successMsg ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
            )}>
              {successMsg ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <p className="font-medium">{successMsg || errorMsg}</p>
            </div>
          )}

          {/* Company Tab */}
          {activeTab === "company" && (
            <Card>
              <CardHeader>
                <CardTitle>Dados da Empresa</CardTitle>
                <CardDescription>Informações públicas da sua loja.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Razão Social</label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Razão Social" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nome Fantasia</label>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nome Fantasia" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">CNPJ / CPF</label>
                    <Input value={document} onChange={(e) => setDocument(maskCpfCnpj(e.target.value))} placeholder="00.000.000/0000-00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo de Pessoa</label>
                    <Select value={personType} onChange={(e) => setPersonType(e.target.value as any)}>
                      <option value="juridica">Pessoa Jurídica</option>
                      <option value="fisica">Pessoa Física</option>
                    </Select>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Inscrições e Tributos</h3>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Inscrição Estadual</label>
                      <Input value={ie} onChange={(e) => setIe(e.target.value)} placeholder="Isento" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Inscrição Municipal</label>
                      <Input value={im} onChange={(e) => setIm(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">CNAE</label>
                      <Input value={cnae} onChange={(e) => setCnae(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Regime Tributário</label>
                      <Input value={taxRegime} onChange={(e) => setTaxRegime(e.target.value)} placeholder="Simples Nacional" />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Contato da Loja</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email de Contato/Cobrança</label>
                      <Input value={emailBilling} onChange={(e) => setEmailBilling(e.target.value)} type="email" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Telefone Fixo</label>
                      <Input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Celular / WhatsApp</label>
                      <Input value={mobile} onChange={(e) => setMobile(maskPhone(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Website</label>
                      <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="www.suaempresa.com.br" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveProfile} disabled={busy} className="bg-blue-600 hover:bg-blue-700 min-w-[120px]">
                    {busy ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Address Tab */}
          {activeTab === "address" && (
            <Card>
              <CardHeader>
                <CardTitle>Endereço da Empresa</CardTitle>
                <CardDescription>Endereço utilizado para notas fiscais e entregas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-12 gap-6">
                  <div className="md:col-span-3 space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">CEP</label>
                    <Input value={addressZip} onChange={(e) => setAddressZip(maskZip(e.target.value))} placeholder="00000-000" />
                  </div>
                  <div className="md:col-span-7 space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Rua</label>
                    <Input value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Número</label>
                    <Input value={addressNumber} onChange={(e) => setAddressNumber(maskNumber(e.target.value))} />
                  </div>
                  <div className="md:col-span-4 space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Bairro</label>
                    <Input value={addressNeighborhood} onChange={(e) => setAddressNeighborhood(e.target.value)} />
                  </div>
                  <div className="md:col-span-4 space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cidade</label>
                    <Input value={addressCity} onChange={(e) => setAddressCity(e.target.value)} />
                  </div>
                  <div className="md:col-span-4 space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Estado (UF)</label>
                    <Input value={addressState} onChange={(e) => setAddressState(e.target.value)} maxLength={2} />
                  </div>
                  <div className="md:col-span-6 space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Complemento</label>
                    <Input value={addressComplement} onChange={(e) => setAddressComplement(e.target.value)} placeholder="Apto, Bloco, Sala..." />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveProfile} disabled={busy} className="bg-blue-600 hover:bg-blue-700 min-w-[120px]">
                    {busy ? "Salvando..." : "Salvar Endereço"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Meu Perfil</CardTitle>
                <CardDescription>Suas informações pessoais de acesso.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email de Acesso</label>
                  <Input value={session?.email || ""} disabled className="bg-slate-50 dark:bg-slate-900" />
                  <p className="text-xs text-slate-500">O email de acesso não pode ser alterado.</p>
                </div>

                {/* We could add fields here for "User Full Name" specifically if it was separate from Company Name, 
                    but currently updateProfile mixes them (fullName maps to user.full_name). 
                    Let's assume fullName is the user's name as per 'meRouter'.
                */}
                {/* Re-using the same fullName state but clarifying it's the User Name here */}
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Seu Nome Completo</label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveProfile} disabled={busy} className="bg-blue-600 hover:bg-blue-700 min-w-[120px]">
                    {busy ? "Salvando..." : "Salvar Perfil"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <Card>
              <CardHeader>
                <CardTitle>Segurança</CardTitle>
                <CardDescription>Gerencie sua senha e segurança da conta.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-w-lg">
                <div className="space-y-4">
                  {authDetails?.hasPassword && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Senha Atual</label>
                      <Input 
                        type="password" 
                        value={currentPassword} 
                        onChange={(e) => setCurrentPassword(e.target.value)} 
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nova Senha</label>
                    <Input 
                      type="password" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirmar Nova Senha</label>
                    <Input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                    />
                  </div>

                  <div className="pt-4">
                    <Button onClick={handleUpdatePassword} disabled={busy} className="bg-blue-600 hover:bg-blue-700 w-full">
                      {busy ? "Atualizando..." : "Alterar Senha"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preferences Tab */}
          {activeTab === "preferences" && (
            <Card>
              <CardHeader>
                <CardTitle>Preferências</CardTitle>
                <CardDescription>Personalize sua experiência no sistema.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tema do Sistema</label>
                  <div className="grid grid-cols-2 gap-4 max-w-md">
                    <button
                      onClick={() => theme !== 'light' && toggleTheme()}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                        theme === 'light' 
                          ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600" 
                          : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                      )}
                    >
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Palette className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <div className="font-semibold">Modo Claro</div>
                        <div className="text-xs opacity-70">Visual padrão</div>
                      </div>
                    </button>

                    <button
                      onClick={() => theme !== 'dark' && toggleTheme()}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                        theme === 'dark' 
                          ? "border-blue-600 bg-slate-900 text-blue-400 ring-1 ring-blue-600" 
                          : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                      )}
                    >
                      <div className="p-2 bg-slate-800 rounded-lg shadow-sm">
                        <Palette className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <div className="font-semibold">Modo Escuro</div>
                        <div className="text-xs opacity-70">Visual noturno</div>
                      </div>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "fiscal" && (
            <Card>
              <CardHeader>
                <CardTitle>Fiscal (NFe / NFC-e)</CardTitle>
                <CardDescription>Emissão fiscal é feita pelo serviço do SISFEC. Aqui você define apenas o ambiente.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ambiente</label>
                    <Select value={fiscalEnv} onChange={(e) => setFiscalEnv(e.target.value as any)}>
                      <option value="homolog">Homologação</option>
                      <option value="prod">Produção</option>
                    </Select>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Em produção, a emissão usa seus dados cadastrados em Dados da Empresa e Endereço.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveFiscal} disabled={busy} className="bg-blue-600 hover:bg-blue-700 min-w-[120px]">
                    {busy ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Subscription Tab */}
          {activeTab === "subscription" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Assinatura</CardTitle>
                  <CardDescription>Detalhes do seu plano atual.</CardDescription>
                </div>
                {subscription && (
                  <Badge tone={subscription.status === 'active' ? 'green' : 'red'}>
                    {subscription.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                 <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                      <div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                          {showTrial ? "Teste grátis" : subscription?.plan.name || "Nenhum plano ativo"}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 mt-1">
                          {showTrial ? "Acesso liberado durante o período de teste" : subscription ? `${formatBRLFromCents(subscription.plan.priceCents)} / mês` : "R$ 0,00 / mês"}
                        </div>
                        {showTrial && (
                          <div className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                            Teste grátis termina em {new Date(trialEndMs as number).toLocaleDateString()} ({trialDaysLeft} {trialDaysLeft === 1 ? "dia" : "dias"} restantes)
                          </div>
                        )}
                        {subscription?.plan.features && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {subscription.plan.features.map((feature, idx) => (
                              <Badge key={idx} variant="outline" className="bg-white dark:bg-slate-800">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSyncSubscription}
                          disabled={subBusy !== null || !subscription}
                        >
                          {subBusy === 'sync' ? 'Sincronizando...' : 'Sincronizar'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancelSubscription}
                          disabled={subBusy !== null || !subscription}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          {subBusy === 'cancel' ? 'Cancelando...' : 'Cancelar'}
                        </Button>
                        <Link to="/planos">
                          <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                            Alterar Plano
                          </Button>
                        </Link>
                      </div>
                    </div>
                 </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
