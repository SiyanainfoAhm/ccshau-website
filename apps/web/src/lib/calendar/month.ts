export function parseCalendarMonth(
  yearParam?: string,
  monthParam?: string,
  now = new Date(),
): { year: number; month: number } {
  const year = yearParam ? Number(yearParam) : now.getFullYear();
  const month = monthParam ? Number(monthParam) : now.getMonth() + 1;

  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    return { year, month: now.getMonth() + 1 };
  }
  return { year, month };
}

export function calendarMonthLabel(year: number, month: number, locale: string): string {
  return new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function firstWeekdayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

export function shiftCalendarMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function formatEventDate(date: string, locale: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
