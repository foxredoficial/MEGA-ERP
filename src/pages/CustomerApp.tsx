import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Building2, 
  Settings, 
  Shield, 
  Tag, 
  ArrowLeft, 
  LogOut,
  ChevronDown,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  FileText,
  AlertCircle,
  Plus,
  BarChart3,
  Calendar,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { getMySubscription, updatePassword, unlinkGoogleAccount, type ApiError, type Subscription } from "@/lib/api";
import { formatBRLFromCents } from "@/lib/money";
import { maskCpfCnpj, maskPhone, maskZip, maskNumber } from "@/lib/masks";
import { BlingLayout } from "@/components/BlingLayout";


type Section = "overview" | "profile" | "security" | "plan";

function getSectionFromHash(hash: string): Section {
  const h = hash.replace("#", "").split("?")[0];
  if (h === "profile" || h === "plan" || h === "overview" || h === "security") return h;
  return "overview";
}

export default function CustomerApp() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const authDetails = useAuthStore((s) => s.authDetails);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const signOut = useAuthStore((s) => s.signOut);
  const initAuth = useAuthStore((s) => s.init);

  const [section, setSection] = useState<Section>(() => getSectionFromHash(window.location.hash));
  const [busy, setBusy] = useState(false);
  
  // Feedback global
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => setSection(getSectionFromHash(window.location.hash));
    window.addEventListener("hashchange", handler);
    
    // Check for params in hash on load/change
    const hash = window.location.hash;
    if (hash.includes("?")) {
      const query = hash.split("?")[1];
      const params = new URLSearchParams(query);
      const error = params.get("error");
      const success = params.get("success");

      if (error === "google_in_use") {
        setGlobalError("Esta conta Google já está vinculada a outro usuário.");
      } else if (error === "link_failed_session") {
        setGlobalError("Sessão expirou. Faça login novamente antes de vincular.");
      } else if (error === "google_linked") { 
        setGlobalError("Erro ao vincular conta.");
      }

      if (success === "google_linked") {
        setGlobalSuccess("Conta Google vinculada com sucesso!");
        void initAuth(); 
      }

      // Limpar URL mantendo a seção
      const section = getSectionFromHash(hash);
      window.history.replaceState(null, "", window.location.pathname + "#" + section);
    }

    return () => window.removeEventListener("hashchange", handler);
  }, [initAuth]);

  useEffect(() => {
    if (globalError || globalSuccess) {
      const timer = setTimeout(() => {
        setGlobalError(null);
        setGlobalSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [globalError, globalSuccess]);

  // Profile Form State
  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [companyName, setCompanyName] = useState(profile?.companyName ?? "");
  const [document, setDocument] = useState(profile?.document ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [addressZip, setAddressZip] = useState(profile?.addressZip ?? "");
  const [addressStreet, setAddressStreet] = useState(profile?.addressStreet ?? "");
  const [addressNumber, setAddressNumber] = useState(profile?.addressNumber ?? "");
  const [addressNeighborhood, setAddressNeighborhood] = useState(profile?.addressNeighborhood ?? "");
  const [addressCity, setAddressCity] = useState(profile?.addressCity ?? "");
  const [addressState, setAddressState] = useState(profile?.addressState ?? "");
  const [addressComplement, setAddressComplement] = useState(profile?.addressComplement ?? "");
  const [personType, setPersonType] = useState(profile?.personType ?? "juridica");
  const [ie, setIe] = useState(profile?.ie ?? "");
  const [im, setIm] = useState(profile?.im ?? "");
  const [cnae, setCnae] = useState(profile?.cnae ?? "");
  const [taxRegime, setTaxRegime] = useState(profile?.taxRegime ?? "");
  const [mobile, setMobile] = useState(profile?.mobile ?? "");
  const [emailBilling, setEmailBilling] = useState(profile?.emailBilling ?? "");
  const [website, setWebsite] = useState(profile?.website ?? "");

  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Demo Data Logic
  const isDemoUser = session?.email === 'megaerp@megaerp.com';
  
  const dashboardData = {
    salesToday: isDemoUser ? "2.400,90" : "0,00",
    salesGrowth: isDemoUser ? 0 : 0,
    receivable: isDemoUser ? "1.900,90" : "0,00",
    payable: isDemoUser ? "400,00" : "0,00",
    payableCount: isDemoUser ? 0 : 0,
    invoices: isDemoUser ? 40 : 0
  };

  useEffect(() => {
    setFullName(profile?.fullName ?? "");
    setCompanyName(profile?.companyName ?? "");
    setDocument(profile?.document ?? "");
    setPhone(profile?.phone ?? "");
    setAddressZip(profile?.addressZip ?? "");
    setAddressStreet(profile?.addressStreet ?? "");
    setAddressNumber(profile?.addressNumber ?? "");
    setAddressNeighborhood(profile?.addressNeighborhood ?? "");
    setAddressCity(profile?.addressCity ?? "");
    setAddressState(profile?.addressState ?? "");
    setAddressComplement(profile?.addressComplement ?? "");
    setPersonType(profile?.personType ?? "juridica");
    setIe(profile?.ie ?? "");
    setIm(profile?.im ?? "");
    setCnae(profile?.cnae ?? "");
    setTaxRegime(profile?.taxRegime ?? "");
    setMobile(profile?.mobile ?? "");
    setEmailBilling(profile?.emailBilling ?? "");
    setWebsite(profile?.website ?? "");
  }, [profile]);

  useEffect(() => {
    let cancelled = false;
    setSubscriptionLoading(true);
    setSubscriptionError(null);
    void (async () => {
      try {
        const { subscription } = await getMySubscription();
        if (cancelled) return;
        setSubscription(subscription);
      } catch (e) {
        if (cancelled) return;
        const err = e as Partial<ApiError> | null;
        setSubscriptionError(err?.message ?? "Não foi possível carregar sua assinatura.");
        setSubscription(null);
      } finally {
        if (!cancelled) setSubscriptionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveProfile = async () => {
    setBusy(true);
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
      setSavedAt(new Date());
    } finally {
      setBusy(false);
    }
  };

  // Password Update State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const handleUpdatePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (authDetails?.hasPassword && !currentPassword) {
      return setPasswordError("Digite sua senha atual.");
    }
    if (!newPassword || !confirmPassword) {
      return setPasswordError("Preencha a nova senha e a confirmação.");
    }
    if (newPassword !== confirmPassword) {
      return setPasswordError("A nova senha e a confirmação não coincidem.");
    }
    if (newPassword.length < 8) {
      return setPasswordError("A nova senha deve ter pelo menos 8 caracteres.");
    }

    setBusy(true);
    try {
      await updatePassword({ 
        currentPassword: authDetails?.hasPassword ? currentPassword : undefined, 
        newPassword 
      });
      setPasswordSuccess("Senha alterada com sucesso.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      window.location.reload(); 
    } catch (e) {
      const err = e as ApiError;
      setPasswordError(err.message || "Erro ao alterar senha.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BlingLayout>
      {/* Global Feedback */}
      {(globalError || globalSuccess) && (
        <div className={cn(
          "mb-6 p-4 rounded-lg shadow-sm flex items-center gap-3",
          globalError ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
        )}>
          {globalError ? <AlertCircle className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
          <p className="font-medium">{globalError || globalSuccess}</p>
        </div>
      )}

      {section === "overview" && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Visão Geral</h1>
              <p className="text-zinc-500 dark:text-zinc-400">Bem-vindo de volta! Aqui está o resumo do seu negócio.</p>
            </div>
            <div className="flex items-center gap-3">
               <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm text-sm text-zinc-600 dark:text-zinc-400">
                <Calendar className="w-4 h-4" />
                <span>Hoje, {new Date().toLocaleDateString('pt-BR')}</span>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                <Plus className="w-4 h-4 mr-2" />
                Novo Pedido
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500">Vendas do Dia</CardTitle>
                <ShoppingBag className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {dashboardData.salesToday}</div>
                <p className="text-xs text-zinc-500 mt-1 flex items-center">
                  <span className="text-emerald-500 flex items-center mr-1">
                     <ArrowUpRight className="w-3 h-3 mr-0.5" /> {dashboardData.salesGrowth}%
                  </span>
                  em relação a ontem
                </p>
              </CardContent>
            </Card>

             <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500">A Receber</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {dashboardData.receivable}</div>
                <div className="flex gap-2 mt-2">
                    <Badge tone="green" className="text-[10px] px-1 h-5">Líquido</Badge>
                </div>
              </CardContent>
            </Card>

             <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500">A Pagar</CardTitle>
                <DollarSign className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {dashboardData.payable}</div>
                <p className="text-xs text-zinc-500 mt-1">
                   {dashboardData.payableCount} contas vencendo hoje
                </p>
              </CardContent>
            </Card>

             <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500">Notas Fiscais</CardTitle>
                <FileText className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.invoices}</div>
                <p className="text-xs text-zinc-500 mt-1">
                   Emitidas hoje
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
            <Card className="col-span-1 lg:col-span-4">
              <CardHeader>
                <CardTitle className="text-lg">Faturamento Semanal</CardTitle>
                <CardDescription>Receita dos últimos 7 dias</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                        { name: 'Seg', value: 1200 },
                        { name: 'Ter', value: 2100 },
                        { name: 'Qua', value: 800 },
                        { name: 'Qui', value: 1600 },
                        { name: 'Sex', value: 2400 },
                        { name: 'Sab', value: 1800 },
                        { name: 'Dom', value: 1000 },
                    ]}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#71717a', fontSize: 12}} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#71717a', fontSize: 12}} 
                        tickFormatter={(value) => `R$${value}`} 
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => [`R$ ${value}`, 'Receita']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#2563eb" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-lg">Ticket Médio</CardTitle>
                <CardDescription>Média por venda nos últimos dias</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="h-[300px] w-full min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                        { name: 'Seg', value: 120 },
                        { name: 'Ter', value: 200 },
                        { name: 'Qua', value: 150 },
                        { name: 'Qui', value: 180 },
                        { name: 'Sex', value: 220 },
                        { name: 'Sab', value: 190 },
                        { name: 'Dom', value: 130 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#71717a', fontSize: 12}} 
                        dy={10}
                      />
                      <Tooltip 
                         cursor={{fill: '#f4f4f5'}}
                         contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                         formatter={(value) => [`R$ ${value}`, 'Ticket Médio']}
                      />
                      <Bar 
                        dataKey="value" 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions / Recent Activity Placeholder */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Atalhos Rápidos</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 dark:border-zinc-800">
                  <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                  <span className="dark:text-zinc-300">Ver Pedidos</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 dark:border-zinc-800">
                  <FileText className="w-5 h-5 text-purple-600 dark:text-purple-500" />
                  <span className="dark:text-zinc-300">Emitir NFe</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 dark:border-zinc-800">
                  <Building2 className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                  <span className="dark:text-zinc-300">Cadastros</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 dark:border-zinc-800">
                  <Settings className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                  <span className="dark:text-zinc-300">Configurações</span>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status do Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    API SEFAZ
                  </span>
                  <Badge tone="green">Operacional</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    Banco de Dados
                  </span>
                  <Badge tone="green">Conectado</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    Serviços de Email
                  </span>
                  <Badge tone="green">Ativo</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {section === "profile" && (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Dados da Empresa</h1>
              <p className="text-zinc-500 dark:text-zinc-400">Gerencie as informações do seu negócio</p>
            </div>
            <Button onClick={saveProfile} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">
              {busy ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-6 grid gap-6">
              {/* Identification */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Razão Social <span className="text-red-500">*</span></label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome da sua empresa" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nome Fantasia</label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nome fantasia" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">CNPJ / CPF <span className="text-red-500">*</span></label>
                  <Input value={document} onChange={(e) => setDocument(maskCpfCnpj(e.target.value))} placeholder="00.000.000/0000-00" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tipo de Pessoa</label>
                  <Select 
                    value={personType}
                    onChange={(e) => setPersonType(e.target.value as "fisica" | "juridica")}
                  >
                    <option value="juridica">Pessoa Jurídica</option>
                    <option value="fisica">Pessoa Física</option>
                  </Select>
                </div>
              </div>

              {/* Fiscal */}
              <div className="grid md:grid-cols-3 gap-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Inscrição Estadual</label>
                  <Input value={ie} onChange={(e) => setIe(e.target.value)} placeholder="Isento" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Inscrição Municipal</label>
                  <Input value={im} onChange={(e) => setIm(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">CNAE</label>
                  <Input value={cnae} onChange={(e) => setCnae(e.target.value)} />
                </div>
              </div>

              {/* Address */}
              <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">Endereço</h3>
                <div className="grid md:grid-cols-12 gap-6">
                  <div className="md:col-span-3 space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">CEP</label>
                    <Input value={addressZip} onChange={(e) => setAddressZip(maskZip(e.target.value))} placeholder="00000-000" />
                  </div>
                  <div className="md:col-span-6 space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Rua</label>
                    <Input value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} />
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Número</label>
                    <Input value={addressNumber} onChange={(e) => setAddressNumber(maskNumber(e.target.value))} />
                  </div>
                  <div className="md:col-span-4 space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Bairro</label>
                    <Input value={addressNeighborhood} onChange={(e) => setAddressNeighborhood(e.target.value)} />
                  </div>
                  <div className="md:col-span-4 space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Cidade</label>
                    <Input value={addressCity} onChange={(e) => setAddressCity(e.target.value)} />
                  </div>
                  <div className="md:col-span-4 space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Estado</label>
                    <Input value={addressState} onChange={(e) => setAddressState(e.target.value)} maxLength={2} />
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">Contato</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email de Cobrança</label>
                    <Input value={emailBilling} onChange={(e) => setEmailBilling(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Telefone</label>
                    <Input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Celular</label>
                    <Input value={mobile} onChange={(e) => setMobile(maskPhone(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Site</label>
                    <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {section === "plan" && (
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">Minha Assinatura</h1>
          <Card>
            <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Plano Atual</h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">Gerencie os detalhes da sua assinatura</p>
              </div>
              <Badge tone={subscription?.status === 'active' ? 'green' : 'red'}>
                {subscription?.status === 'active' ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>

            <div className="grid gap-6">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-50">{subscription?.plan.name || "Nenhum plano ativo"}</div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      {subscription ? formatBRLFromCents(subscription.plan.priceCents) : "R$ 0,00"} / mês
                    </div>
                  </div>
                  <Link to="/planos">
                    <Button variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                      Mudar Plano
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
            </CardContent>
          </Card>
        </div>
      )}

      {section === "security" && (
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">Segurança</h1>
          <Card>
            <CardContent className="p-6">
            <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-4">Alterar Senha</h2>
            
            <div className="space-y-4">
              {authDetails?.hasPassword && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Senha Atual</label>
                  <Input 
                    type="password" 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nova Senha</label>
                <Input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Confirmar Nova Senha</label>
                <Input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                />
              </div>

              {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
              {passwordSuccess && <p className="text-sm text-emerald-600">{passwordSuccess}</p>}

              <Button onClick={handleUpdatePassword} disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {busy ? "Atualizando..." : "Atualizar Senha"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      )}
    </BlingLayout>
  );
}
