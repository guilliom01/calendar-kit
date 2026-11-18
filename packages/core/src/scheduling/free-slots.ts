import { getDayOfWeek, type ZonedDateTime } from "@internationalized/date";
import { eventBounds } from "../events/queries.js";
import type { CalendarEvent } from "../events/types.js";
import { zonedAt } from "../interaction/grid.js";
import { expandEvents } from "../recurrence/index.js";
import { daysBetween } from "../time/week.js";
import type { DateRange } from "../time/view.js";

/** When people can meet: weekdays (0 is Sunday) and minutes after midnight, end exclusive. */
export interface WorkingHours {
  days: number[];
  start: number;
  end: number;
}

export interface FreeSlotOptions {
  /** Days to search, `end` exclusive. */
  range: DateRange;
  /** Minutes the meeting lasts. */
  duration: number;
  timeZone: string;
  /** Only events of these resources block a slot. Default: every event blocks. */
  resourceIds?: string[];
  /** Minutes between candidate starts. Default 15. */
  step?: number;
  /** Default Monday to Friday, 9:00 to 18:00. `null` searches whole days. */
  workingHours?: WorkingHours | null;
  /** No slot starts before this time (e.g. now). */
  after?: ZonedDateTime;
  /** Most slots returned. Default 10. */
  limit?: number;
}

const DEFAULT_HOURS: WorkingHours = { days: [1, 2, 3, 4, 5], start: 9 * 60, end: 18 * 60 };

/**
 * Times in `range` when none of the participants is busy, earliest first. Occurrences of
 * recurring events count, and all-day events block their whole days.
 */
export function findFreeSlots(
  events: readonly CalendarEvent[],
  {
    range,
    duration,
    timeZone,
    resourceIds,
    step = 15,
    workingHours = DEFAULT_HOURS,
    after,
    limit = 10,
  }: FreeSlotOptions,
): { start: ZonedDateTime; end: ZonedDateTime }[] {
  const busy = expandEvents(events, range, timeZone)
    .filter((event) => !resourceIds || event.resourceIds?.some((id) => resourceIds.includes(id)))
    .map((event) => eventBounds(event, timeZone));
  const hours = workingHours ?? { days: [0, 1, 2, 3, 4, 5, 6], start: 0, end: 24 * 60 };
  const earliest = after?.toDate().getTime() ?? -Infinity;
  const slots: { start: ZonedDateTime; end: ZonedDateTime }[] = [];

  for (let offset = 0; offset < daysBetween(range.start, range.end); offset++) {
    const day = range.start.add({ days: offset });
    if (!hours.days.includes(getDayOfWeek(day, "en-US", "sun"))) continue;
    for (let minutes = hours.start; minutes + duration <= hours.end; minutes += step) {
      const start = zonedAt(day, minutes, timeZone);
      const end = start.add({ minutes: duration });
      const [from, to] = [start.toDate().getTime(), end.toDate().getTime()];
      if (from < earliest) continue;
      if (busy.some((bounds) => bounds.start < to && from < bounds.end)) continue;
      slots.push({ start, end });
      if (slots.length === limit) return slots;
    }
  }
  return slots;
}
