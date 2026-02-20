import { Link, useNavigate } from "react-router-dom";
import { 
  Search, 
  Bell, 
  HelpCircle, 
  Settings, 
  Grid, 
  ChevronDown, 
  LogOut,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  Box,
  BarChart3,
  Shield,
  ArrowRight,
  Sun,
  Moon
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { globalSearch } from "@/lib/api";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { subscriptionHasFeature, type FeatureKey } from "@/lib/entitlements";

// Helper type for menu em grade
type MenuItem = {
  label: string;
  href: string;
  feature?: FeatureKey;
};

type MenuColumn = {
  title?: string;
  items: MenuItem[];
};

type MenuSection = {
  label: string;
  icon?: React.ElementType;
  columns?: MenuColumn[]; // For mega menu
  items?: MenuItem[]; // For simple menu (fallback/admin)
  footerLink?: { label: string; href: string };
};

export function BlingHeader() {
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const subscription = useSubscriptionStore((s) => s.subscription);
  const subStatus = useSubscriptionStore((s) => s.status);
  const loadSubscription = useSubscriptionStore((s) => s.load);
  const clearSubscription = useSubscriptionStore((s) => s.clear);
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchActiveIndex, setSearchActiveIndex] = useState(0);

  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (session?.userId) {
      if (subStatus === "idle") void loadSubscription();
    } else {
      clearSubscription();
    }
  }, [clearSubscription, loadSubscription, session?.userId, subStatus]);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
        setUserMenuOpen(false);
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const flatSearchItems = (() => {
    if (!searchResults?.results) return [] as Array<{ label: string; href: string; meta?: string; kind: string }>;
    const r = searchResults.results;
    const items: Array<{ label: string; href: string; meta?: string; kind: string }> = [];

    for (const p of (r.products ?? []) as any[]) {
      items.push({
        kind: "product",
        label: p.name,
        meta: p.sku ? `SKU: ${p.sku}` : p.type === "service" ? "Serviço" : "Produto",
        href: `/app/produtos/${p.id}`,
      });
    }

    for (const c of (r.contacts ?? []) as any[]) {
      const isSupplier = String(c.contact_type ?? "").toLowerCase().includes("fornecedor");
      items.push({
        kind: "contact",
        label: c.fantasy_name ? `${c.name} (${c.fantasy_name})` : c.name,
        meta: c.cpf_cnpj || c.email || (isSupplier ? "Fornecedor" : "Cliente"),
        href: isSupplier ? `/app/fornecedores/${c.id}` : `/app/clientes/${c.id}`,
      });
    }

    for (const o of (r.salesOrders ?? []) as any[]) {
      items.push({
        kind: "salesOrder",
        label: `Pedido ${o.number}`,
        meta: o.customer_name,
        href: `/app/vendas/pedidos/${o.id}`,
      });
    }

    for (const o of (r.serviceOrders ?? []) as any[]) {
      items.push({
        kind: "serviceOrder",
        label: `OS ${o.number}`,
        meta: o.customer_name,
        href: `/app/ordens-servico/${o.id}`,
      });
    }

    for (const d of (r.documents ?? []) as any[]) {
      items.push({
        kind: "document",
        label: `${String(d.type).toUpperCase()} ${d.number}`,
        meta: d.party_name || d.status,
        href: `/app/docs/${d.type}/${d.id}`,
      });
    }

    return items.slice(0, 12);
  })();

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults(null);
      setSearchLoading(false);
      setSearchActiveIndex(0);
      return;
    }

    setSearchLoading(true);
    const t = window.setTimeout(() => {
      globalSearch(q)
        .then((data) => {
          setSearchResults(data);
          setSearchActiveIndex(0);
        })
        .catch(() => {
          setSearchResults(null);
        })
        .finally(() => setSearchLoading(false));
    }, 220);

    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const menus: MenuSection[] = [
    {
      label: "Cadastros",
      icon: Users,
      columns: [
        {
          title: "Cadastros",
          items: [
            { label: "Clientes", href: "/app/clientes", feature: "contacts" },
            { label: "Fornecedores", href: "/app/fornecedores", feature: "contacts" },
            { label: "Catálogo de Serviços", href: "/app/servicos", feature: "services" },
            { label: "Vendedores", href: "/app/vendedores", feature: "salespersons" },
          ]
        },
        {
          title: "Ferramentas",
          items: [
            { label: "Categorias de produtos", href: "/app/categorias", feature: "categories" },
            { label: "Listas de preços", href: "/app/listas-preco", feature: "price_lists" },
          ]
        }
      ],
      // footerLink removed as requested
    },
    {
      label: "Vendas",
      icon: ShoppingCart,
      columns: [
        {
          title: "Gestão",
          items: [
            { label: "Pedidos de venda", href: "/app/vendas/pedidos", feature: "sales_orders" },
            { label: "Produtos", href: "/app/produtos", feature: "products" },
            { label: "Notas fiscais de saída", href: "/app/docs/nfe", feature: "docs" },
            { label: "NFC-e", href: "/app/docs/nfce", feature: "docs" },
            { label: "Frente de caixa", href: "/app/pdv", feature: "pdv" },
            { label: "Propostas comerciais", href: "/app/docs/proposal", feature: "docs" },
          ]
        },
        {
          title: "Serviços",
          items: [
            { label: "Contratos", href: "/app/docs/contract", feature: "docs" },
            { label: "Ordens de serviço", href: "/app/ordens-servico", feature: "service_orders" },
            { label: "Notas de serviço", href: "/app/docs/service_invoice", feature: "docs" },
            { label: "Cobranças", href: "/app/financeiro/titulos?kind=ar", feature: "finance" },
          ]
        }
      ],
      footerLink: { label: "Ver relatórios de vendas", href: "/app/relatorios/sales-orders" }
    },
    {
      label: "Estoque", // Implied Top Level Menu
      icon: Package,
      columns: [
        {
          title: "Compras",
          items: [
            { label: "Pedidos de compra", href: "/app/docs/purchase_order", feature: "docs" },
            { label: "Notas fiscais de entrada", href: "/app/docs/incoming_invoice", feature: "docs" },
          ]
        },
        {
          title: "Estoque",
          items: [
            { label: "Lançamentos de estoque", href: "/app/estoque/lancamentos", feature: "stock" },
            { label: "Conferência de estoque", href: "/app/estoque/conferencia", feature: "stock" },
            { label: "Ordens de produção", href: "/app/docs/production_order", feature: "docs" },
          ]
        }
      ],
      footerLink: { label: "Ver relatórios de compras e estoque", href: "/app/relatorios/stock-movements" }
    },
    {
      label: "Financeiro",
      icon: DollarSign,
      columns: [
        {
          title: "Gestão financeira",
          items: [
            { label: "Visão geral", href: "/app/financeiro", feature: "finance" },
            { label: "Cadastros financeiros", href: "/app/financeiro/cadastros", feature: "finance" },
            { label: "Caixas e bancos", href: "/app/financeiro/bancos", feature: "banks" },
            { label: "Contas a receber", href: "/app/financeiro/titulos?kind=ar", feature: "finance" },
            { label: "Contas a pagar", href: "/app/financeiro/titulos?kind=ap", feature: "finance" },
            { label: "Controle de caixa", href: "/app/financeiro/caixa", feature: "cash" },
            { label: "Conciliação bancária", href: "/app/financeiro/conciliacao", feature: "banks" },
            { label: "Fluxo de caixa", href: "/app/financeiro/fluxo-caixa", feature: "finance" },
            { label: "DRE", href: "/app/financeiro/dre", feature: "finance" },
          ]
        }
      ],
      footerLink: { label: "Ver relatórios financeiros", href: "/app/relatorios/financial-titles" }
    },
    {
      label: "Relatórios",
      icon: BarChart3,
      items: [
        { label: "Central de relatórios", href: "/app/relatorios", feature: "reports" },
        { label: "Vendas (Pedidos)", href: "/app/relatorios/sales-orders", feature: "reports" },
        { label: "Vendas (PDV)", href: "/app/relatorios/pdv-sales", feature: "reports" },
        { label: "Caixa (Transações)", href: "/app/relatorios/cash-transactions", feature: "reports" },
        { label: "Financeiro (Títulos)", href: "/app/relatorios/financial-titles", feature: "reports" },
        { label: "Estoque (Movimentações)", href: "/app/relatorios/stock-movements", feature: "reports" },
        { label: "Produtos", href: "/app/relatorios/products", feature: "reports" },
      ]
    },
  ];

  if (session?.role === "admin") {
    menus.push({
      label: "Administração",
      icon: Shield,
      items: [
        { label: "Painel Admin", href: "/admin" },
        { label: "Usuários", href: "/admin/users" },
        { label: "Planos", href: "/admin/plans" },
        { label: "Assinaturas", href: "/admin/subscriptions" },
        { label: "Configurações", href: "/admin/settings" },
      ]
    });
  }

  const allowAll = session?.role === "admin" || subStatus === "loading" || subStatus === "error";
  const isAllowed = (feature?: FeatureKey) =>
    allowAll ? true : feature ? subscriptionHasFeature(subscription, feature) : true;
  const filteredMenus = menus
    .map((section) => {
      const next: MenuSection = { ...section };
      if (next.items) {
        next.items = next.items.filter((it) => isAllowed((it as any).feature));
      }
      if (next.columns) {
        next.columns = next.columns
          .map((c) => ({ ...c, items: c.items.filter((it) => isAllowed((it as any).feature)) }))
          .filter((c) => c.items.length > 0);
      }
      if (next.footerLink) {
        const footerFeature = (() => {
          if (next.footerLink.href.startsWith("/app/relatorios")) return "reports" as FeatureKey;
          return undefined;
        })();
        if (footerFeature && !isAllowed(footerFeature)) next.footerLink = undefined;
      }
      return next;
    })
    .filter((s) => (s.items && s.items.length > 0) || (s.columns && s.columns.length > 0));

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 shadow-sm fixed top-0 w-full z-50" ref={menuRef}>
      {/* Top Bar */}
      <div className="h-14 px-4 flex items-center justify-between gap-4">
        {/* Logo & Mobile Menu */}
        <div className="flex items-center gap-4">
          <Link to="/app" className="flex items-center gap-2 font-bold text-xl text-blue-600 dark:text-blue-500">
            <div className="bg-blue-600 dark:bg-blue-500 text-white p-1 rounded">
              <Box className="w-5 h-5" />
            </div>
            <span>SISFEC</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {filteredMenus.map((menu) => (
            <div key={menu.label} className="relative group">
              <button
                className={cn(
                  "flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-md transition-colors",
                  openMenu === menu.label && "text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-900"
                )}
                onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
              >
                {menu.label}
                <ChevronDown className="w-3 h-3" />
              </button>

              {/* Menu em grade */}
              {(openMenu === menu.label) && (
                <div 
                  className={cn(
                    "absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-100 dark:border-slate-800 py-4 animate-in fade-in slide-in-from-top-2 z-50",
                    menu.columns ? "w-[600px] grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-6 px-6" : "w-56"
                  )}
                >
                  {/* Columns Rendering */}
                  {menu.columns ? (
                    <>
                      {menu.columns.map((col, idx) => (
                        <div key={idx} className="flex flex-col gap-2">
                          {col.title && (
                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-1">
                              {col.title}
                            </h4>
                          )}
                          <div className="flex flex-col gap-1">
                            {col.items.map((item) => (
                              <Link
                                key={item.label}
                                to={item.href}
                                className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 py-1 transition-colors"
                                onClick={() => setOpenMenu(null)}
                              >
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                      
                      {/* Footer Link */}
                      {menu.footerLink && (
                        <div className="col-span-full pt-3 mt-1 border-t border-slate-100 dark:border-slate-800">
                          <Link 
                            to={menu.footerLink.href}
                            className="text-sm font-medium text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 flex items-center gap-1"
                            onClick={() => setOpenMenu(null)}
                          >
                            {menu.footerLink.label}
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Simple List Rendering (Fallback/Admin) */
                    menu.items?.map((item) => (
                      <Link
                        key={item.label}
                        to={item.href}
                        className="block px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-blue-600 dark:hover:text-blue-400"
                        onClick={() => setOpenMenu(null)}
                      >
                        {item.label}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Search & Actions */}
        <div className="flex items-center gap-3">
          <div className="relative hidden lg:block w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar..."
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-100 dark:bg-slate-900 dark:text-slate-200 border-transparent rounded-full focus:bg-white dark:focus:bg-slate-950 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (!searchOpen) return;
                if (e.key === "Escape") {
                  setSearchOpen(false);
                  return;
                }

                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSearchActiveIndex((i) => Math.min(i + 1, Math.max(flatSearchItems.length - 1, 0)));
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSearchActiveIndex((i) => Math.max(i - 1, 0));
                }
                if (e.key === "Enter") {
                  const item = flatSearchItems[searchActiveIndex];
                  if (item) {
                    e.preventDefault();
                    setSearchOpen(false);
                    setOpenMenu(null);
                    setUserMenuOpen(false);
                    navigate(item.href);
                  }
                }
              }}
            />

            {searchOpen && (searchQuery.trim().length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
                <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <span>{searchLoading ? "Pesquisando..." : "Resultados"}</span>
                  <span className="text-[11px]">Enter para abrir · Esc para fechar</span>
                </div>
                {flatSearchItems.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">Nenhum resultado.</div>
                ) : (
                  <div className="max-h-80 overflow-auto">
                    {flatSearchItems.map((item, idx) => (
                      <button
                        key={`${item.kind}-${item.href}`}
                        className={cn(
                          "w-full text-left px-3 py-2 flex flex-col gap-0.5 hover:bg-slate-50 dark:hover:bg-slate-900",
                          idx === searchActiveIndex && "bg-slate-50 dark:bg-slate-900"
                        )}
                        onMouseEnter={() => setSearchActiveIndex(idx)}
                        onClick={() => {
                          setSearchOpen(false);
                          navigate(item.href);
                        }}
                      >
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{item.label}</span>
                        {item.meta && <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.meta}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <button
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full relative"
              onClick={() => navigate("/app/atalhos")}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full relative"
              onClick={() => navigate("/app/notificacoes")}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-950"></span>
            </button>
            <button
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
              onClick={() => navigate("/app/ajuda")}
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
              onClick={() => navigate({ pathname: "/app", hash: "#settings" })}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile */}
          <div className="relative border-l border-slate-200 dark:border-slate-800 pl-4 ml-1">
            <button
              className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-900 p-1 pr-2 rounded-lg transition-colors"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800">
                {profile?.fullName?.charAt(0) || "U"}
              </div>
              <div className="hidden xl:block text-left">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
                  {profile?.companyName || "Minha Empresa"}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                  {profile?.fullName || "Usuário"}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-100 dark:border-slate-800 py-1 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{profile?.fullName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{session?.email}</p>
                </div>
                <Link
                  to={{ pathname: "/app", hash: "#profile" }}
                  className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Meus Dados
                </Link>
                <Link
                  to={{ pathname: "/app", hash: "#plan" }}
                  className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Minha Assinatura
                </Link>
                <button
                  onClick={() => {
                    toggleTheme();
                    // Don't close menu immediately so user can see toggle
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center gap-2"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  Tema: {theme === 'dark' ? 'Escuro' : 'Claro'}
                </button>
                <button
                  onClick={() => {
                    signOut();
                    setUserMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
