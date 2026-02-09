import { useMemo, useState } from "react";
import { addDays, endOfMonth, format, startOfMonth } from "date-fns";
import { CalendarDays, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { CalendarMonth } from "./CalendarMonth";
import { CompareRangePicker } from "./CompareRangePicker";
import {
  clampRange,
  computeCompare,
  computePreset,
  formatRangeLabel,
  suggestedGranularity,
  type CompareMode,
  type DateFilterValue,
  type DateGranularity,
  type DatePreset,
  type DateRange,
} from "./dateRange";

type Props = {
  label: string;
  value: DateFilterValue;
  onChange: (next: DateFilterValue) => void;
};

const PRESETS: Array<{ id: DatePreset; label: string }> = [
  { id: "today", label: "Hoje" },
  { id: "this_week", label: "Esta semana" },
  { id: "last_week", label: "Semana passada" },
  { id: "this_month", label: "Este mês" },
  { id: "last_month", label: "Mês passado" },
  { id: "select_month", label: "Selecionar mês" },
  { id: "custom", label: "Período customizado" },
];

export function AdvancedDateFilter({ label, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draftPreset, setDraftPreset] = useState<DatePreset>(value.preset);
  const [draftRange, setDraftRange] = useState<DateRange>(value.range);
  const [draftCompareMode, setDraftCompareMode] = useState<CompareMode>(value.compare.mode);
  const [draftCompareRange, setDraftCompareRange] = useState<DateRange | undefined>(value.compare.range);
  const [draftGranularity, setDraftGranularity] = useState<DateGranularity>(value.granularity);

  const [picking, setPicking] = useState<"start" | "end">("start");
  const [monthLeft, setMonthLeft] = useState<Date>(() => startOfMonth(value.range.start));
  const [monthRight, setMonthRight] = useState<Date>(() => startOfMonth(addDays(value.range.start, 32)));


  const chip = useMemo(() => {
    const main = formatRangeLabel(value.range);
    if (value.compare.mode !== "none" && value.compare.range) {
      return `${label}: ${main} (comparar: ${formatRangeLabel(value.compare.range)})`;
    }
    return `${label}: ${main}`;
  }, [label, value.compare.mode, value.compare.range, value.range]);

  function openModal() {
    setDraftPreset(value.preset);
    setDraftRange(value.range);
    setDraftCompareMode(value.compare.mode);
    setDraftCompareRange(value.compare.range);
    setDraftGranularity(value.granularity);
    setPicking("start");
    setMonthLeft(startOfMonth(value.range.start));
    setMonthRight(startOfMonth(addDays(value.range.start, 32)));
    setOpen(true);
  }

  function applyPreset(p: DatePreset) {
    setDraftPreset(p);
    const r = computePreset(p);
    setDraftRange(r);
    setDraftGranularity(suggestedGranularity(r));
    if (p !== "custom") {
      setPicking("start");
      setMonthLeft(startOfMonth(r.start));
      setMonthRight(startOfMonth(addDays(r.start, 32)));
    }
  }

  function pickDay(day: Date) {
    if (draftPreset === "select_month") {
      const month = startOfMonth(day);
      const r = { start: month, end: endOfMonth(month) };
      setDraftRange(r);
      setDraftGranularity(suggestedGranularity(r));
      setMonthLeft(month);
      setMonthRight(startOfMonth(addDays(month, 32)));
      return;
    }

    if (draftPreset !== "custom") {
      const r = { start: day, end: day };
      setDraftRange(r);
      setDraftGranularity(suggestedGranularity(r));
      return;
    }

    if (picking === "start") {
      setDraftRange((prev) => clampRange({ start: day, end: prev.end }));
      setPicking("end");
      return;
    }
    setDraftRange((prev) => clampRange({ start: prev.start, end: day }));
  }

  function confirm() {
    const normalizedRange = clampRange(draftRange);
    let compare: DateRange | undefined = undefined;
    if (draftCompareMode === "custom") compare = draftCompareRange;
    else compare = computeCompare(normalizedRange, draftCompareMode);

    onChange({
      preset: draftPreset,
      range: normalizedRange,
      granularity: draftGranularity,
      compare: {
        mode: draftCompareMode,
        range: draftCompareMode === "none" ? undefined : compare,
      },
    });
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50"
      >
        <CalendarDays className="w-4 h-4" />
        <span className="truncate max-w-[360px]">{chip}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm">
          <div className="absolute left-1/2 top-1/2 w-[min(980px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="px-6 pt-5 pb-3 border-b border-slate-200">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Selecione o período e, se quiser, compare com outro período.</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                    <GitCompareArrows className="w-4 h-4 text-slate-500" />
                    <select
                      className="text-sm bg-transparent outline-none"
                      value={draftCompareMode}
                      onChange={(e) => {
                        const mode = e.target.value as CompareMode;
                        setDraftCompareMode(mode);
                        if (mode === "none") setDraftCompareRange(undefined);
                        if (mode === "previous_period" || mode === "last_year") setDraftCompareRange(undefined);
                        if (mode === "custom") {
                          const base = draftCompareRange ?? draftRange;
                          setDraftCompareRange(base);
                        }
                      }}
                    >
                      <option value="none">Sem comparação</option>
                      <option value="previous_period">Período anterior</option>
                      <option value="last_year">Mesmo período ano anterior</option>
                      <option value="custom">Comparar com…</option>
                    </select>
                  </div>

                  <div className="rounded-xl border border-slate-200 px-3 py-2">
                    <select
                      className="text-sm bg-transparent outline-none"
                      value={draftGranularity}
                      onChange={(e) => setDraftGranularity(e.target.value as DateGranularity)}
                    >
                      <option value="hour">Hora</option>
                      <option value="day">Dia</option>
                      <option value="week">Semana</option>
                      <option value="month">Mês</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_1fr_220px] gap-6">
              <div>
                <div className="text-xs text-slate-500 mb-1">Início do período</div>
                <Input
                  value={format(draftRange.start, "dd/MM/yyyy")}
                  onChange={() => null}
                  className="h-10"
                  readOnly
                />
                <div className="mt-3">
                  <CalendarMonth
                    month={monthLeft}
                    selected={draftRange}
                    picking={draftPreset === "custom" ? picking : "start"}
                    onPick={pickDay}
                    onMonthChange={(m) => setMonthLeft(m)}
                  />
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1">Fim do período</div>
                <Input value={format(draftRange.end, "dd/MM/yyyy")} onChange={() => null} className="h-10" readOnly />
                <div className="mt-3">
                  <CalendarMonth
                    month={draftPreset === "custom" ? monthRight : monthLeft}
                    selected={draftRange}
                    picking={draftPreset === "custom" ? picking : "end"}
                    onPick={pickDay}
                    onMonthChange={(m) => setMonthRight(m)}
                  />
                </div>

                {draftCompareMode === "custom" && draftCompareRange && (
                  <CompareRangePicker
                    value={draftCompareRange}
                    onChange={(next) => {
                      setDraftCompareRange(next);
                    }}
                  />
                )}
              </div>

              <div className="border-l border-slate-200 pl-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Presets</div>
                <div className="space-y-1">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-xl text-sm",
                        draftPreset === p.id ? "bg-emerald-100 text-emerald-800" : "hover:bg-slate-100 text-slate-700"
                      )}
                      onClick={() => applyPreset(p.id)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirm}>
                Filtrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
