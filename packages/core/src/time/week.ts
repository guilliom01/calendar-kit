import { startOfWeek, type CalendarDate, type DayOfWeek } from "@internationalized/date";

export type { DayOfWeek };

export interface WeekOptions {
  /** BCP 47 locale; decides the first day of the week when `firstDayOfWeek` is omitted. */
  locale: string;
  firstDayOfWeek?: DayOfWeek | undefined;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). Not affected by DST. */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  return Math.round((to.toDate("UTC").getTime() - from.toDate("UTC").getTime()) / DAY_MS);
}

/** The 7 days of the week that contains `date`. */
export function weekDays(
  date: CalendarDate,
  { locale, firstDayOfWeek }: WeekOptions,
): CalendarDate[] {
  const start = startOfWeek(date, locale, firstDayOfWeek);
  return Array.from({ length: 7 }, (_, offset) => start.add({ days: offset }));
}
