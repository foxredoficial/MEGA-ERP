import { ArrowRight, BarChart3, Check, Globe, LayoutDashboard, Package, Store, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { MarketingLayout } from "@/components/MarketingLayout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const features = [
  {
    title: "Frente de Caixa (PDV)",
    desc: "Vendas rápidas e intuitivas, compatível com leitores de código de barras e balanças. Funciona online e offline.",
    icon: Store,
  },
  {
    title: "Gestão Financeira",
    desc: "Controle total de contas a pagar e receber, fluxo de caixa em tempo real e DRE gerencial automático.",
    icon: Wallet,
  },
  {
    title: "Controle de Estoque",
    desc: "Múltiplos depósitos, controle de grades, lotes e validade. Saiba exatamente o que entra e sai.",
    icon: Package,
  },
  {
    title: "Emissão Fiscal",
    desc: "Emita NFe, NFCe, NFSe e MDF-e de forma simples e ilimitada. Cálculos de impostos automáticos.",
    icon: LayoutDashboard,
  },
  {
    title: "Loja Virtual",
    desc: "Integração nativa com e-commerce. Seus produtos do ERP direto para sua loja online.",
    icon: Globe,
  },
  {
    title: "Relatórios Inteligentes",
    desc: "Dashboards completos para acompanhar vendas, lucratividade e performance da equipe.",
    icon: BarChart3,
  },
];

const checklist = [
  "Suporte técnico especializado via WhatsApp",
  "Backup automático e segurança na nuvem",
  "Acesso de qualquer lugar (Celular e PC)",
  "Sem taxa de implantação ou fidelidade",
];

export default function Home() {
  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-20 lg:pt-24 lg:pb-32">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-50 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900" />
        <div className="container px-4">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 flex justify-center">
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              O ERP SISFEC Completo para <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                Transformar seu Negócio
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
              Do PDV ao Financeiro, tenha o controle total da sua empresa em uma única plataforma. 
              Simples, rápido e pensado para o crescimento do empreendedor.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Link to="/cadastro">
                <Button size="lg" className="h-12 w-full rounded-full px-8 text-base sm:w-auto">
                  Começar Grátis <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" size="lg" className="h-12 w-full rounded-full border-slate-200 px-8 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:w-auto">
                  Fazer Login
                </Button>
              </Link>
            </div>
            
            <div className="mt-12 flex flex-col items-center justify-center gap-4 text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:gap-8">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" /> Sem cartão de crédito
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" /> 7 dias de teste grátis
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" /> Cancelamento fácil
              </div>
            </div>
          </div>

          {/* Hero Image / Dashboard Preview */}
          <div className="relative mx-auto mt-16 max-w-5xl lg:mt-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900/50">
              <div className="aspect-[16/9] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 relative group">
                <img 
                  src="/dashboard-preview.png" 
                  alt="SISFEC Dashboard" 
                  className="w-full h-full object-cover object-top"
                />
                {/* Overlay for better integration */}
                <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent dark:from-black/10 pointer-events-none" />
              </div>
            </div>
            {/* Decorative blobs */}
            <div className="pointer-events-none absolute -bottom-10 -right-10 -z-10 h-[400px] w-[400px] rounded-full bg-blue-500/20 blur-3xl dark:bg-blue-500/10" />
            <div className="pointer-events-none absolute -left-10 -top-10 -z-10 h-[400px] w-[400px] rounded-full bg-cyan-500/20 blur-3xl dark:bg-cyan-500/10" />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-slate-50 py-20 dark:bg-slate-900/50">
        <div className="container px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Tudo o que você precisa em um só lugar
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Chega de usar várias planilhas e sistemas desconectados. O SISFEC centraliza sua operação.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 transition hover:border-blue-500/30 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/30"
              >
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                <p className="mt-3 text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Trust */}
      <section className="py-20 dark:bg-slate-900">
        <div className="container px-4">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-4xl">
                Simplifique sua rotina e foque no crescimento
              </h2>
              <p className="mt-6 text-lg text-slate-600 dark:text-slate-300">
                Milhares de empreendedores perdem tempo com burocracia. O SISFEC automatiza processos manuais para você ganhar tempo.
              </p>
              
              <ul className="mt-8 space-y-4">
                {checklist.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-slate-700 dark:text-slate-200">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10">
                <Link to="/planos">
                  <Button size="lg" className="rounded-full">
                    Conhecer Planos
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">+1000</div>
                <div className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">Empresas ativas</div>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">98%</div>
                <div className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">Satisfação dos clientes</div>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">24/7</div>
                <div className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">Monitoramento de servidores</div>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">0</div>
                <div className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">Custo de implantação</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 py-20 dark:bg-blue-700">
        <div className="container px-4 text-center">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Pronto para levar sua empresa para o próximo nível?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-blue-100">
            Junte-se a milhares de empreendedores que já transformaram a gestão de seus negócios com o SISFEC.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link to="/auth?mode=signup">
              <Button size="lg" variant="secondary" className="h-14 w-full rounded-full px-8 text-lg font-semibold text-blue-700 hover:bg-blue-50 sm:w-auto">
                Criar Conta Grátis
              </Button>
            </Link>
            <Link to="/planos">
              <Button size="lg" className="h-14 w-full rounded-full border-2 border-white/20 bg-transparent px-8 text-lg font-semibold text-white hover:bg-white/10 sm:w-auto">
                Ver Preços
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-blue-200">
            Não é necessário cartão de crédito. Teste grátis por 7 dias.
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
