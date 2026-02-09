import { useMemo } from "react";
import { addDays, endOfMonth, endOfWeek, format, isSameDay, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { addCalendarMonth, inRange, monthLabel, type DateRange } from "./dateRange";

function dayGrid(month: Date) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days: Date[] = [];
  let d = start;
  while (d.getTime() <= end.getTime()) {
    days.push(d);
    d = addDays(d, 1);
  }
  return days;
}

export function CalendarMonth(props: {
  month: Date;
  selected: DateRange;
  picking: "start" | "end";
  onPick: (day: Date) => void;
  onMonthChange: (next: Date) => void;
}) {
  const grid = useMemo(() => dayGrid(props.month), [props.month]);
  const title = useMemo(() => {
    const raw = monthLabel(props.month);
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [props.month]);

  return (
    <div>
      <div className="flex items-center justify-between text-sm text-slate-700 mb-2">
        <button
          type="button"
          className="p-1 rounded hover:bg-slate-100"
          onClick={() => props.onMonthChange(addCalendarMonth(props.month, -1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="font-medium">{title}</div>
        <button
          type="button"
          className="p-1 rounded hover:bg-slate-100"
          onClick={() => props.onMonthChange(addCalendarMonth(props.month, 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-[11px] text-slate-400 mb-2">
        {"DomSegTerQuaQuiSexSab".match(/.{1,3}/g)!.map((w) => (
          <div key={w} className="text-center py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((d) => {
          const isStart = isSameDay(d, props.selected.start);
          const isEnd = isSameDay(d, props.selected.end);
          const active = inRange(d, props.selected);
          const inMonth = d.getMonth() === props.month.getMonth();
          return (
            <button
              key={d.toISOString()}
              type="button"
              className={cn(
                "h-9 rounded-lg text-sm transition",
                inMonth ? "text-slate-700 hover:bg-slate-100" : "text-slate-300",
                active && "bg-emerald-50",
                (isStart || isEnd) && "bg-emerald-600 text-white hover:bg-emerald-600"
              )}
              onClick={() => props.onPick(d)}
              title={format(d, "dd/MM/yyyy")}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-xs text-slate-500">Clique para selecionar {props.picking === "start" ? "início" : "fim"}.</div>
    </div>
  );
}

