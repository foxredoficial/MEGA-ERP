import type { ReactNode } from "react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { subscriptionHasFeature, type FeatureKey } from "@/lib/entitlements";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/authStore";

export function FeatureGate({ feature, children }: { feature: FeatureKey; children: ReactNode }) {
  const subStatus = useSubscriptionStore((s) => s.status);
  const subscription = useSubscriptionStore((s) => s.subscription);
  const load = useSubscriptionStore((s) => s.load);
  const role = useAuthStore((s) => s.session?.role);

  useEffect(() => {
    if (subStatus === "idle") void load();
  }, [load, subStatus]);

  if (subStatus === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (role === "admin") return <>{children}</>;

  const allowed = subscriptionHasFeature(subscription, feature);
  if (!allowed) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Lock className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="text-lg font-semibold text-slate-900">Recurso não disponível no seu plano</div>
            <div className="mt-1 text-sm text-slate-600">
              Atualize seu plano para liberar este recurso e acessar todas as funcionalidades.
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link to="/app#plan">
                <Button className="bg-blue-600 hover:bg-blue-700">Ver meu plano</Button>
              </Link>
              <Link to="/planos">
                <Button variant="outline">Ver planos</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
