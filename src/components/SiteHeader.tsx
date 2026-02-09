import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Building2, Moon, Sun, LayoutDashboard, Settings, LogOut, ChevronDown } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

export function SiteHeader() {
  const { isDark, toggleTheme } = useTheme();
  const status = useAuthStore((s) => s.status);
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.fullName || session?.email || "User")}&background=random`;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/70 backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/60">
      <div className="container px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Building2 className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold">MEGA ERP</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">SaaS PDV • ERP</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <NavLink
              to="/planos"
              className={({ isActive }) =>
                cn(
                  "text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white",
                  isActive && "text-slate-950 dark:text-white"
                )
              }
            >
              Planos
            </NavLink>
            {status !== "signedIn" ? (
              <NavLink
                to="/auth?mode=login"
                className={({ isActive }) =>
                  cn(
                    "text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white",
                    isActive && "text-slate-950 dark:text-white"
                  )
                }
              >
                Entrar
              </NavLink>
            ) : null}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Alternar tema"
              onClick={toggleTheme}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {status === "signedIn" ? (
              <>
                <Link to="/app" className="hidden md:block">
                  <Button variant="secondary">Área do cliente</Button>
                </Link>

                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white pl-2 pr-3 py-1.5 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                  >
                     <img src={avatarUrl} alt="" className="h-8 w-8 rounded-lg bg-slate-200 object-cover" />
                     <div className="hidden text-left sm:block">
                       <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {profile?.fullName?.split(' ')[0] || "Usuário"}
                       </div>
                       <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          Minha conta
                       </div>
                     </div>
                     <ChevronDown className="h-4 w-4 text-slate-500" />
                  </button>
              
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900">
                      <div className="px-2 py-1.5">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {profile?.fullName || session?.email}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {session?.email}
                        </div>
                      </div>
                      <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
                      
                      <Link 
                        to="/app" 
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Área do Cliente
                      </Link>
                      
                      <Link 
                        to={{ pathname: "/app", hash: "#profile" }}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Settings className="h-4 w-4" />
                        Meu Perfil
                      </Link>
                      
                      <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
                      
                      <button
                        onClick={() => { setMenuOpen(false); signOut(); }}
                        className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <LogOut className="h-4 w-4" />
                        Sair
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link to="/auth?mode=signup">
                <Button>Criar conta</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
