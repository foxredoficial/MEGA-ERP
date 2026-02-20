import { useEffect, useState } from 'react';
import { cancelAdminSubscription, createAdminManualSubscription, getAdminPlans, getAdminSubscriptions, getAdminUsers, syncAdminSubscription, updateAdminSubscription } from '@/lib/api_admin';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { RefreshCw, Search, Shuffle } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';

export function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<'all' | 'active' | 'past_due' | 'canceled'>('all');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planTarget, setPlanTarget] = useState<any | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [createUserId, setCreateUserId] = useState('');
  const [createPlanId, setCreatePlanId] = useState('');
  const [createStatus, setCreateStatus] = useState<'active' | 'canceled' | 'past_due'>('active');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await getAdminSubscriptions({ page, pageSize, q: searchTerm.trim() || undefined, status });
        if (cancelled) return;
        setSubscriptions(r.items);
        setTotal(r.total);
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, searchTerm, status]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, status]);

  useEffect(() => {
    if (!planModalOpen && !createModalOpen) return;
    let cancelled = false;
    setPlansLoading(true);
    void getAdminPlans({ page: 1, pageSize: 200 })
      .then((r) => {
        if (cancelled) return;
        setPlans(r.items);
      })
      .catch(() => {
        if (cancelled) return;
        setPlans([]);
      })
      .finally(() => {
        if (cancelled) return;
        setPlansLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [createModalOpen, planModalOpen]);

  useEffect(() => {
    if (!createModalOpen) return;
    let cancelled = false;
    setUsersLoading(true);
    void getAdminUsers({ page: 1, pageSize: 200 })
      .then((r) => {
        if (cancelled) return;
        setUsers(r.items);
      })
      .catch(() => {
        if (cancelled) return;
        setUsers([]);
      })
      .finally(() => {
        if (cancelled) return;
        setUsersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [createModalOpen]);

  const refreshSubscriptions = async () => {
    const r = await getAdminSubscriptions({ page, pageSize, q: searchTerm.trim() || undefined, status });
    setSubscriptions(r.items);
    setTotal(r.total);
  };

  const handleCancelConfirm = async () => {
    if (!cancelId) return;
    setActionBusy(cancelId);
    try {
      await cancelAdminSubscription(cancelId);
      await refreshSubscriptions();
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar assinatura');
    } finally {
      setActionBusy(null);
      setCancelId(null);
    }
  };

  const handleReactivate = async (sub: any) => {
    setActionBusy(sub.id);
    try {
      await updateAdminSubscription(sub.id, { status: 'active' });
      await refreshSubscriptions();
    } catch (err: any) {
      alert(err.message || 'Erro ao reativar assinatura');
    } finally {
      setActionBusy(null);
    }
  };

  const handleSync = async (sub: any) => {
    setActionBusy(sub.id);
    try {
      await syncAdminSubscription(sub.id);
      await refreshSubscriptions();
    } catch (err: any) {
      alert(err.message || 'Erro ao sincronizar assinatura');
    } finally {
      setActionBusy(null);
    }
  };

  const openPlanModal = (sub: any) => {
    setPlanTarget(sub);
    setSelectedPlanId(sub.plan_id);
    setPlanModalOpen(true);
  };

  const handleChangePlan = async () => {
    if (!planTarget || !selectedPlanId) return;
    setActionBusy(planTarget.id);
    try {
      await updateAdminSubscription(planTarget.id, { planId: selectedPlanId });
      await refreshSubscriptions();
      setPlanModalOpen(false);
      setPlanTarget(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao trocar plano');
    } finally {
      setActionBusy(null);
    }
  };

  const handleCreateManual = async () => {
    if (!createUserId || !createPlanId) return;
    setActionBusy(`create:${createUserId}`);
    try {
      await createAdminManualSubscription({ userId: createUserId, planId: createPlanId, status: createStatus });
      await refreshSubscriptions();
      setCreateModalOpen(false);
      setCreateUserId('');
      setCreatePlanId('');
      setCreateStatus('active');
      setUserSearch('');
    } catch (err: any) {
      alert(err.message || 'Erro ao criar assinatura manual');
    } finally {
      setActionBusy(null);
    }
  };

  const filteredUsers = userSearch.trim()
    ? users.filter((u) => {
        const term = userSearch.trim().toLowerCase();
        return String(u.full_name || '').toLowerCase().includes(term) || String(u.email || '').toLowerCase().includes(term);
      })
    : users;

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
            <Button variant="outline" onClick={() => setCreateModalOpen(true)}>
              Nova assinatura manual
            </Button>
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
                  <th className="px-6 py-3 font-medium text-right">Ações</th>
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
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-500 hover:text-blue-600"
                          onClick={() => openPlanModal(sub)}
                          disabled={actionBusy === sub.id}
                        >
                          <Shuffle className="mr-2 h-4 w-4" />
                          Trocar
                        </Button>
                        {sub.mp_preapproval_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-500 hover:text-blue-600"
                            onClick={() => handleSync(sub)}
                            disabled={actionBusy === sub.id}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Sincronizar
                          </Button>
                        )}
                        {sub.status === 'canceled' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-600 hover:text-emerald-700"
                            onClick={() => handleReactivate(sub)}
                            disabled={actionBusy === sub.id}
                          >
                            Reativar
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setCancelId(sub.id)}
                            disabled={actionBusy === sub.id}
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
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

      <Modal
        isOpen={planModalOpen}
        onClose={() => {
          setPlanModalOpen(false);
          setPlanTarget(null);
        }}
        title="Trocar plano"
        className="max-w-lg"
      >
        <div className="space-y-4">
          <div className="text-sm text-slate-500">
            {planTarget?.user_name} • {planTarget?.user_email}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Plano</label>
            <Select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} disabled={plansLoading}>
              <option value="" disabled>Selecione um plano</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setPlanModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleChangePlan} disabled={!selectedPlanId || actionBusy === planTarget?.id}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setCreateUserId('');
          setCreatePlanId('');
          setCreateStatus('active');
          setUserSearch('');
        }}
        title="Nova assinatura manual"
        className="max-w-lg"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Buscar usuário</label>
            <Input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Nome ou email" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Usuário</label>
            <Select value={createUserId} onChange={(e) => setCreateUserId(e.target.value)} disabled={usersLoading}>
              <option value="" disabled>Selecione um usuário</option>
              {filteredUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email} • {u.email}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Plano</label>
            <Select value={createPlanId} onChange={(e) => setCreatePlanId(e.target.value)} disabled={plansLoading}>
              <option value="" disabled>Selecione um plano</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status inicial</label>
            <Select value={createStatus} onChange={(e) => setCreateStatus(e.target.value as any)}>
              <option value="active">Ativo</option>
              <option value="past_due">Em atraso</option>
              <option value="canceled">Cancelado</option>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateManual} disabled={!createUserId || !createPlanId || actionBusy?.startsWith('create:')}>
              Criar assinatura
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmationDialog
        isOpen={Boolean(cancelId)}
        onClose={() => setCancelId(null)}
        onConfirm={handleCancelConfirm}
        title="Cancelar assinatura"
        description="Deseja cancelar esta assinatura? Se houver Mercado Pago, será cancelado lá também."
        confirmText="Cancelar"
        variant="danger"
        loading={actionBusy === cancelId}
      />
    </div>
  );
}
