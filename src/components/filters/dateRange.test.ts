import { describe, expect, it } from "vitest";
import { clampRange, computeCompare, computePreset, daysInRange, suggestedGranularity } from "./dateRange";

describe("dateRange", () => {
  it("clampRange swaps when start > end", () => {
    const r = clampRange({ start: new Date(2026, 1, 10), end: new Date(2026, 1, 1) });
    expect(r.start.getTime()).toBeLessThanOrEqual(r.end.getTime());
    expect(r.start.getDate()).toBe(1);
    expect(r.end.getDate()).toBe(10);
  });

  it("computeCompare previous_period returns same number of days", () => {
    const range = { start: new Date(2026, 1, 1), end: new Date(2026, 1, 28) };
    const cmp = computeCompare(range, "previous_period");
    expect(cmp).toBeTruthy();
    expect(daysInRange(cmp!)).toBe(daysInRange(range));
    expect(cmp!.end.getTime()).toBeLessThan(range.start.getTime());
  });

  it("computeCompare last_year shifts 1 year keeping day-span", () => {
    const range = { start: new Date(2026, 6, 10), end: new Date(2026, 6, 15) };
    const cmp = computeCompare(range, "last_year");
    expect(cmp).toBeTruthy();
    expect(cmp!.start.getFullYear()).toBe(2025);
    expect(cmp!.end.getFullYear()).toBe(2025);
    expect(daysInRange(cmp!)).toBe(daysInRange(range));
  });

  it("computePreset uses anchor (this_month)", () => {
    const anchor = new Date(2026, 1, 15);
    const r = computePreset("this_month", anchor);
    expect(r.start.getFullYear()).toBe(2026);
    expect(r.start.getMonth()).toBe(1);
    expect(r.start.getDate()).toBe(1);
    expect(r.end.getMonth()).toBe(1);
    expect(r.end.getDate()).toBeGreaterThanOrEqual(28);
  });

  it("suggestedGranularity returns hour for <=2 days", () => {
    const range = { start: new Date(2026, 1, 1), end: new Date(2026, 1, 2) };
    expect(suggestedGranularity(range)).toBe("hour");
  });
});

