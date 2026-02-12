import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FileDown, Printer, Search } from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { AdvancedDateFilter } from "@/components/filters/AdvancedDateFilter";
import { computePreset, suggestedGranularity, type DateFilterValue } from "@/components/filters/dateRange";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Pagination } from "@/components/ui/Pagination";
import { cn, toLocalIsoDate } from "@/lib/utils";
import { getReport, listReportDefinitions, type ReportDefinition, type ReportResult } from "@/lib/api_reports";
import { ReportTable } from "./ReportTable";

function toIsoDate(d: Date) {
  return toLocalIsoDate(d);
}

function groupReports(defs: ReportDefinition[]) {
  const groups = new Map<string, ReportDefinition[]>();
  for (const d of defs) {
    const list = groups.get(d.group) ?? [];
    list.push(d);
    groups.set(d.group, list);
  }
  return Array.from(groups.entries()).map(([group, reports]) => ({
    group,
    reports: reports.slice().sort((a, b) => a.title.localeCompare(b.title)),
  }));
}

export function ReportsCenter() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();

  const selectedId = String(params.id ?? searchParams.get("id") ?? "financial-titles");

  const [defs, setDefs] = useState<ReportDefinition[]>([]);
  const [loadingDefs, setLoadingDefs] = useState(true);

  const [filter, setFilter] = useState<DateFilterValue>(() => {
    const range = computePreset("this_month");
    return { preset: "this_month", range, granularity: suggestedGranularity(range), compare: { mode: "none" } };
  });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [kind, setKind] = useState<"all" | "ar" | "ap">("all");

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [filter.range.end, filter.range.start, kind, query, selectedId, status]);

  const total = report?.rows?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedRows = useMemo(() => {
    const rows = report?.rows ?? [];
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return rows.slice(start, end);
  }, [page, pageSize, report?.rows, totalPages]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoadingDefs(true);
        const r = await listReportDefinitions();
        if (!cancelled) setDefs(r);
      } catch {
        if (!cancelled) setDefs([]);
      } finally {
        if (!cancelled) setLoadingDefs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedDef = useMemo(() => defs.find((d) => d.id === selectedId) ?? null, [defs, selectedId]);
  const grouped = useMemo(() => groupReports(defs), [defs]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const r = await getReport(selectedId, {
          start: toIsoDate(filter.range.start),
          end: toIsoDate(filter.range.end),
          query: query.trim() || undefined,
          status: status !== "all" ? status : undefined,
          kind: kind !== "all" ? kind : undefined,
        });
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
  }, [filter.range.end, filter.range.start, kind, query, selectedId, status]);

  const printUrl = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("start", toIsoDate(filter.range.start));
    qs.set("end", toIsoDate(filter.range.end));
    if (query.trim()) qs.set("query", query.trim());
    if (status !== "all") qs.set("status", status);
    if (kind !== "all") qs.set("kind", kind);
    return `/app/relatorios/imprimir/${encodeURIComponent(selectedId)}?${qs.toString()}`;
  }, [filter.range.end, filter.range.start, kind, query, selectedId, status]);

  return (
    <BlingLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Relatórios</h1>
            <p className="text-sm text-slate-500 mt-1">Gere, revise e imprima relatórios com layout próprio.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/app">
              <Button variant="outline">Voltar</Button>
            </Link>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={() => window.open(printUrl, "_blank", "noopener,noreferrer")}> 
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="text-sm font-semibold text-slate-900">Catálogo</div>
              <div className="text-xs text-slate-500 mt-1">Selecione um relatório</div>
            </div>
            <div className="p-3 space-y-4 max-h-[calc(100vh-240px)] overflow-auto">
              {loadingDefs && <div className="text-sm text-slate-500 px-2">Carregando…</div>}
              {!loadingDefs && grouped.length === 0 && <div className="text-sm text-slate-500 px-2">Sem relatórios.</div>}
              {grouped.map((g) => (
                <div key={g.group}>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">{g.group}</div>
                  <div className="space-y-1">
                    {g.reports.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-xl text-sm",
                          r.id === selectedId ? "bg-blue-50 text-blue-800" : "hover:bg-slate-100 text-slate-700"
                        )}
                        onClick={() => navigate(`/app/relatorios/${r.id}`)}
                      >
                        {r.title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-slate-900">{selectedDef?.title ?? "Relatório"}</div>
                  <div className="text-xs text-slate-500 mt-1">Aplique filtros e gere a prévia para imprimir.</div>
                </div>
                <AdvancedDateFilter label="Período" value={filter} onChange={setFilter} />
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar (opcional)" />
                </div>
                <div>
                  <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="all">Status: Todos</option>
                    <option value="open">Status: Em aberto</option>
                    <option value="partial">Status: Parcial</option>
                    <option value="paid">Status: Pago</option>
                    <option value="canceled">Status: Cancelado</option>
                    <option value="completed">Status: Concluído</option>
                  </Select>
                </div>
                <div>
                  <Select value={kind} onChange={(e) => setKind(e.target.value as any)}>
                    <option value="all">Tipo: Todos</option>
                    <option value="ar">Tipo: A Receber</option>
                    <option value="ap">Tipo: A Pagar</option>
                  </Select>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {report ? `Gerado em ${new Date(report.meta.generatedAt).toLocaleString("pt-BR")}` : ""}
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(report ?? {}, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `report-${selectedId}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  disabled={!report}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Exportar JSON
                </Button>
              </div>
            </div>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              {loading && <div className="text-sm text-slate-500">Carregando relatório…</div>}
              {!loading && report && (
                <>
                  {report.totals && (
                    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 flex items-center justify-between">
                      <span className="font-semibold">Totais</span>
                      <span className="font-mono text-xs">{Object.entries(report.totals).map(([k, v]) => `${k}: ${v}`).join(" | ")}</span>
                    </div>
                  )}
                  <ReportTable columns={report.columns} rows={pagedRows} />

                  <div className="mt-4">
                    <Pagination
                      label="Linhas"
                      page={page}
                      pageSize={pageSize}
                      total={total}
                      onPageChange={setPage}
                      onPageSizeChange={(n) => {
                        setPageSize(n);
                        setPage(1);
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </BlingLayout>
  );
}
