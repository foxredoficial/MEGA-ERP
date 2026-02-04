import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Moon, Sun, Laptop } from 'lucide-react';

export function Settings() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'light';
    setTheme(savedTheme);
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Apply theme immediately
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(newTheme);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Configurações</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Gerencie as preferências do painel administrativo.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Tema do Painel</label>
            <div className="grid grid-cols-3 gap-4 sm:max-w-md">
              <Button
                variant={theme === 'light' ? 'primary' : 'outline'}
                className="flex flex-col items-center justify-center gap-2 h-24"
                onClick={() => handleThemeChange('light')}
              >
                <Sun className="h-6 w-6" />
                <span>Claro</span>
              </Button>
              <Button
                variant={theme === 'dark' ? 'primary' : 'outline'}
                className="flex flex-col items-center justify-center gap-2 h-24"
                onClick={() => handleThemeChange('dark')}
              >
                <Moon className="h-6 w-6" />
                <span>Escuro</span>
              </Button>
              <Button
                variant={theme === 'system' ? 'primary' : 'outline'}
                className="flex flex-col items-center justify-center gap-2 h-24"
                onClick={() => handleThemeChange('system')}
              >
                <Laptop className="h-6 w-6" />
                <span>Sistema</span>
              </Button>
            </div>
            <p className="text-sm text-zinc-500">
              Selecione o tema de sua preferência para o painel administrativo.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sistema</CardTitle>
        </CardHeader>
        <CardContent>
             <div className="space-y-4">
                 <div className="flex items-center justify-between p-4 border rounded-lg border-zinc-200 dark:border-zinc-800">
                     <div>
                         <p className="font-medium text-zinc-900 dark:text-zinc-100">Versão do Painel</p>
                         <p className="text-sm text-zinc-500">v1.0.0 (Beta)</p>
                     </div>
                     <div className="h-2 w-2 rounded-full bg-green-500"></div>
                 </div>
             </div>
        </CardContent>
      </Card>
    </div>
  );
}
