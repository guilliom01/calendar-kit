import { toZoned, type CalendarDate, type ZonedDateTime } from "@internationalized/date";

const MINUTES_PER_DAY = 24 * 60;

/** Rounds a minute offset (e.g. from a pointer position) to the nearest `step`, inside the day. */
export function snapMinutes(minutes: number, step = 15): number {
  return Math.min(MINUTES_PER_DAY, Math.max(0, Math.round(minutes / step) * step));
}

/** Wall-clock time `minutes` after midnight of `day`. 1440 is midnight of the next day. */
export function zonedAt(day: CalendarDate, minutes: number, timeZone: string): ZonedDateTime {
  if (minutes >= MINUTES_PER_DAY) return toZoned(day.add({ days: 1 }), timeZone);
  return toZoned(day, timeZone).set({ hour: Math.floor(minutes / 60), minute: minutes % 60 });
}
