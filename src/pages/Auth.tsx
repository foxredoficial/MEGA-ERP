import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePlanStore } from "@/stores/planStore";
import { useAuthStore } from "@/stores/authStore";
import { getPublicPlans, type Plan } from "@/lib/api";

type Mode = "login" | "signup" | "forgot";

function getMode(raw: string | null): Mode {
  if (raw === "signup" || raw === "forgot" || raw === "login") return raw;
  return "login";
}

import { ModernAuthLayout } from "@/components/ModernAuthLayout";

export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const mode = getMode(params.get("mode"));
  const next = params.get("next") ?? "/app";
  const oauthError = params.get("oauthError");
  const planIdFromQuery = params.get("planId");
  const selectedPlanId = usePlanStore((s) => s.selectedPlanId);
  const setSelectedPlanId = usePlanStore((s) => s.setSelectedPlanId);

  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await getPublicPlans();
        if (cancelled) return;
        setPlans(list);
      } catch {
        if (cancelled) return;
        setPlans([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const planId = useMemo(() => {
    if (planIdFromQuery && plans.some((p) => p.id === planIdFromQuery)) return planIdFromQuery;
    if (selectedPlanId && plans.some((p) => p.id === selectedPlanId)) return selectedPlanId;
    return null;
  }, [planIdFromQuery, plans, selectedPlanId]);

  const signUp = useAuthStore((s) => s.signUp);
  const signIn = useAuthStore((s) => s.signIn);
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const authError = useAuthStore((s) => s.error);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!oauthError) return;
    if (oauthError === "google_config") setLocalMessage("Login com Google não está configurado.");
    else setLocalMessage("Não foi possível entrar com Google. Tente novamente.");
  }, [oauthError]);

  const canSubmitLogin = email.includes("@");
  const canSubmitSignup =
    email.includes("@") && password.length >= 8 && fullName.trim().length >= 2 && companyName.trim().length >= 2 && acceptTerms;

  const handleSubmit = async () => {
    setLocalMessage(null);
    setBusy(true);
    try {
      if (planId) setSelectedPlanId(planId);

      if (mode === "login") {
        const ok = await signIn({ email, password });
        if (ok) {
           if (next.startsWith('http')) {
             window.location.href = next;
           } else {
             navigate(next);
           }
        }
        return;
      }

      if (mode === "signup") {
        const ok = await signUp({ email, password, fullName, companyName, planId });
        if (ok) navigate("/app");
        return;
      }

      const ok = await requestPasswordReset(email);
      if (ok) setLocalMessage("Enviamos um link de recuperação para seu email.");
    } finally {
      setBusy(false);
    }
  };

  const getTitle = () => {
    if (mode === "signup") return "Criar sua conta";
    if (mode === "forgot") return "Recuperar senha";
    return "Acesse sua conta";
  };

  const getSubtitle = () => {
    if (mode === "signup") return "Comece seus 7 dias de teste grátis.";
    if (mode === "forgot") return "Enviaremos um link para seu email.";
    return "Bem-vindo de volta ao MegaERP.";
  };

  return (
    <ModernAuthLayout title={getTitle()} subtitle={getSubtitle()}>
      <div className="space-y-6">
        {mode !== "forgot" && (
          <Button
            variant="secondary"
            className="w-full h-11 justify-center gap-2 font-medium text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
            disabled={busy}
            onClick={() => {
              const url = `/api/auth/google/start?next=${encodeURIComponent(next)}${planId ? `&planId=${encodeURIComponent(planId)}` : ""}`;
              window.location.href = url;
            }}
          >
            <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12.0003 20.45c4.6587 0 8.3664-3.6669 8.4475-8.3248H12.0003v-4.1332h12.5532C24.8722 9.5898 25.043 11.238 25.043 13.0456c0 7.3773-5.2638 12.5944-12.2857 12.5944-7.227 0-13.0857-5.8587-13.0857-13.0857S5.5303-.53 12.7573-.53c3.676 0 6.9453 1.3653 9.456 3.6558l-3.3283 3.238C17.7806 5.378 15.6552 4.148 12.7573 4.148c-5.068 0-9.2505 3.9614-9.2505 8.992s4.1825 8.992 9.2505 8.992z" fill="currentColor" />
              <path d="M12.7573 4.148c2.898 0 5.0233 1.23 6.1277 2.2158l3.3283-3.238C19.7026.8447 16.4333-.53 12.7573-.53 5.5303-.53-.3284 5.3287-.3284 12.5557h4.2427c0-5.0306 4.1825-8.992 9.2505-8.992z" fill="#EA4335" />
            </svg>
            Entrar com Google
          </Button>
        )}

        {mode !== "forgot" && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-slate-950 px-2 text-xs uppercase text-slate-500">
                Ou continue com email
              </span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {mode === "signup" && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-900 dark:text-slate-100">Nome Completo</label>
                  <Input 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)} 
                    placeholder="João Silva"
                    className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-900 dark:text-slate-100">Empresa</label>
                  <Input 
                    value={companyName} 
                    onChange={(e) => setCompanyName(e.target.value)} 
                    placeholder="Minha Loja"
                    className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-900 dark:text-slate-100">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="pl-10 h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" 
                placeholder="voce@empresa.com" 
              />
            </div>
          </div>

          {mode !== "forgot" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-900 dark:text-slate-100">Senha</label>
                {mode === "login" && (
                  <Link 
                    to={`/auth?mode=forgot${planId ? `&planId=${encodeURIComponent(planId)}` : ""}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                  >
                    Esqueceu a senha?
                  </Link>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          {mode === "signup" && (
            <div className="flex items-start gap-3">
              <div className="flex h-6 items-center">
                <input
                  id="terms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:ring-offset-slate-950"
                />
              </div>
              <label htmlFor="terms" className="text-sm text-slate-500 dark:text-slate-400">
                Ao criar uma conta, você concorda com nossos{" "}
                <Link to="/termos" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                  Termos de Uso
                </Link>{" "}
                e{" "}
                <Link to="/privacidade" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                  Política de Privacidade
                </Link>
                .
              </label>
            </div>
          )}

          {authError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/10 dark:text-red-400">
              {authError}
            </div>
          )}

          {localMessage && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-600 dark:bg-emerald-900/10 dark:text-emerald-400">
              {localMessage}
            </div>
          )}

          <Button
            className="w-full h-11 text-base shadow-lg shadow-blue-600/20"
            size="lg"
            disabled={
              busy ||
              (mode === "login" ? !canSubmitLogin : mode === "signup" ? !canSubmitSignup : !email.includes("@"))
            }
            onClick={handleSubmit}
          >
            {busy ? (
              "Processando..."
            ) : mode === "signup" ? (
              "Criar minha conta"
            ) : mode === "forgot" ? (
              "Enviar link de recuperação"
            ) : (
              "Entrar na conta"
            )}
            {!busy && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>

        <div className="text-center text-sm">
          {mode === "signup" ? (
            <span className="text-slate-500 dark:text-slate-400">
              Já tem uma conta?{" "}
              <Link 
                to={`/auth?mode=login${planId ? `&planId=${encodeURIComponent(planId)}` : ""}`}
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                Fazer login
              </Link>
            </span>
          ) : mode === "login" ? (
            <span className="text-slate-500 dark:text-slate-400">
              Não tem uma conta?{" "}
              <Link 
                to={`/auth?mode=signup${planId ? `&planId=${encodeURIComponent(planId)}` : ""}`}
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                Teste grátis por 7 dias
              </Link>
            </span>
          ) : (
            <Link 
              to={`/auth?mode=login${planId ? `&planId=${encodeURIComponent(planId)}` : ""}`}
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              Voltar para o login
            </Link>
          )}
        </div>
      </div>
    </ModernAuthLayout>
  );
}
