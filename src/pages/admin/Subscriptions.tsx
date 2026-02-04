import { useEffect, useState } from 'react';
import { getAdminSubscriptions } from '@/lib/api_admin';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Search } from 'lucide-react';

export function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    getAdminSubscriptions()
      .then(setSubscriptions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredSubscriptions = subscriptions.filter(sub => 
    sub.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.plan_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        Erro ao carregar assinaturas: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Assinaturas</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Gerencie os planos e pagamentos recorrentes.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">Histórico de Assinaturas</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input 
              placeholder="Buscar assinatura..." 
              className="pl-9" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Cliente</th>
                  <th className="px-6 py-3 font-medium">Plano</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Início</th>
                  <th className="px-6 py-3 font-medium">Término</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                {filteredSubscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{sub.user_name}</div>
                      <div className="text-xs text-zinc-500">{sub.user_email}</div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {sub.plan_name}
                    </td>
                    <td className="px-6 py-4">
                      <Badge tone={sub.status === 'active' ? 'green' : 'zinc'}>
                        {sub.status === 'active' ? 'Ativo' : sub.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-zinc-500">
                      {new Date(sub.started_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-zinc-500">
                      {sub.ended_at ? new Date(sub.ended_at).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredSubscriptions.length === 0 && (
              <div className="p-6 text-center text-zinc-500">
                Nenhuma assinatura encontrada.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
