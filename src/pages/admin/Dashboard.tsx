import { useEffect, useMemo, useState } from 'react';
import { getAdminDashboardAnalytics, getAdminStats, type AdminDashboardAnalytics } from '@/lib/api_admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Users, CreditCard, TrendingUp, Activity } from 'lucide-react';
import { toLocalIsoDate } from '@/lib/utils';
import { AdvancedDateFilter } from '@/components/filters/AdvancedDateFilter';
import { computeCompare, computePreset, formatRangeLabel, suggestedGranularity, type DateFilterValue } from '@/components/filters/dateRange';
import { SeriesChart } from '@/pages/Dashboard/charts/SeriesChart';

export function Dashboard() {
  const [stats, setStats] = useState<{
    users: number;
    activeSubscriptions: number;
    recentUsers?: Array<{ id: string; full_name: string; email: string; created_at: string }>;
  }>({ users: 0, activeSubscriptions: 0 });
  const [analytics, setAnalytics] = useState<AdminDashboardAnalytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<DateFilterValue>(() => {
    const preset = 'this_month' as const;
    const range = computePreset(preset);
    return {
      preset,
      range,
      granularity: suggestedGranularity(range),
      compare: { mode: 'none' },
    };
  });

  const compareRange = useMemo(() => {
    if (filter.compare.mode === 'custom') return filter.compare.range;
    return computeCompare(filter.range, filter.compare.mode);
  }, [filter.compare.mode, filter.compare.range, filter.range]);

  const titlePeriod = useMemo(() => formatRangeLabel(filter.range), [filter.range]);
  const titleCompare = useMemo(() => (compareRange ? formatRangeLabel(compareRange) : null), [compareRange]);
  const chartPeriodLabel = useMemo(() => {
    const parts: string[] = [`Período: ${titlePeriod}`];
    if (titleCompare) parts.push(`Comparação: ${titleCompare}`);
    return parts.join(' · ');
  }, [titleCompare, titlePeriod]);

  const adminGranularity = useMemo(() => {
    if (filter.granularity === 'hour') return 'day' as const;
    return filter.granularity as 'day' | 'week' | 'month';
  }, [filter.granularity]);

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setLoadingAnalytics(true);
    setAnalyticsError(null);
    getAdminDashboardAnalytics({
      start: toLocalIsoDate(filter.range.start),
      end: toLocalIsoDate(filter.range.end),
      granularity: adminGranularity,
      compareStart: compareRange ? toLocalIsoDate(compareRange.start) : undefined,
      compareEnd: compareRange ? toLocalIsoDate(compareRange.end) : undefined,
    })
      .then(setAnalytics)
      .catch((err) => setAnalyticsError(err.message))
      .finally(() => setLoadingAnalytics(false));
  }, [adminGranularity, compareRange, filter.range.end, filter.range.start]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
        Erro ao carregar dados: {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Dashboard</h2>
        <p className="text-slate-500 dark:text-slate-400">Visão geral do sistema e métricas principais.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.kpis.current.totalUsers ?? stats.users}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              +20.1% em relação ao mês passado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
            <CreditCard className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.kpis.current.activeSubscriptions ?? stats.activeSubscriptions}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              +15% em relação ao mês passado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cadastros no período</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.kpis.current.signups ?? '-'}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{chartPeriodLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas iniciadas</CardTitle>
            <Activity className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.kpis.current.subscriptionsStarted ?? '-'}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{chartPeriodLabel}</p>
          </CardContent>
        </Card>
      </div>

      {loadingAnalytics ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : analyticsError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
          Erro ao carregar analytics: {analyticsError}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <SeriesChart
            title="Cadastros"
            subtitle={chartPeriodLabel}
            actions={<AdvancedDateFilter label="Data" value={filter} onChange={setFilter} variant="icon" size="sm" showLabelInChip={false} showClear={false} allowedGranularities={['day','week','month']} />}
            data={analytics?.series.signups ?? []}
            xKey="t"
            currentKey="current"
            compareKey={titleCompare ? 'compare' : undefined}
            valueFormat="number"
          />
          <SeriesChart
            title="Assinaturas ativas (evolução)"
            subtitle={chartPeriodLabel}
            actions={<AdvancedDateFilter label="Data" value={filter} onChange={setFilter} variant="icon" size="sm" showLabelInChip={false} showClear={false} allowedGranularities={['day','week','month']} />}
            data={analytics?.series.activeSubscriptions ?? []}
            xKey="t"
            currentKey="current"
            compareKey={titleCompare ? 'compare' : undefined}
            valueFormat="number"
          />
          <SeriesChart
            title="Assinaturas iniciadas"
            subtitle={chartPeriodLabel}
            actions={<AdvancedDateFilter label="Data" value={filter} onChange={setFilter} variant="icon" size="sm" showLabelInChip={false} showClear={false} allowedGranularities={['day','week','month']} />}
            data={analytics?.series.subscriptionsStarted ?? []}
            xKey="t"
            currentKey="current"
            compareKey={titleCompare ? 'compare' : undefined}
            valueFormat="number"
          />
          <SeriesChart
            title="Assinaturas encerradas"
            subtitle={chartPeriodLabel}
            actions={<AdvancedDateFilter label="Data" value={filter} onChange={setFilter} variant="icon" size="sm" showLabelInChip={false} showClear={false} allowedGranularities={['day','week','month']} />}
            data={analytics?.series.subscriptionsEnded ?? []}
            xKey="t"
            currentKey="current"
            compareKey={titleCompare ? 'compare' : undefined}
            valueFormat="number"
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Usuários Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentUsers?.map((user) => (
              <div key={user.id} className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <span className="font-semibold">{user.full_name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{user.full_name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                  </div>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
            {(!stats.recentUsers || stats.recentUsers.length === 0) && (
              <p className="text-center text-slate-500">Nenhum usuário recente.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
