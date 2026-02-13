import type { ReactNode } from "react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { subscriptionHasFeature, type FeatureKey } from "@/lib/entitlements";
import { Button } from "@/components/ui/Button";

export function FeatureGate({ feature, children }: { feature: FeatureKey; children: ReactNode }) {
  const subStatus = useSubscriptionStore((s) => s.status);
  const subscription = useSubscriptionStore((s) => s.subscription);
  const load = useSubscriptionStore((s) => s.load);

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

  const allowed = subscriptionHasFeature(subscription, feature);
  if (!allowed) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="text-lg font-semibold text-slate-900">Recurso não disponível no seu plano</div>
        <div className="mt-1 text-sm text-slate-600">Altere seu plano para liberar este recurso.</div>
        <div className="mt-4 flex items-center gap-2">
          <Link to="/app#plan">
            <Button className="bg-blue-600 hover:bg-blue-700">Ver meu plano</Button>
          </Link>
          <Link to="/planos">
            <Button variant="outline">Ver planos</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
