import { useMemo, useRef, useState } from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { CalendarDays, GitCompareArrows, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
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
  showLabelInChip?: boolean;
  variant?: "chip" | "icon";
  size?: "sm" | "md";
  showClear?: boolean;
  allowedGranularities?: DateGranularity[];
  showCompare?: boolean;
  showGranularity?: boolean;
  showPresets?: boolean;
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

export function AdvancedDateFilter({
  label,
  value,
  onChange,
  showLabelInChip = true,
  variant = "chip",
  size = "md",
  showClear = true,
  allowedGranularities,
  showCompare = true,
  showGranularity = true,
  showPresets = true,
}: Props) {
  const initialRef = useRef<DateFilterValue>(value);
  const [open, setOpen] = useState(false);
  const [draftPreset, setDraftPreset] = useState<DatePreset>(value.preset);
  const [draftRange, setDraftRange] = useState<DateRange>(value.range);
  const [draftCompareMode, setDraftCompareMode] = useState<CompareMode>(value.compare.mode);
  const [draftCompareRange, setDraftCompareRange] = useState<DateRange | undefined>(value.compare.range);
  const [draftGranularity, setDraftGranularity] = useState<DateGranularity>(value.granularity);

  const [picking, setPicking] = useState<"start" | "end">("start");
  const [month, setMonth] = useState<Date>(() => startOfMonth(value.range.start));

  const allowed = useMemo<DateGranularity[]>(
    () => (allowedGranularities && allowedGranularities.length > 0 ? allowedGranularities : ["hour", "day", "week", "month"]),
    [allowedGranularities]
  );
  const chip = useMemo(() => {
    const presetLabel =
      value.preset !== "custom" && value.preset !== "select_month" ? PRESETS.find((p) => p.id === value.preset)?.label : null;
    const main = presetLabel ?? formatRangeLabel(value.range);
    if (showCompare && value.compare.mode !== "none" && value.compare.range) {
      const extra = `${main} (comparar: ${formatRangeLabel(value.compare.range)})`;
      return showLabelInChip ? `${label}: ${extra}` : extra;
    }
    return showLabelInChip ? `${label}: ${main}` : main;
  }, [label, showCompare, showLabelInChip, value.compare.mode, value.compare.range, value.preset, value.range]);

  const isDirty = useMemo(() => {
    const a = initialRef.current;
    const b = value;
    const aStart = format(a.range.start, "yyyy-MM-dd");
    const aEnd = format(a.range.end, "yyyy-MM-dd");
    const bStart = format(b.range.start, "yyyy-MM-dd");
    const bEnd = format(b.range.end, "yyyy-MM-dd");
    const compareAStart = a.compare.range ? format(a.compare.range.start, "yyyy-MM-dd") : null;
    const compareAEnd = a.compare.range ? format(a.compare.range.end, "yyyy-MM-dd") : null;
    const compareBStart = b.compare.range ? format(b.compare.range.start, "yyyy-MM-dd") : null;
    const compareBEnd = b.compare.range ? format(b.compare.range.end, "yyyy-MM-dd") : null;
    return (
      a.preset !== b.preset ||
      aStart !== bStart ||
      aEnd !== bEnd ||
      a.granularity !== b.granularity ||
      a.compare.mode !== b.compare.mode ||
      compareAStart !== compareBStart ||
      compareAEnd !== compareBEnd
    );
  }, [value]);

  function openModal() {
    setDraftPreset(value.preset);
    setDraftRange(value.range);
    setDraftCompareMode(showCompare ? value.compare.mode : "none");
    setDraftCompareRange(showCompare ? value.compare.range : undefined);
    const g0 = allowed.includes(value.granularity) ? value.granularity : suggestedGranularity(value.range);
    const g1 = allowed.includes(g0) ? g0 : allowed.includes("day") ? "day" : allowed[0]!;
    setDraftGranularity(showGranularity ? g1 : suggestedGranularity(value.range));
    setPicking("start");
    setMonth(startOfMonth(value.range.start));
    setOpen(true);
  }

  function applyPreset(p: DatePreset) {
    setDraftPreset(p);
    const r = computePreset(p);
    setDraftRange(r);
    setDraftGranularity(suggestedGranularity(r));
    if (p !== "custom") {
      setPicking("start");
      setMonth(startOfMonth(r.start));
    }
  }

  function pickDay(day: Date) {
    if (draftPreset === "select_month") {
      const month = startOfMonth(day);
      const r = { start: month, end: endOfMonth(month) };
      setDraftRange(r);
      setDraftGranularity(suggestedGranularity(r));
      setMonth(month);
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
    const compareMode: CompareMode = showCompare ? draftCompareMode : "none";
    let compare: DateRange | undefined = undefined;
    if (compareMode === "custom") compare = draftCompareRange;
    else compare = computeCompare(normalizedRange, compareMode);
    const g0 = allowed.includes(draftGranularity) ? draftGranularity : suggestedGranularity(normalizedRange);
    const normalizedGranularity = allowed.includes(g0) ? g0 : allowed.includes("day") ? "day" : allowed[0]!;
    const gFinal = showGranularity ? normalizedGranularity : suggestedGranularity(normalizedRange);

    onChange({
      preset: draftPreset,
      range: normalizedRange,
      granularity: gFinal,
      compare: {
        mode: compareMode,
        range: compareMode === "none" ? undefined : compare,
      },
    });
    setOpen(false);
  }

  function resetToInitial() {
    onChange(initialRef.current);
    setOpen(false);
  }

  return (
    <>
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={openModal}
          title={chip}
          aria-label={chip}
          className={cn(
            "inline-flex items-center gap-2 border bg-white hover:bg-slate-50",
            variant === "chip" ? (size === "sm" ? "h-9 rounded-lg px-3 text-sm font-medium" : "h-11 rounded-xl px-4 text-sm font-medium") : "justify-center",
            variant === "icon" ? (size === "sm" ? "h-9 w-9 rounded-lg" : "h-11 w-11 rounded-xl") : "",
            isDirty ? "border-blue-300 text-blue-700" : "border-slate-200 text-slate-700"
          )}
        >
          <CalendarDays className="w-4 h-4" />
          {variant === "chip" ? <span className="truncate max-w-[360px]">{chip}</span> : null}
        </button>
        {variant === "chip" && showClear && isDirty ? (
          <button
            type="button"
            onClick={resetToInitial}
            className={cn(
              "inline-flex items-center justify-center border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              size === "sm" ? "h-9 w-9 rounded-lg" : "h-11 w-11 rounded-xl"
            )}
            aria-label="Limpar filtro"
            title="Limpar filtro"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm">
          <div className="absolute left-1/2 top-1/2 w-[min(860px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl border border-slate-200 max-h-[calc(100vh-32px)] overflow-hidden">
            <div className="px-6 pt-5 pb-3 border-b border-slate-200">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Selecione o período e, se quiser, compare com outro período.</div>
                </div>
                <div className="flex items-center gap-2">
                  {showCompare ? (
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                      <GitCompareArrows className="w-4 h-4 text-slate-500" />
                      <Select
                        appearance="inline"
                        className="pr-6"
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
                      </Select>
                    </div>
                  ) : null}

                  {showGranularity ? (
                    <div className="rounded-xl border border-slate-200 px-3 py-2">
                      <Select
                        appearance="inline"
                        className="pr-6"
                        value={draftGranularity}
                        onChange={(e) => setDraftGranularity(e.target.value as DateGranularity)}
                      >
                        {allowed.includes("hour") ? <option value="hour">Hora</option> : null}
                        {allowed.includes("day") ? <option value="day">Dia</option> : null}
                        {allowed.includes("week") ? <option value="week">Semana</option> : null}
                        {allowed.includes("month") ? <option value="month">Mês</option> : null}
                      </Select>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-180px)]">
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Início</div>
                    <Input
                      value={format(draftRange.start, "dd/MM/yyyy")}
                      onChange={() => null}
                      className="h-10"
                      readOnly
                      onClick={() => {
                        setPicking("start");
                        if (draftPreset !== "custom" && draftPreset !== "select_month") setDraftPreset("custom");
                        setMonth(startOfMonth(draftRange.start));
                      }}
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Fim</div>
                    <Input
                      value={format(draftRange.end, "dd/MM/yyyy")}
                      onChange={() => null}
                      className="h-10"
                      readOnly
                      onClick={() => {
                        setPicking("end");
                        if (draftPreset !== "custom" && draftPreset !== "select_month") setDraftPreset("custom");
                        setMonth(startOfMonth(draftRange.end));
                      }}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <CalendarMonth
                    month={month}
                    selected={draftRange}
                    picking={draftPreset === "select_month" ? "start" : picking}
                    onPick={pickDay}
                    onMonthChange={setMonth}
                  />
                </div>

                {showCompare && draftCompareMode === "custom" && draftCompareRange && (
                  <CompareRangePicker value={draftCompareRange} onChange={setDraftCompareRange} />
                )}
              </div>

              <div className="lg:border-l lg:border-slate-200 lg:pl-4">
                {showPresets ? (
                  <>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Presets</div>
                    <div className="space-y-1">
                      {PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-xl text-sm",
                            draftPreset === p.id ? "bg-blue-100 text-blue-800" : "hover:bg-slate-100 text-slate-700"
                          )}
                          onClick={() => applyPreset(p.id)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-2">
              <Button variant="outline" onClick={resetToInitial} disabled={!isDirty}>
                Limpar
              </Button>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={confirm}>
                  Filtrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
