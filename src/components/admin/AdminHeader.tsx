import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-4">
        {/* <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <Input 
            placeholder="Buscar..." 
            className="pl-9 h-9 bg-zinc-50 dark:bg-zinc-900" 
          />
        </div> */}
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
           Painel Administrativo
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-600"></span>
        </Button>
        
        <div className="flex items-center gap-3 border-l border-zinc-200 pl-4 dark:border-zinc-800">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Administrador</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">admin@megaerp.com</span>
          </div>
          <div className="h-9 w-9 rounded-full bg-zinc-100 p-1 dark:bg-zinc-800">
             <div className="h-full w-full rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
               AD
             </div>
          </div>
        </div>
      </div>
    </header>
  );
}
