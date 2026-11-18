import type { CalendarDate, ZonedDateTime } from "@internationalized/date";
import { isAllDay } from "../events/queries.js";
import type { CalendarEvent } from "../events/types.js";
import { daysBetween } from "../time/week.js";

const isZoned = (value: CalendarDate | ZonedDateTime): value is ZonedDateTime => "hour" in value;

/**
 * Returns a copy of `event` starting at `start`, with the same duration.
 * All-day events take a `CalendarDate`; timed events take a `ZonedDateTime`.
 */
export function moveEvent<T extends CalendarEvent>(
  event: T,
  start: CalendarDate | ZonedDateTime,
): T {
  if (isAllDay(event)) {
    if (isZoned(start)) throw new TypeError("All-day events move to a CalendarDate.");
    return { ...event, start, end: start.add({ days: daysBetween(event.start, event.end) }) };
  }
  if (!isZoned(start)) throw new TypeError("Timed events move to a ZonedDateTime.");
  const duration = event.end.toDate().getTime() - event.start.toDate().getTime();
  return { ...event, start, end: start.add({ milliseconds: duration }) };
}

export interface ResizeOptions {
  /** Shortest allowed timed event, in minutes. */
  minDuration?: number | undefined;
}

/**
 * Returns a copy of `event` ending at `end` (exclusive). The event never gets shorter than
 * `minDuration` minutes (timed) or one day (all-day).
 */
export function resizeEvent<T extends CalendarEvent>(
  event: T,
  end: CalendarDate | ZonedDateTime,
  { minDuration = 15 }: ResizeOptions = {},
): T {
  if (isAllDay(event)) {
    if (isZoned(end)) throw new TypeError("All-day events end on a CalendarDate.");
    const shortest = event.start.add({ days: 1 });
    return { ...event, end: end.compare(shortest) < 0 ? shortest : end };
  }
  if (!isZoned(end)) throw new TypeError("Timed events end on a ZonedDateTime.");
  const shortest = event.start.add({ minutes: minDuration });
  return { ...event, end: end.compare(shortest) < 0 ? shortest : end };
}

/**
 * Returns a copy of `event` starting at `start`, keeping its end. The event never gets shorter
 * than `minDuration` minutes (timed) or one day (all-day).
 */
export function resizeEventStart<T extends CalendarEvent>(
  event: T,
  start: CalendarDate | ZonedDateTime,
  { minDuration = 15 }: ResizeOptions = {},
): T {
  if (isAllDay(event)) {
    if (isZoned(start)) throw new TypeError("All-day events start on a CalendarDate.");
    const latest = event.end.subtract({ days: 1 });
    return { ...event, start: start.compare(latest) > 0 ? latest : start };
  }
  if (!isZoned(start)) throw new TypeError("Timed events start on a ZonedDateTime.");
  const latest = event.end.subtract({ minutes: minDuration });
  return { ...event, start: start.compare(latest) > 0 ? latest : start };
}
