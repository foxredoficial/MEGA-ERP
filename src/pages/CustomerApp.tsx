import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Building2, 
  Settings, 
  Shield, 
  ShoppingBag, 
  TrendingUp, 
  DollarSign, 
  FileText, 
  AlertCircle, 
  Plus, 
  Calendar, 
  ArrowUpRight 
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
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { BlingLayout } from "@/components/BlingLayout";
import { SettingsPage } from "@/pages/Settings/SettingsPage";

type Section = "overview" | "profile" | "security" | "plan" | "settings";

function getSectionFromHash(hash: string): Section {
  const h = hash.replace("#", "").split("?")[0];
  if (h === "profile" || h === "plan" || h === "overview" || h === "security" || h === "settings") return h;
  return "overview";
}

export default function CustomerApp() {
  const session = useAuthStore((s) => s.session);
  const initAuth = useAuthStore((s) => s.init);

  const [section, setSection] = useState<Section>(() => getSectionFromHash(window.location.hash));
  
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
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Visão Geral</h1>
              <p className="text-slate-500 dark:text-slate-400">Bem-vindo de volta! Aqui está o resumo do seu negócio.</p>
            </div>
            <div className="flex items-center gap-3">
               <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm text-sm text-slate-600 dark:text-slate-400">
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
                <CardTitle className="text-sm font-medium text-slate-500">Vendas do Dia</CardTitle>
                <ShoppingBag className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {dashboardData.salesToday}</div>
                <p className="text-xs text-slate-500 mt-1 flex items-center">
                  <span className="text-emerald-500 flex items-center mr-1">
                     <ArrowUpRight className="w-3 h-3 mr-0.5" /> {dashboardData.salesGrowth}%
                  </span>
                  em relação a ontem
                </p>
              </CardContent>
            </Card>

             <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">A Receber</CardTitle>
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
                <CardTitle className="text-sm font-medium text-slate-500">A Pagar</CardTitle>
                <DollarSign className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {dashboardData.payable}</div>
                <p className="text-xs text-slate-500 mt-1">
                   {dashboardData.payableCount} contas vencendo hoje
                </p>
              </CardContent>
            </Card>

             <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Notas Fiscais</CardTitle>
                <FileText className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.invoices}</div>
                <p className="text-xs text-slate-500 mt-1">
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
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:bg-slate-50 dark:hover:bg-slate-900 dark:border-slate-800">
                  <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                  <span className="dark:text-slate-300">Ver Pedidos</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:bg-slate-50 dark:hover:bg-slate-900 dark:border-slate-800">
                  <FileText className="w-5 h-5 text-purple-600 dark:text-purple-500" />
                  <span className="dark:text-slate-300">Emitir NFe</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:bg-slate-50 dark:hover:bg-slate-900 dark:border-slate-800">
                  <Building2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <span className="dark:text-slate-300">Cadastros</span>
                </Button>
                <Link to="#settings" className="block">
                  <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 hover:bg-slate-50 dark:hover:bg-slate-900 dark:border-slate-800">
                    <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <span className="dark:text-slate-300">Configurações</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status do Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    API SEFAZ
                  </span>
                  <Badge tone="green">Operacional</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    Banco de Dados
                  </span>
                  <Badge tone="green">Conectado</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
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

      {section === "settings" && <SettingsPage defaultTab="company" />}
      {section === "profile" && <SettingsPage defaultTab="profile" />}
      {section === "security" && <SettingsPage defaultTab="security" />}
      {section === "plan" && <SettingsPage defaultTab="subscription" />}
    </BlingLayout>
  );
}
