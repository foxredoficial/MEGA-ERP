import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "blue" | "green" | "amber" | "red" | "slate";
};

export function DashboardKpiCard({ label, value, hint, icon: Icon, tone = "blue" }: Props) {
  const toneClasses =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : tone === "red"
          ? "bg-red-50 text-red-700"
          : tone === "slate"
            ? "bg-slate-100 text-slate-700"
            : "bg-blue-50 text-blue-700";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-600">{label}</div>
        <div className={cn("p-2 rounded-xl", toneClasses)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
      <div
        className="mt-1 text-xs text-slate-500 h-4 overflow-hidden text-ellipsis whitespace-nowrap"
        title={hint ?? undefined}
      >
        {hint ?? ""}
      </div>
    </div>
  );
}
