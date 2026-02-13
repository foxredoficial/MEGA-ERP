import { format, startOfMonth } from "date-fns";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { CalendarMonth } from "./CalendarMonth";
import { clampRange, type DateRange } from "./dateRange";

type Props = {
  value: DateRange;
  onChange: (next: DateRange) => void;
};

export function CompareRangePicker({ value, onChange }: Props) {
  const [picking, setPicking] = useState<"start" | "end">("start");
  const [month, setMonth] = useState<Date>(() => startOfMonth(value.start));

  useEffect(() => {
    setMonth(startOfMonth(value.start));
  }, [value.start]);

  function pick(day: Date) {
    if (picking === "start") {
      onChange(clampRange({ start: day, end: value.end }));
      setPicking("end");
      return;
    }
    onChange(clampRange({ start: value.start, end: day }));
  }

  return (
    <div className="mt-5 border-t border-slate-200 pt-5">
      <div className="text-sm font-semibold text-slate-900">Comparação</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <div>
          <div className="text-xs text-slate-500 mb-1">Início</div>
          <Input
            value={format(value.start, "dd/MM/yyyy")}
            onChange={() => null}
            className="h-10"
            readOnly
            onClick={() => {
              setPicking("start");
              setMonth(startOfMonth(value.start));
            }}
          />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Fim</div>
          <Input
            value={format(value.end, "dd/MM/yyyy")}
            onChange={() => null}
            className="h-10"
            readOnly
            onClick={() => {
              setPicking("end");
              setMonth(startOfMonth(value.end));
            }}
          />
        </div>
      </div>

      <div className="mt-3">
        <CalendarMonth month={month} selected={value} picking={picking} onPick={pick} onMonthChange={setMonth} />
      </div>
    </div>
  );
}
