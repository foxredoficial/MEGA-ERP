import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/api";
import { formatBRLFromCents } from "@/lib/money";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function PlanCard({
  plan,
  onSelect,
  selected,
  actionLabel,
}: {
  plan: Plan;
  selected?: boolean;
  onSelect: (planId: string) => void;
  actionLabel?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-white p-6 shadow-sm transition hover:shadow-md dark:bg-zinc-950",
        plan.isFeatured
          ? "border-blue-300/70 ring-1 ring-blue-500/20 dark:border-blue-500/30"
          : "border-zinc-200 dark:border-zinc-800",
        selected && "ring-2 ring-emerald-500/25"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            {plan.isFeatured ? <Badge tone="blue">Recomendado</Badge> : null}
          </div>
          {plan.description && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{plan.description}</p>
          )}
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-bold">{formatBRLFromCents(plan.priceCents)}</div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">/mês</div>
          </div>
        </div>

        {selected ? <Badge tone="green">Selecionado</Badge> : null}
      </div>

      <ul className="mt-5 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-200">
            <Check className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <Button className="w-full" variant={plan.isFeatured ? "primary" : "secondary"} onClick={() => onSelect(plan.id)}>
          {actionLabel ?? "Escolher plano"}
        </Button>
      </div>
    </div>
  );
}
