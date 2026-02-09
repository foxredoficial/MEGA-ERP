import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

function parseBucket(t: string) {
  const s = t.includes(" ") ? t.replace(" ", "T") : t;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function SeriesChart(props: {
  title: string;
  subtitle: string;
  data: Array<Record<string, any>>;
  xKey: string;
  currentKey: string;
  compareKey?: string;
  valueFormat?: "currency" | "number";
}) {
  const chartData = useMemo(() => {
    return props.data.map((r) => {
      const d = parseBucket(String(r[props.xKey] ?? ""));
      const label = d ? format(d, "dd/MM") : String(r[props.xKey] ?? "");
      return { ...r, __label: label };
    });
  }, [props.data, props.xKey]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{props.title}</div>
          <div className="text-xs text-slate-500 mt-1">{props.subtitle}</div>
        </div>
      </div>

      <div className="mt-4 h-[280px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
          <AreaChart data={chartData} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="__label" tick={{ fontSize: 12 }} stroke="#94A3B8" />
            <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" width={60} />
            <Tooltip
              formatter={(v: any) => {
                const n = Number(v ?? 0);
                if (props.valueFormat === "currency") return formatCurrency(n);
                return n;
              }}
              labelStyle={{ color: "#0F172A" }}
              contentStyle={{ borderRadius: 12, borderColor: "#E2E8F0" }}
            />
            <Area type="monotone" dataKey={props.currentKey} stroke="#2563EB" fill="#3B82F6" fillOpacity={0.16} strokeWidth={2} />
            {props.compareKey && (
              <Area type="monotone" dataKey={props.compareKey} stroke="#16A34A" fill="#22C55E" fillOpacity={0.10} strokeWidth={2} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
