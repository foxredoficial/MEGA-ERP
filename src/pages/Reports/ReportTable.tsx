import { cn } from "@/lib/utils";
import type { ReportColumn } from "@/lib/api_reports";

export function ReportTable(props: {
  columns: ReportColumn[];
  rows: Array<Record<string, any>>;
  dense?: boolean;
}) {
  const cell = props.dense ? "px-3 py-2" : "px-4 py-3";

  return (
    <div className="overflow-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
          <tr>
            {props.columns.map((c) => (
              <th key={c.key} className={cn(cell, c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left")}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {props.rows.map((r, idx) => (
            <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
              {props.columns.map((c) => (
                <td key={c.key} className={cn(cell, "text-slate-700", c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left")}>
                  {String(r[c.key] ?? "-")}
                </td>
              ))}
            </tr>
          ))}
          {props.rows.length === 0 && (
            <tr>
              <td colSpan={props.columns.length} className={cn(cell, "text-center text-slate-500")}>Nenhum registro.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

