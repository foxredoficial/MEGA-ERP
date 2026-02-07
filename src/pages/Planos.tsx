import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MarketingLayout } from "@/components/MarketingLayout";
import { PlanCard } from "@/components/PlanCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { usePlanStore } from "@/stores/planStore";
import { createCheckout, getPublicPlans, type ApiError, type Plan } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

export default function Planos() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const selectedPlanId = usePlanStore((s) => s.selectedPlanId);
  const setSelectedPlanId = usePlanStore((s) => s.setSelectedPlanId);
  const authStatus = useAuthStore((s) => s.status);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    void (async () => {
      try {
        const data = await getPublicPlans();
        if (cancelled) return;
        setPlans(data);
      } catch (e) {
        if (cancelled) return;
        const err = e as Partial<ApiError> | null;
        setError(err?.message ?? "Não foi possível carregar os planos.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const presetPlanId = params.get("planId");
  const selected = useMemo(() => {
    if (presetPlanId && plans.some((p) => p.id === presetPlanId)) return presetPlanId;
    if (selectedPlanId && plans.some((p) => p.id === selectedPlanId)) return selectedPlanId;
    return null;
  }, [plans, presetPlanId, selectedPlanId]);

  const uniqueFeatures = useMemo(() => {
    const set = new Set<string>();
    for (const p of plans) for (const f of p.features) set.add(f);
    return Array.from(set.values());
  }, [plans]);

  const onSelect = async (planId: string) => {
    setSelectedPlanId(planId);
    setError(null);

    if (authStatus === "signedIn") {
      setBusy(true);
      try {
        const { initPoint } = await createCheckout({ planId });
        window.location.href = initPoint;
      } catch (e) {
        const err = e as Partial<ApiError> | null;
        setError(err?.message ?? "Não foi possível iniciar o checkout.");
      } finally {
        setBusy(false);
      }
      return;
    }

    navigate(`/auth?mode=signup&planId=${encodeURIComponent(planId)}`);
  };

  return (
    <MarketingLayout>
      <section className="container px-4 py-12 md:py-16">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white md:text-4xl">Planos</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Compare recursos e escolha o plano ideal para iniciar. Você pode alterar depois pelo seu painel.
            </p>
          </div>
          {authStatus === "signedIn" ? (
            <Link to="/app">
              <Button variant="secondary">Ir para área do cliente</Button>
            </Link>
          ) : (
            <Link to="/auth?mode=login">
              <Button variant="secondary">Já tenho conta</Button>
            </Link>
          )}
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              onSelect={onSelect}
              selected={selected === p.id}
              actionLabel={authStatus === "signedIn" ? "Assinar com Mercado Pago" : "Escolher plano"}
            />
          ))}
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {!error && plans.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            Nenhum plano disponível no momento.
          </div>
        ) : null}

        {plans.length > 1 && uniqueFeatures.length > 0 ? (
          <div className="mt-14">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">Comparação</h2>
              <Badge>Planos</Badge>
            </div>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div
                className="grid border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400"
                style={{ gridTemplateColumns: `minmax(240px, 1fr) repeat(${plans.length}, minmax(160px, 220px))` }}
              >
                <div>Recurso</div>
                {plans.map((p) => (
                  <div key={p.id}>{p.name}</div>
                ))}
              </div>
              {uniqueFeatures.map((feature) => (
                <div
                  key={feature}
                  className="grid items-center px-4 py-4 text-sm text-slate-700 even:bg-slate-50 dark:text-slate-200 dark:even:bg-slate-900"
                  style={{ gridTemplateColumns: `minmax(240px, 1fr) repeat(${plans.length}, minmax(160px, 220px))` }}
                >
                  <div className="font-medium text-slate-900 dark:text-slate-100">{feature}</div>
                  {plans.map((p) => (
                    <div key={`${p.id}:${feature}`} className="flex items-center gap-2">
                      {p.features.includes(feature) ? (
                        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-14 rounded-3xl border border-slate-200 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="text-sm font-semibold">Precisa de algo específico?</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Fale com a equipe para alinhar implantação, migração e necessidades do seu negócio.
              </div>
            </div>
            {authStatus === "signedIn" ? (
              <Link to="/app">
                <Button disabled={busy}>
                  {busy ? "Aguarde…" : "Abrir minha conta"} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/auth?mode=signup">
                <Button disabled={busy}>
                  {busy ? "Aguarde…" : "Criar conta"} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
