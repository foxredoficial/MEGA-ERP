import { apiFetch } from "./api";

export type ReportDefinition = {
  id: string;
  group: string;
  title: string;
  defaultGranularity: string;
};

export type ReportColumn = { key: string; label: string; align?: "left" | "right" | "center" };

export type ReportResult = {
  meta: {
    id: string;
    title: string;
    generatedAt: string;
    filters: Record<string, any>;
  };
  columns: ReportColumn[];
  rows: Array<Record<string, any>>;
  totals?: Record<string, number>;
};

export async function listReportDefinitions() {
  const data = await apiFetch<{ reports: ReportDefinition[] }>("/api/reports/definitions", { method: "GET" });
  return data.reports;
}

export async function getReport(reportId: string, params: { start?: string; end?: string; status?: string; kind?: string; query?: string }) {
  const qs = new URLSearchParams();
  if (params.start) qs.set("start", params.start);
  if (params.end) qs.set("end", params.end);
  if (params.status) qs.set("status", params.status);
  if (params.kind) qs.set("kind", params.kind);
  if (params.query) qs.set("query", params.query);
  const data = await apiFetch<{ report: ReportResult }>(`/api/reports/${reportId}${qs.toString() ? `?${qs.toString()}` : ""}`, {
    method: "GET",
  });
  return data.report;
}

