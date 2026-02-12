import { ChevronRight, ArrowLeft } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Crumb = { label: string; to?: string };

const LABELS: Record<string, string> = {
  app: "Home",
  cadastros: "Cadastros",
  clientes: "Clientes",
  fornecedores: "Fornecedores",
  produtos: "Produtos",
  servicos: "Serviços",
  estoque: "Estoque",
  lancamentos: "Lançamentos",
  financeiro: "Financeiro",
  titulos: "Títulos",
  caixa: "Caixa",
  relatorios: "Relatórios",
  vendas: "Vendas",
  pedidos: "Pedidos",
  os: "Ordens de Serviço",
  docs: "Documentos",
  categorias: "Categorias",
  listas: "Listas",
  precos: "Preços",
  price_lists: "Listas de Preço",
  configuracoes: "Configurações",
  admin: "Admin",
  usuarios: "Usuários",
  assinaturas: "Assinaturas",
  novo: "Novo",
  editar: "Editar",
};

function labelForSegment(seg: string) {
  return LABELS[seg] ?? seg.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function buildCrumbs(pathname: string): Crumb[] {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return [{ label: "Home", to: "/app" }];

  const crumbs: Crumb[] = [];
  let acc = "";
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    acc += `/${seg}`;
    if (seg === "app") {
      crumbs.push({ label: "Home", to: "/app" });
      continue;
    }

    if (/^[0-9a-fA-F-]{8,}$/.test(seg)) {
      crumbs.push({ label: "Detalhe" });
      continue;
    }

    crumbs.push({ label: labelForSegment(seg), to: acc });
  }
  return crumbs;
}

export function BreadcrumbBar({ className }: { className?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const crumbs = buildCrumbs(location.pathname);

  const showBack = location.pathname !== "/app";

  return (
    <div className={cn("mb-4 flex items-center gap-3", className)}>
      {showBack ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hover:bg-blue-50 hover:text-blue-700"
          onClick={() => navigate(-1)}
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      ) : null}

      <div className="flex min-w-0 items-center gap-1.5 text-sm text-slate-500">
        {crumbs.map((c, idx) => {
          const isLast = idx === crumbs.length - 1;
          const content = c.to ? (
            <Link to={c.to} className={cn("truncate hover:underline", !isLast && "hover:text-blue-700")}>
              {c.label}
            </Link>
          ) : (
            <span className={cn("truncate", isLast && "font-medium text-blue-700")}>{c.label}</span>
          );

          return (
            <span key={`${c.label}-${idx}`} className="flex min-w-0 items-center gap-1.5">
              {idx > 0 ? <ChevronRight className="h-4 w-4 text-slate-300" /> : null}
              {isLast ? <span className="min-w-0">{content}</span> : content}
            </span>
          );
        })}
      </div>
    </div>
  );
}

