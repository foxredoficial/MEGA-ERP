import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export function SiteFooter() {
  const status = useAuthStore((s) => s.status);
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="container px-4">
        <div className="flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <div className="text-sm font-semibold">SISFEC</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">© {new Date().getFullYear()} • Todos os direitos reservados</div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <Link to="/planos">Planos</Link>
            <Link to="/termos">Termos</Link>
            <Link to="/privacidade">Privacidade</Link>
            {status === "signedIn" ? <Link to="/app">Área do cliente</Link> : <Link to="/auth?mode=login">Entrar</Link>}
          </div>
        </div>
      </div>
    </footer>
  );
}
