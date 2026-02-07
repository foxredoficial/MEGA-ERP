import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Moon, Sun, Laptop } from 'lucide-react';

export function Settings() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');

  useEffect(() => {
    setTheme('system');
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    
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
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Configurações</h2>
        <p className="text-slate-500 dark:text-slate-400">Gerencie as preferências do painel administrativo.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900 dark:text-slate-100">Tema do Painel</label>
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
            <p className="text-sm text-slate-500">
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
                 <div className="flex items-center justify-between p-4 border rounded-lg border-slate-200 dark:border-slate-800">
                     <div>
                         <p className="font-medium text-slate-900 dark:text-slate-100">Versão do Painel</p>
                         <p className="text-sm text-slate-500">v1.0.0 (Beta)</p>
                     </div>
                     <div className="h-2 w-2 rounded-full bg-green-500"></div>
                 </div>
             </div>
        </CardContent>
      </Card>
    </div>
  );
}
