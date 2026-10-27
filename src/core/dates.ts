/**
 * Local-date helpers for the calendar and the daily agenda.
 *
 * Everything works in the device's local timezone and returns new Date
 * objects; callers never mutate the values they pass in.
 */

export function startOfDay(value: Date | string): Date {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(value: Date | string): Date {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function addDays(value: Date, amount: number): Date {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

export function addMonths(value: Date, amount: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

/** Sunday-first, matching the reference week strip. */
export function startOfWeek(value: Date): Date {
  const date = startOfDay(value);
  return addDays(date, -date.getDay());
}

export function endOfWeek(value: Date): Date {
  return endOfDay(addDays(startOfWeek(value), 6));
}

export function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

export function endOfMonth(value: Date): Date {
  return endOfDay(new Date(value.getFullYear(), value.getMonth() + 1, 0));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function weekDays(value: Date): Date[] {
  const first = startOfWeek(value);
  return Array.from({ length: 7 }, (_, index) => addDays(first, index));
}

/**
 * Six full weeks, Sunday-first. The outside-month days are still real dates,
 * so the grid never leaves holes or shifts height between months.
 */
export function monthGrid(value: Date): Date[] {
  const firstCell = startOfWeek(startOfMonth(value));
  return Array.from({ length: 42 }, (_, index) => addDays(firstCell, index));
}

export function formatMonthYear(value: Date): string {
  return value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function formatMonthDay(value: Date): string {
  return value.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Human-readable range: "Oct 23 – Oct 30". */
export function formatDateRange(start: Date | string, end: Date | string): string {
  return `${formatMonthDay(new Date(start))} – ${formatMonthDay(new Date(end))}`;
}

export function formatLongDate(value: Date): string {
  return value.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function formatWeekdayNarrow(value: Date): string {
  return value.toLocaleDateString(undefined, { weekday: 'narrow' });
}

export function formatWeekdayShort(value: Date): string {
  return value.toLocaleDateString(undefined, { weekday: 'short' });
}

export function formatTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function dayKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
    value.getDate(),
  ).padStart(2, '0')}`;
}
