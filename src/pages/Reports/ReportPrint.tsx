import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getReport, type ReportResult } from "@/lib/api_reports";
import { toLocalIsoDate } from "@/lib/utils";
import { ReportTable } from "./ReportTable";

export function ReportPrint() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const reportId = String(id ?? "");
  const start = searchParams.get("start") ?? toLocalIsoDate(new Date());
  const end = searchParams.get("end") ?? toLocalIsoDate(new Date());
  const status = searchParams.get("status") ?? undefined;
  const kind = searchParams.get("kind") ?? undefined;
  const query = searchParams.get("query") ?? undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportResult | null>(null);

  const title = useMemo(() => report?.meta.title ?? "Relatório", [report?.meta.title]);
  const generated = useMemo(() => (report ? new Date(report.meta.generatedAt).toLocaleString("pt-BR") : ""), [report]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const r = await getReport(reportId, { start, end, status, kind, query });
        if (!cancelled) setReport(r);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [end, kind, query, reportId, start, status]);

  useEffect(() => {
    if (!report || loading) return;
    const t = setTimeout(() => {
      window.print();
    }, 250);
    return () => clearTimeout(t);
  }, [loading, report]);

  return (
    <div className="p-8 print:p-0">
      <div className="no-print mb-4">
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm"
          onClick={() => window.print()}
          disabled={!report || loading}
        >
          Imprimir
        </button>
      </div>

      <div className="print:mb-0 mb-4">
        <div className="text-2xl font-bold text-slate-900">{title}</div>
        <div className="text-sm text-slate-600 mt-1">Período: {start} até {end}</div>
        <div className="text-xs text-slate-500 mt-1">Gerado em: {generated}</div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading && <div className="text-sm text-slate-500">Carregando…</div>}
      {!loading && report && <ReportTable columns={report.columns} rows={report.rows} dense />}
    </div>
  );
}
