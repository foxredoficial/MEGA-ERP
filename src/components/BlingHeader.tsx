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
  Shield,
  ArrowRight,
  Sun,
  Moon
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

// Helper type for Mega Menu structure
type MenuItem = {
  label: string;
  href: string;
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
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menus: MenuSection[] = [
    {
      label: "Cadastros",
      icon: Users,
      columns: [
        {
          title: "Cadastros",
          items: [
            { label: "Clientes", href: "/app/clientes" },
            { label: "Fornecedores", href: "/app/fornecedores" },
            { label: "Catálogo de Serviços", href: "/app/servicos" },
            { label: "Vendedores", href: "/app/vendedores" },
          ]
        },
        {
          title: "Ferramentas",
          items: [
            { label: "Categorias de produtos", href: "/app/categorias" },
            { label: "Listas de preços", href: "/app/listas-preco" },
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
            { label: "Pedidos de venda", href: "/app/vendas/pedidos" },
            { label: "Produtos", href: "/app/produtos" },
            { label: "Notas fiscais de saída", href: "#" },
            { label: "NFC-e", href: "#" },
            { label: "Frente de caixa", href: "/app/pdv" },
            { label: "Propostas comerciais", href: "#" },
          ]
        },
        {
          title: "Serviços",
          items: [
            { label: "Contratos", href: "#" },
            { label: "Ordens de serviço", href: "/app/ordens-servico" },
            { label: "Notas de serviço", href: "#" },
            { label: "Cobranças", href: "#" },
          ]
        }
      ],
      footerLink: { label: "Ver relatórios de vendas", href: "#" }
    },
    {
      label: "Estoque", // Implied Top Level Menu
      icon: Package,
      columns: [
        {
          title: "Compras",
          items: [
            { label: "Pedidos de compra", href: "#" },
            { label: "Notas fiscais de entrada", href: "#" },
            { label: "Fornecedores", href: "/app/fornecedores" },
          ]
        },
        {
          title: "Estoque",
          items: [
            { label: "Lançamentos de estoque", href: "#" },
            { label: "Conferência de estoque", href: "#" },
            { label: "Ordens de produção", href: "#" },
          ]
        }
      ],
      footerLink: { label: "Ver relatórios de compras e estoque", href: "#" }
    },
    {
      label: "Financeiro",
      icon: DollarSign,
      columns: [
        {
          title: "Gestão financeira",
          items: [
            { label: "Caixas e bancos", href: "#" },
            { label: "Contas a receber", href: "/app/financeiro/titulos?kind=ar" },
            { label: "Contas a pagar", href: "/app/financeiro/titulos?kind=ap" },
            { label: "Controle de caixa", href: "/app/financeiro/caixa" },
            { label: "Conciliação bancária", href: "#" },
          ]
        }
      ],
      footerLink: { label: "Ver relatórios financeiros", href: "#" }
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
            <span>MEGA ERP</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {menus.map((menu) => (
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

              {/* Mega Menu Dropdown */}
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
            />
          </div>

          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full relative">
              <Grid className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-950"></span>
            </button>
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
              <HelpCircle className="w-5 h-5" />
            </button>
            <button 
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
              onClick={() => navigate("/app#settings")}
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
                  to="/app#profile"
                  className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Meus Dados
                </Link>
                <Link
                  to="/app#plan"
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
