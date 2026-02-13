import { useEffect, useState } from 'react';
import { getAdminSubscriptions } from '@/lib/api_admin';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Search } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';

export function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<'all' | 'active' | 'past_due' | 'canceled'>('all');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getAdminSubscriptions({ page, pageSize, q: searchTerm.trim() || undefined, status })
      .then((r) => {
        if (cancelled) return;
        setSubscriptions(r.items);
        setTotal(r.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, searchTerm, status]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, status]);

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
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Assinaturas</h2>
          <p className="text-slate-500 dark:text-slate-400">Gerencie os planos e pagamentos recorrentes.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">Histórico de Assinaturas</CardTitle>
          <div className="flex items-center gap-3">
            <div className="w-48">
              <Select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="all">Status: Todos</option>
                <option value="active">Status: Ativo</option>
                <option value="past_due">Status: Em atraso</option>
                <option value="canceled">Status: Cancelado</option>
              </Select>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input 
                placeholder="Buscar assinatura..." 
                className="pl-9" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Cliente</th>
                  <th className="px-6 py-3 font-medium">Plano</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Início</th>
                  <th className="px-6 py-3 font-medium">Término</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{sub.user_name}</div>
                      <div className="text-xs text-slate-500">{sub.user_email}</div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {sub.plan_name}
                    </td>
                    <td className="px-6 py-4">
                      <Badge tone={sub.status === 'active' ? 'green' : 'slate'}>
                        {sub.status === 'active' ? 'Ativo' : sub.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(sub.started_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {sub.ended_at ? new Date(sub.ended_at).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {subscriptions.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                Nenhuma assinatura encontrada.
              </div>
            )}
          </div>

          <div className="mt-4">
            <Pagination
              label="Assinaturas"
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
