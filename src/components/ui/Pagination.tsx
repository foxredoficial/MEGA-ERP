import { useEffect, useMemo, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function pageItems(current: number, totalPages: number) {
  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (let p = current - 2; p <= current + 2; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const out: Array<number | "ellipsis"> = [];
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]!;
    const prev = sorted[i - 1];
    if (prev !== undefined && p - prev > 1) out.push("ellipsis");
    out.push(p);
  }
  return out;
}

export type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  label?: string;
};

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
  label = "Registros",
}: PaginationProps) {
  const [isPending, startTransition] = useTransition();
  const [visualPage, setVisualPage] = useState<number | null>(null);

  const safePageSize = clampInt(pageSize, 1, 1000);
  const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / safePageSize));
  const safePage = clampInt(page, 1, totalPages);

  useEffect(() => {
    setVisualPage(null);
  }, [safePage, safePageSize, total]);

  const displayPage = visualPage ?? safePage;

  const from = total === 0 ? 0 : (displayPage - 1) * safePageSize + 1;
  const to = Math.min(total, displayPage * safePageSize);

  const items = useMemo(() => pageItems(displayPage, totalPages), [displayPage, totalPages]);

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="text-xs text-slate-600">
        {label}: <span className="font-medium text-slate-900">{from}</span>–<span className="font-medium text-slate-900">{to}</span> de{" "}
        <span className="font-medium text-slate-900">{total}</span>
      </div>

      <div className="flex items-center gap-2 justify-between sm:justify-end">
        {onPageSizeChange ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">Por página</span>
            <Select
              className="h-9"
              value={String(safePageSize)}
              onChange={(e) => {
                const nextSize = Number(e.target.value);
                setVisualPage(1);
                startTransition(() => onPageSizeChange(nextSize));
              }}
              disabled={isPending}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            className="h-9 px-3"
            onClick={() => {
              const next = Math.max(1, displayPage - 1);
              setVisualPage(next);
              startTransition(() => onPageChange(next));
            }}
            disabled={displayPage <= 1 || isPending}
          >
            Anterior
          </Button>

          <div className="hidden sm:flex items-center gap-1">
            {items.map((it, idx) => {
              if (it === "ellipsis") {
                return (
                  <div key={`e-${idx}`} className="px-2 text-slate-400 text-sm">
                    …
                  </div>
                );
              }
              const p = it;
              const active = p === displayPage;
              return (
                <Button
                  key={p}
                  type="button"
                  variant={active ? "primary" : "outline"}
                  className={cn("h-9 w-10 px-0", active && "bg-blue-600 hover:bg-blue-700 text-white")}
                  onClick={() => {
                    setVisualPage(p);
                    startTransition(() => onPageChange(p));
                  }}
                  disabled={isPending}
                >
                  {p}
                </Button>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-9 px-3"
            onClick={() => {
              const next = Math.min(totalPages, displayPage + 1);
              setVisualPage(next);
              startTransition(() => onPageChange(next));
            }}
            disabled={displayPage >= totalPages || isPending}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
