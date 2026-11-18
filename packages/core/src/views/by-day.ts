import { fromAbsolute, toCalendarDate, type CalendarDate } from "@internationalized/date";
import { eventBounds, isAllDay, startOfDayMs } from "../events/queries.js";
import type { CalendarEvent } from "../events/types.js";
import type { DateRange } from "../time/view.js";

/** Calls `visit` with every day of `range` that `event` touches, seen from `timeZone`. */
function forEachDay(
  event: CalendarEvent,
  range: DateRange,
  timeZone: string,
  visit: (day: CalendarDate) => void,
) {
  const { start, end } = eventBounds(event, timeZone);
  let day = toCalendarDate(fromAbsolute(start, timeZone));
  if (day.compare(range.start) < 0) day = range.start;
  for (
    ;
    day.compare(range.end) < 0 && startOfDayMs(day, timeZone) < end;
    day = day.add({ days: 1 })
  ) {
    visit(day);
  }
}

export interface DayGroup<T extends CalendarEvent> {
  day: CalendarDate;
  events: T[];
}

/**
 * Days of `range` that have events, in order, each with its events: all-day first, then by
 * start time. Multi-day events appear on every day they cover. Used by the agenda view.
 */
export function groupByDay<T extends CalendarEvent>(
  events: readonly T[],
  range: DateRange,
  timeZone: string,
): DayGroup<T>[] {
  const groups = new Map<string, DayGroup<T>>();
  for (const event of events) {
    forEachDay(event, range, timeZone, (day) => {
      const key = day.toString();
      const group = groups.get(key) ?? { day, events: [] };
      group.events.push(event);
      groups.set(key, group);
    });
  }

  const order = (event: T) =>
    [isAllDay(event) ? 0 : 1, eventBounds(event, timeZone).start] as const;
  return [...groups.values()]
    .sort((a, b) => a.day.compare(b.day))
    .map(({ day, events: list }) => ({
      day,
      events: list.sort((a, b) => {
        const [kindA, startA] = order(a);
        const [kindB, startB] = order(b);
        return kindA - kindB || startA - startB;
      }),
    }));
}

/** Number of events on each day of `range` (keyed by ISO date). Used by the year view. */
export function countByDay(
  events: readonly CalendarEvent[],
  range: DateRange,
  timeZone: string,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    forEachDay(event, range, timeZone, (day) => {
      counts.set(day.toString(), (counts.get(day.toString()) ?? 0) + 1);
    });
  }
  return counts;
}
