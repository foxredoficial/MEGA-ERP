import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subYears,
} from "date-fns";

export type DateRange = { start: Date; end: Date };

export type DatePreset =
  | "today"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "select_month"
  | "custom";

export type CompareMode = "none" | "previous_period" | "last_year" | "custom";

export type DateGranularity = "hour" | "day" | "week" | "month";

export type DateFilterValue = {
  preset: DatePreset;
  range: DateRange;
  granularity: DateGranularity;
  compare: { mode: CompareMode; range?: DateRange };
};

export function clampRange(range: DateRange) {
  if (isAfter(range.start, range.end)) return { start: range.end, end: range.start };
  return range;
}

export function daysInRange(range: DateRange) {
  const ms = Math.abs(range.end.getTime() - range.start.getTime());
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

export function suggestedGranularity(range: DateRange): DateGranularity {
  const days = daysInRange(range);
  if (days <= 2) return "hour";
  if (days <= 62) return "day";
  if (days <= 240) return "week";
  return "month";
}

export function formatRangeLabel(range: DateRange) {
  const s = format(range.start, "dd/MM/yyyy");
  const e = format(range.end, "dd/MM/yyyy");
  return `${s} até ${e}`;
}

export function computePreset(preset: DatePreset, anchor: Date = new Date()): DateRange {
  const today = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  if (preset === "today") return { start: today, end: today };
  if (preset === "this_week") {
    return {
      start: startOfWeek(today, { weekStartsOn: 0 }),
      end: endOfWeek(today, { weekStartsOn: 0 }),
    };
  }
  if (preset === "last_week") {
    const lastWeekDay = subDays(today, 7);
    return {
      start: startOfWeek(lastWeekDay, { weekStartsOn: 0 }),
      end: endOfWeek(lastWeekDay, { weekStartsOn: 0 }),
    };
  }
  if (preset === "this_month") return { start: startOfMonth(today), end: endOfMonth(today) };
  if (preset === "last_month") {
    const last = subMonths(today, 1);
    return { start: startOfMonth(last), end: endOfMonth(last) };
  }
  if (preset === "select_month") return { start: startOfMonth(today), end: endOfMonth(today) };
  return { start: today, end: today };
}

export function computeCompare(range: DateRange, mode: CompareMode): DateRange | undefined {
  if (mode === "none") return undefined;
  if (mode === "previous_period") {
    const days = daysInRange(range);
    const end = subDays(range.start, 1);
    const start = subDays(end, days - 1);
    return { start, end };
  }
  if (mode === "last_year") {
    return { start: subYears(range.start, 1), end: subYears(range.end, 1) };
  }
  return undefined;
}

export function inRange(day: Date, range: DateRange) {
  if (isSameDay(day, range.start) || isSameDay(day, range.end)) return true;
  return isAfter(day, range.start) && isBefore(day, range.end);
}

export function monthLabel(d: Date) {
  return format(d, "MMMM yyyy");
}

export function addCalendarMonth(d: Date, delta: number) {
  return addMonths(d, delta);
}

