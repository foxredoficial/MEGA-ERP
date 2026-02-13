import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';

export function AdminHeader() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const displayName = (profile?.fullName || session?.email || "").trim();
  const displayEmail = session?.email || "";
  const initials = useMemo(() => {
    const base = (profile?.fullName || session?.email || "").trim();
    if (!base) return "";
    const parts = base.includes("@") ? base.split("@")[0] : base;
    const words = parts
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .split(" ")
      .filter(Boolean);
    const a = words[0]?.[0] ?? "";
    const b = words.length > 1 ? words[words.length - 1]?.[0] ?? "" : words[0]?.[1] ?? "";
    return (a + b).toUpperCase();
  }, [profile?.fullName, session?.email]);

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-4">
        {/* <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Buscar..." 
            className="pl-9 h-9 bg-slate-50 dark:bg-slate-900" 
          />
        </div> */}
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
           Painel Administrativo
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-600"></span>
        </Button>
        
        <div className="flex items-center gap-3 border-l border-slate-200 pl-4 dark:border-slate-800">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{displayName || "Usuário"}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{displayEmail || "-"}</span>
          </div>
          <div className="h-9 w-9 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
             <div className="h-full w-full rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
               {initials || "U"}
             </div>
          </div>
        </div>
      </div>
    </header>
  );
}
