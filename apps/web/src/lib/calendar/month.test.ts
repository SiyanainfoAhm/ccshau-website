/**
 * Tests for `@/lib/calendar/month`.
 * Covers calendar month parsing, day counts, weekday offset, and month shifting.
 */

import { describe, expect, it } from "vitest";

import {
  daysInMonth,
  firstWeekdayOfMonth,
  parseCalendarMonth,
  shiftCalendarMonth,
} from "@/lib/calendar/month";

// Suite: calendar month helpers.
describe("calendar/month", () => {
  // Parses numeric year/month strings into a month object.
  it("parses valid year and month", () => {
    expect(parseCalendarMonth("2026", "8")).toEqual({ year: 2026, month: 8 });
  });

  // Invalid year or month falls back to the provided "now" date.
  it("falls back for invalid year or month", () => {
    const now = new Date(2026, 7, 15); // Aug 2026
    expect(parseCalendarMonth("1999", "8", now)).toEqual({
      year: 2026,
      month: 8,
    });
    expect(parseCalendarMonth("2026", "13", now)).toEqual({
      year: 2026,
      month: 8,
    });
  });

  // daysInMonth handles leap years; firstWeekdayOfMonth returns Sunday=0 index.
  it("computes days and first weekday", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    // 1 Aug 2026 is Saturday => 6
    expect(firstWeekdayOfMonth(2026, 8)).toBe(6);
  });

  // Month shift wraps across December/January year boundaries.
  it("shifts months across year boundary", () => {
    expect(shiftCalendarMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftCalendarMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });
});
