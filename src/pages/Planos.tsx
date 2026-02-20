import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, CreditCard, Lock, Repeat, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MarketingLayout } from "@/components/MarketingLayout";
import { PlanCard } from "@/components/PlanCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { usePlanStore } from "@/stores/planStore";
import {
  activateFreePlan,
  createCheckout,
  createTransparentSubscription,
  getMySubscription,
  getPublicConfig,
  getPublicPlans,
  type ApiError,
  type Plan,
} from "@/lib/api";
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
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const session = useAuthStore((s) => s.session);
  const mpScriptLoaded = useRef(false);
  const cardFormRef = useRef<any>(null);

  const loadMpScript = async () => {
    if (mpScriptLoaded.current) return;
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[src="https://sdk.mercadopago.com/js/v2"]');
      if (existing) {
        mpScriptLoaded.current = true;
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.async = true;
      script.onload = () => {
        mpScriptLoaded.current = true;
        resolve();
      };
      script.onerror = () => {
        reject(new Error("Falha ao carregar o SDK do Mercado Pago."));
      };
      document.body.appendChild(script);
    });
  };

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
    setCheckoutError(null);

    const picked = plans.find((p) => p.id === planId) ?? null;
    if (!picked || picked.priceCents <= 0) {
      setCheckoutPlan(null);
      setCheckoutOpen(false);
    }

    if (authStatus === "signedIn") {
      try {
        if (picked && picked.priceCents <= 0) {
          setBusy(true);
          await activateFreePlan({ planId });
          navigate("/app#plan");
          return;
        }
        const { subscription } = await getMySubscription();
        if (subscription?.status === "active") {
          if (subscription.plan.id === planId) {
            navigate("/app#plan");
            return;
          }
          const ok = window.confirm(`Trocar do plano "${subscription.plan.name}" para este plano? A troca será confirmada após o pagamento.`);
          if (!ok) return;
        }
        if (picked) {
          setCheckoutPlan(picked);
          setCheckoutOpen(true);
          return;
        }
        setBusy(true);
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

    const nextUrl = `/planos?planId=${encodeURIComponent(planId)}`;
    navigate(`/auth?mode=signup&planId=${encodeURIComponent(planId)}&next=${encodeURIComponent(nextUrl)}`);
  };

  useEffect(() => {
    if (!checkoutPlan || authStatus !== "signedIn") return;
    let cancelled = false;
    setCheckoutReady(false);
    setCheckoutError(null);
    void (async () => {
      try {
        const config = await getPublicConfig();
        if (cancelled) return;
        if (!config.mpPublicKey) {
          setCheckoutError("Chave pública do Mercado Pago não configurada.");
          return;
        }
        await loadMpScript();
        if (cancelled) return;
        const Mp = (window as any)?.MercadoPago;
        if (!Mp) {
          setCheckoutError("SDK do Mercado Pago indisponível.");
          return;
        }
        if (cardFormRef.current?.unmount) {
          cardFormRef.current.unmount();
          cardFormRef.current = null;
        }
        const amount = (checkoutPlan.priceCents / 100).toFixed(2);
        const mp = new Mp(config.mpPublicKey, { locale: "pt-BR" });
        cardFormRef.current = mp.cardForm({
          amount,
          autoMount: true,
          form: {
            id: "mp-card-form",
            cardholderName: { id: "form-cardholderName", placeholder: "Nome no cartão" },
            cardholderEmail: { id: "form-cardholderEmail", placeholder: "E-mail" },
            cardNumber: { id: "form-cardNumber", placeholder: "Número do cartão" },
            expirationDate: { id: "form-expirationDate", placeholder: "MM/AA" },
            securityCode: { id: "form-securityCode", placeholder: "CVV" },
            installments: { id: "form-installments", placeholder: "Parcelas" },
            identificationType: { id: "form-identificationType", placeholder: "Tipo" },
            identificationNumber: { id: "form-identificationNumber", placeholder: "Documento" },
            issuer: { id: "form-issuer", placeholder: "Banco" },
          },
          callbacks: {
            onFormMounted: () => {
              if (!cancelled) setCheckoutReady(true);
            },
            onSubmit: async (event: any) => {
              event.preventDefault();
              const data = cardFormRef.current?.getCardFormData?.();
              if (!data?.token) {
                setCheckoutError("Não foi possível validar o cartão.");
                return;
              }
              setCheckoutBusy(true);
              setCheckoutError(null);
              try {
                await createTransparentSubscription({
                  planId: checkoutPlan.id,
                  token: data.token,
                  paymentMethodId: data.paymentMethodId,
                  issuerId: data.issuerId,
                  installments: data.installments ? Number(data.installments) : undefined,
                  identificationType: data.identificationType,
                  identificationNumber: data.identificationNumber,
                  payerEmail: data.cardholderEmail ?? session?.email ?? undefined,
                });
                navigate("/app#plan");
              } catch (e) {
                const err = e as Partial<ApiError> | null;
                setCheckoutError(err?.message ?? "Não foi possível concluir o pagamento.");
              } finally {
                setCheckoutBusy(false);
              }
            },
          },
        });
      } catch (e) {
        const err = e as Partial<ApiError> | null;
        setCheckoutError(err?.message ?? "Não foi possível iniciar o checkout.");
      }
    })();
    return () => {
      cancelled = true;
      if (cardFormRef.current?.unmount) {
        cardFormRef.current.unmount();
        cardFormRef.current = null;
      }
    };
  }, [authStatus, checkoutPlan, session?.email]);

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
            <Link to={`/auth?mode=login&next=${encodeURIComponent("/planos")}`}>
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
              actionLabel={
                authStatus === "signedIn"
                  ? p.priceCents <= 0
                    ? "Ativar grátis"
                    : "Assinar este plano"
                  : "Escolher plano"
              }
            />
          ))}
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <Modal
          isOpen={authStatus === "signedIn" && checkoutOpen && Boolean(checkoutPlan)}
          onClose={() => {
            setCheckoutOpen(false);
            setCheckoutPlan(null);
          }}
          title="Pagamento seguro"
          size="fullscreen"
        >
          {checkoutPlan ? (
            <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  <ShieldCheck className="h-4 w-4" />
                  Ambiente protegido
                </div>
                <div className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Plano {checkoutPlan.name}
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Cobrança recorrente mensal
                </div>
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="text-sm text-slate-500">Valor mensal</div>
                  <div className="mt-1 text-3xl font-semibold text-slate-900 dark:text-slate-100">
                    R$ {(checkoutPlan.priceCents / 100).toFixed(2).replace(".", ",")}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className="gap-1">
                      <Lock className="h-3 w-3" />
                      Dados criptografados
                    </Badge>
                    <Badge className="gap-1">
                      <CreditCard className="h-3 w-3" />
                      Cartão protegido
                    </Badge>
                    <Badge className="gap-1">
                      <Repeat className="h-3 w-3" />
                      Cancelamento imediato
                    </Badge>
                  </div>
                </div>
                <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">
                  O pagamento é processado pelo Mercado Pago. Nenhum dado sensível fica salvo no SISFEC.
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Informe os dados do cartão
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Você verá a confirmação assim que o pagamento for aprovado.
                </div>

                <form id="mp-card-form" className="mt-6 grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nome no cartão</div>
                      <Input id="form-cardholderName" name="cardholderName" autoComplete="cc-name" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">E-mail</div>
                      <Input id="form-cardholderEmail" name="cardholderEmail" autoComplete="email" defaultValue={session?.email ?? ""} />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Número do cartão</div>
                    <Input id="form-cardNumber" name="cardNumber" autoComplete="cc-number" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Validade</div>
                      <Input id="form-expirationDate" name="expirationDate" autoComplete="cc-exp" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">CVV</div>
                      <Input id="form-securityCode" name="securityCode" autoComplete="cc-csc" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Parcelas</div>
                      <select
                        id="form-installments"
                        name="installments"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Banco</div>
                      <select
                        id="form-issuer"
                        name="issuer"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Documento</div>
                      <select
                        id="form-identificationType"
                        name="identificationType"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Número do documento</div>
                      <Input id="form-identificationNumber" name="identificationNumber" />
                    </div>
                  </div>
                  {checkoutError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                      {checkoutError}
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="text-xs text-slate-500">
                      {checkoutReady ? "Pagamento seguro com Mercado Pago" : "Carregando formulário de pagamento..."}
                    </div>
                    <Button id="form-submit" type="submit" disabled={checkoutBusy || !checkoutReady}>
                      {checkoutBusy ? "Processando..." : "Confirmar assinatura"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </Modal>

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
              <Link to={`/auth?mode=signup&next=${encodeURIComponent("/planos")}`}>
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
