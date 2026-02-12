function csvEscape(value: unknown) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: Array<Record<string, unknown>>, headers: Array<{ key: string; label: string }>) {
  const lines: string[] = [];
  lines.push(headers.map((h) => csvEscape(h.label)).join(";"));
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape((row as any)[h.key])).join(";"));
  }
  return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

