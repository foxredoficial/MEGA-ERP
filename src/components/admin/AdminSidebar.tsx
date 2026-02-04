import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  ShoppingBag,
  LogOut,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

type SidebarProps = {
  className?: string;
};

export function AdminSidebar({ className }: SidebarProps) {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: Users, label: 'Clientes', path: '/admin/users' },
    { icon: ShoppingBag, label: 'Assinaturas', path: '/admin/subscriptions' },
    { icon: CreditCard, label: 'Planos', path: '/admin/plans' },
    { icon: Settings, label: 'Configurações', path: '/admin/settings' },
  ];

  return (
    <aside className={cn("flex h-screen w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950", className)}>
      <div className="flex h-16 items-center border-b border-zinc-200 px-6 dark:border-zinc-800">
        <div className="flex items-center gap-2 font-bold text-xl text-zinc-900 dark:text-zinc-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
            <span className="text-lg">M</span>
          </div>
          <span className="bg-gradient-to-r from-zinc-900 to-zinc-600 bg-clip-text text-transparent dark:from-white dark:to-zinc-400">MEGA Admin</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-900/50"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                )}
              >
                <item.icon className={cn("h-5 w-5 transition-colors", active ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300")} />
                {item.label}
                {active && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
        <Link to="/app" className="mb-2 block">
           <Button variant="outline" className="w-full justify-start" size="sm">
             <ChevronLeft className="mr-2 h-4 w-4" />
             Voltar ao SaaS
           </Button>
        </Link>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
          onClick={() => {
            // Logout logic if needed, or just redirect
             window.location.href = '/auth?mode=login';
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
