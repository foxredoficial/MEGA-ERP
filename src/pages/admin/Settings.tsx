import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Moon, Sun, Laptop } from 'lucide-react';
import { getAdminMercadoPagoConfig } from '@/lib/api_admin';

export function Settings() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [mpConfig, setMpConfig] = useState<{ accessToken: boolean; publicKey: boolean; webhookBaseUrl: boolean; signatureSecret: boolean } | null>(null);
  const [mpLoading, setMpLoading] = useState(false);

  useEffect(() => {
    setTheme('system');
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMpLoading(true);
    void getAdminMercadoPagoConfig()
      .then((r) => {
        if (cancelled) return;
        setMpConfig(r.configured);
      })
      .catch(() => {
        if (cancelled) return;
        setMpConfig(null);
      })
      .finally(() => {
        if (cancelled) return;
        setMpLoading(false);
      });
    return () => {
      cancelled = true;
    };
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

      <Card>
        <CardHeader>
          <CardTitle>Mercado Pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Integração preparada para Checkout Transparente (pagamentos) e Orders. Para ativar, configure as variáveis no backend.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">MP_ACCESS_TOKEN</div>
                <div className="text-xs text-slate-500">Chave privada do Mercado Pago</div>
              </div>
              <Badge tone={mpConfig?.accessToken ? 'green' : 'slate'}>{mpConfig?.accessToken ? 'OK' : 'Pendente'}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">MP_PUBLIC_KEY</div>
                <div className="text-xs text-slate-500">Chave pública (front/Bricks)</div>
              </div>
              <Badge tone={mpConfig?.publicKey ? 'green' : 'slate'}>{mpConfig?.publicKey ? 'OK' : 'Opcional'}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">WEBHOOK_BASE_URL</div>
                <div className="text-xs text-slate-500">URL pública para webhooks</div>
              </div>
              <Badge tone={mpConfig?.webhookBaseUrl ? 'green' : 'slate'}>{mpConfig?.webhookBaseUrl ? 'OK' : 'Pendente'}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">MP_WEBHOOK_SIGNATURE_SECRET</div>
                <div className="text-xs text-slate-500">Assinatura do webhook</div>
              </div>
              <Badge tone={mpConfig?.signatureSecret ? 'green' : 'slate'}>{mpConfig?.signatureSecret ? 'OK' : 'Opcional'}</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.reload()} disabled={mpLoading}>
              Recarregar status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
