import { useEffect, useState } from 'react';
import { getAdminPlans, createPlan, updatePlan } from '@/lib/api_admin';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Check, X, Edit, Plus, Save, Users, Package, FileText, LayoutList, DollarSign, Star, Power, Infinity as InfinityIcon } from 'lucide-react';

type Plan = {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  features_json: string | string[];
  max_users: number;
  max_products: number;
  max_invoices: number;
  is_featured: number;
  is_active: number;
};

export function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Plan>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = () => {
    setLoading(true);
    getAdminPlans()
      .then((data) => {
        const parsed = data.map(p => ({
          ...p,
          features_json: typeof p.features_json === 'string' ? JSON.parse(p.features_json) : p.features_json
        }));
        setPlans(parsed as any);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const handleEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setEditForm({ ...plan });
    setIsCreating(false);
  };

  const handleCreate = () => {
    setEditingId('new');
    setEditForm({
      name: '',
      price_cents: 0,
      features_json: [],
      max_users: -1,
      max_products: -1,
      max_invoices: -1,
      is_featured: 0,
      is_active: 1
    });
    setIsCreating(true);
  };

  const handleAddFeature = () => {
    if (!newFeature.trim()) return;
    const currentFeatures = Array.isArray(editForm.features_json) ? editForm.features_json : [];
    setEditForm({
      ...editForm,
      features_json: [...currentFeatures, newFeature.trim()]
    });
    setNewFeature('');
  };

  const handleRemoveFeature = (index: number) => {
    const currentFeatures = Array.isArray(editForm.features_json) ? editForm.features_json : [];
    setEditForm({
      ...editForm,
      features_json: currentFeatures.filter((_, i) => i !== index)
    });
  };

  const handleSave = async () => {
    try {
      const dataToSave = {
        name: editForm.name || '',
        price_cents: editForm.price_cents || 0,
        description: editForm.description,
        features_json: Array.isArray(editForm.features_json) ? editForm.features_json : [],
        max_users: editForm.max_users,
        max_products: editForm.max_products,
        max_invoices: editForm.max_invoices,
        is_featured: !!editForm.is_featured,
        is_active: !!editForm.is_active
      };

      if (isCreating) {
        await createPlan(dataToSave);
      } else if (editingId) {
        await updatePlan(editingId, dataToSave);
      }
      setEditingId(null);
      setEditForm({});
      setIsCreating(false);
      loadPlans();
    } catch (err: any) {
      alert(err.message || "Erro ao salvar");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
    setIsCreating(false);
    setNewFeature('');
  };

  const handleToggleActive = async (plan: Plan) => {
    try {
      await updatePlan(plan.id, { is_active: !plan.is_active });
      setPlans(plans.map(p => p.id === plan.id ? { ...p, is_active: p.is_active ? 0 : 1 } : p));
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading && !plans.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        Erro: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Planos</h2>
          <p className="text-slate-500 dark:text-slate-400">Gerencie os planos de assinatura disponíveis.</p>
        </div>
        {!editingId && (
          <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Novo Plano
          </Button>
        )}
      </div>

      <Modal 
        isOpen={!!editingId || isCreating} 
        onClose={handleCancel} 
        title={isCreating ? 'Novo Plano' : 'Editar Plano'}
        className="max-w-3xl"
      >
        <div className="space-y-8">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Informações Básicas</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nome do Plano</label>
                <Input 
                  value={editForm.name || ''} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})} 
                  placeholder="Ex: Pro Mensal"
                  className="bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Preço Mensal</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    type="number"
                    className="pl-9 bg-slate-50 dark:bg-slate-900"
                    value={editForm.price_cents ? editForm.price_cents / 100 : 0} 
                    onChange={e => setEditForm({...editForm, price_cents: Math.round(parseFloat(e.target.value) * 100)})} 
                  />
                  <div className="absolute right-3 top-2.5 text-xs text-slate-400">BRL</div>
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Descrição</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:border-slate-800"
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Breve descrição do plano..."
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800" />


          {/* Limites */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Limites do Sistema</h3>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Max. Usuários</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
                      checked={editForm.max_users === -1}
                      onChange={(e) => setEditForm({...editForm, max_users: e.target.checked ? -1 : 1})}
                    />
                    <span className="text-xs text-slate-500">Ilimitado</span>
                  </label>
                </div>
                <div className="relative">
                  <Users className={`absolute left-3 top-2.5 h-4 w-4 ${editForm.max_users === -1 ? 'text-slate-300' : 'text-slate-400'}`} />
                  <Input 
                    type="number"
                    className={`pl-9 bg-slate-50 dark:bg-slate-900 ${editForm.max_users === -1 ? 'text-slate-400' : ''}`}
                    value={editForm.max_users === -1 ? '' : (editForm.max_users || 1)} 
                    disabled={editForm.max_users === -1}
                    onChange={e => setEditForm({...editForm, max_users: parseInt(e.target.value)})} 
                    placeholder={editForm.max_users === -1 ? "Ilimitado" : ""}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Max. Produtos</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
                      checked={editForm.max_products === -1}
                      onChange={(e) => setEditForm({...editForm, max_products: e.target.checked ? -1 : 100})}
                    />
                    <span className="text-xs text-slate-500">Ilimitado</span>
                  </label>
                </div>
                <div className="relative">
                  <Package className={`absolute left-3 top-2.5 h-4 w-4 ${editForm.max_products === -1 ? 'text-slate-300' : 'text-slate-400'}`} />
                  <Input 
                    type="number"
                    className={`pl-9 bg-slate-50 dark:bg-slate-900 ${editForm.max_products === -1 ? 'text-slate-400' : ''}`}
                    value={editForm.max_products === -1 ? '' : (editForm.max_products || 100)} 
                    disabled={editForm.max_products === -1}
                    onChange={e => setEditForm({...editForm, max_products: parseInt(e.target.value)})} 
                    placeholder={editForm.max_products === -1 ? "Ilimitado" : ""}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Max. Notas</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
                      checked={editForm.max_invoices === -1}
                      onChange={(e) => setEditForm({...editForm, max_invoices: e.target.checked ? -1 : 50})}
                    />
                    <span className="text-xs text-slate-500">Ilimitado</span>
                  </label>
                </div>
                <div className="relative">
                  <FileText className={`absolute left-3 top-2.5 h-4 w-4 ${editForm.max_invoices === -1 ? 'text-slate-300' : 'text-slate-400'}`} />
                  <Input 
                    type="number"
                    className={`pl-9 bg-slate-50 dark:bg-slate-900 ${editForm.max_invoices === -1 ? 'text-slate-400' : ''}`}
                    value={editForm.max_invoices === -1 ? '' : (editForm.max_invoices || 50)} 
                    disabled={editForm.max_invoices === -1}
                    onChange={e => setEditForm({...editForm, max_invoices: parseInt(e.target.value)})} 
                    placeholder={editForm.max_invoices === -1 ? "Ilimitado" : ""}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800" />

          {/* Funcionalidades */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Funcionalidades</h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LayoutList className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  value={newFeature}
                  onChange={e => setNewFeature(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddFeature()}
                  placeholder="Adicionar funcionalidade (ex: Suporte 24/7)"
                  className="pl-9 bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <Button type="button" onClick={handleAddFeature} variant="secondary">
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
            
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              {(!editForm.features_json || (Array.isArray(editForm.features_json) && editForm.features_json.length === 0)) ? (
                <div className="flex flex-col items-center justify-center py-6 text-slate-500">
                  <LayoutList className="mb-2 h-8 w-8 opacity-20" />
                  <p className="text-sm">Nenhuma funcionalidade adicionada ainda.</p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {Array.isArray(editForm.features_json) && editForm.features_json.map((feature: string, i: number) => (
                    <div key={i} className="group flex items-center justify-between rounded-md border border-slate-200 bg-white p-2.5 text-sm shadow-sm transition-all hover:border-blue-200 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-900">
                      <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Check className="h-4 w-4 text-green-500" />
                        {feature}
                      </span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        className="h-6 w-6 p-0 text-slate-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                        onClick={() => handleRemoveFeature(i)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800" />

          {/* Configurações Finais */}
          <div className="flex items-center gap-8 rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
            <label className="flex cursor-pointer items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${editForm.is_featured ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-slate-200 text-slate-400 dark:bg-slate-800'}`}>
                <Star className="h-5 w-5" fill={editForm.is_featured ? "currentColor" : "none"} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Plano em Destaque</span>
                <span className="text-xs text-slate-500">Aparecerá com ênfase na lista</span>
              </div>
              <input 
                type="checkbox" 
                className="hidden"
                checked={!!editForm.is_featured}
                onChange={e => setEditForm({...editForm, is_featured: e.target.checked ? 1 : 0})}
              />
            </label>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />

            <label className="flex cursor-pointer items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${editForm.is_active ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-200 text-slate-400 dark:bg-slate-800'}`}>
                <Power className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Status do Plano</span>
                <span className="text-xs text-slate-500">{editForm.is_active ? 'Visível para clientes' : 'Oculto para clientes'}</span>
              </div>
              <input 
                type="checkbox" 
                className="hidden"
                checked={editForm.is_active !== 0}
                onChange={e => setEditForm({...editForm, is_active: e.target.checked ? 1 : 0})}
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={handleCancel} className="w-24">Cancelar</Button>
            <Button onClick={handleSave} className="w-32 bg-blue-600 hover:bg-blue-700">
              <Save className="mr-2 h-4 w-4" />
              Salvar
            </Button>
          </div>
        </div>
      </Modal>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className={`flex flex-col overflow-hidden transition-all hover:shadow-lg ${!plan.is_active ? 'opacity-60 grayscale' : ''} ${plan.is_featured ? 'border-blue-500 ring-1 ring-blue-500/20' : ''}`}>
            <CardHeader className="flex flex-row items-start justify-between bg-slate-50/50 pb-6 dark:bg-slate-900/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  {!!plan.is_featured && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400">Destaque</Badge>}
                </div>
                {plan.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[40px]">{plan.description}</p>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  R$ {plan.price_cents / 100}
                </div>
                <span className="text-xs text-slate-500">/mês</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-6 pt-6">
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900">
                  <div className="mb-1 flex justify-center text-blue-500">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="font-semibold">{plan.max_users === -1 ? <InfinityIcon className="h-5 w-5 mx-auto" /> : plan.max_users}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Usuários</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900">
                  <div className="mb-1 flex justify-center text-purple-500">
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="font-semibold">{plan.max_products === -1 ? <InfinityIcon className="h-5 w-5 mx-auto" /> : plan.max_products}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Produtos</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900">
                  <div className="mb-1 flex justify-center text-green-500">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="font-semibold">{plan.max_invoices === -1 ? <InfinityIcon className="h-5 w-5 mx-auto" /> : plan.max_invoices}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Notas/mês</div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <LayoutList className="h-3 w-3" />
                  Funcionalidades
                </h4>
                <ul className="space-y-2">
                  {Array.isArray(plan.features_json) && plan.features_json.slice(0, 5).map((feature: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      <span className="line-clamp-1">{feature}</span>
                    </li>
                  ))}
                  {Array.isArray(plan.features_json) && plan.features_json.length > 5 && (
                    <li className="text-xs text-slate-400 pl-6">
                      + {plan.features_json.length - 5} outras...
                    </li>
                  )}
                </ul>
              </div>

              <div className="mt-auto flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => handleEdit(plan)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button 
                  variant={plan.is_active ? "ghost" : "primary"} 
                  className={plan.is_active ? "text-red-500 hover:bg-red-50 hover:text-red-600" : ""}
                  onClick={() => handleToggleActive(plan)}
                >
                  {plan.is_active ? 'Desativar' : 'Ativar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
