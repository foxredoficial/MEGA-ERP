import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, LayoutDashboard } from "lucide-react";

interface ModernAuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function ModernAuthLayout({ children, title, subtitle }: ModernAuthLayoutProps) {
  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-950">
      {/* Left Column - Form Area */}
      <div className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24 relative z-10 bg-white dark:bg-slate-950">
        <div className="absolute top-6 left-6 lg:top-10 lg:left-10">
          <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Voltar para Home</span>
          </Link>
        </div>
        
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                MegaERP
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h2>
            <p className="mt-2 text-base text-slate-600 dark:text-slate-400">
              {subtitle}
            </p>
          </div>
          
          {children}
          
          <div className="mt-10 border-t border-slate-100 pt-6 dark:border-slate-800">
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              &copy; {new Date().getFullYear()} MegaERP SaaS. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column - Brand/Marketing Area */}
      <div className="hidden lg:block relative w-0 flex-1 overflow-hidden bg-slate-900">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('/dashboard-preview.png')] bg-cover bg-center" />
          {/* Blue Blur Overlay - Brand Theme */}
          <div className="absolute inset-0 bg-blue-600/30 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/95 via-blue-900/70 to-blue-900/30 backdrop-blur-[2px]" />
        </div>

        {/* Content Layer */}
        <div className="relative z-20 flex flex-col h-full justify-end p-16 text-white">
          <div className="mb-12">
            <blockquote className="space-y-6 max-w-lg">
              <div className="text-3xl font-medium leading-relaxed">
                "O MegaERP transformou completamente a gestão das nossas lojas. O controle de estoque e a emissão fiscal são impecáveis."
              </div>
              <footer className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold border border-white/20 backdrop-blur-sm">
                  JS
                </div>
                <div>
                  <div className="font-semibold text-lg">João Silva</div>
                  <div className="text-blue-200">CEO, Silva Varejo</div>
                </div>
              </footer>
            </blockquote>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-blue-100">Tudo o que você precisa para crescer:</h3>
            <ul className="grid grid-cols-2 gap-x-8 gap-y-4">
              {[
                "Emissão de NFe/NFCe ilimitada",
                "Controle de Estoque Multi-loja",
                "Gestão Financeira Completa",
                "Frente de Caixa (PDV) Offline",
                "Loja Virtual Integrada",
                "Suporte Humanizado 24/7"
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-blue-50/90">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span className="text-sm font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
