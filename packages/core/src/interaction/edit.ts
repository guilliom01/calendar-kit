import type { CalendarDate, ZonedDateTime } from '@internationalized/date';
import { isAllDay } from '../events/queries.js';
import type { CalendarEvent } from '../events/types.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const isZoned = (value: CalendarDate | ZonedDateTime): value is ZonedDateTime => 'hour' in value;

/** Whole days from `from` to `to` (calendar days, not affected by DST). */
const daysBetween = (from: CalendarDate, to: CalendarDate) =>
	Math.round((to.toDate('UTC').getTime() - from.toDate('UTC').getTime()) / DAY_MS);

/**
 * Returns a copy of `event` starting at `start`, with the same duration.
 * All-day events take a `CalendarDate`; timed events take a `ZonedDateTime`.
 */
export function moveEvent<T extends CalendarEvent>(
	event: T,
	start: CalendarDate | ZonedDateTime
): T {
	if (isAllDay(event)) {
		if (isZoned(start)) throw new TypeError('All-day events move to a CalendarDate.');
		return { ...event, start, end: start.add({ days: daysBetween(event.start, event.end) }) };
	}
	if (!isZoned(start)) throw new TypeError('Timed events move to a ZonedDateTime.');
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
	{ minDuration = 15 }: ResizeOptions = {}
): T {
	if (isAllDay(event)) {
		if (isZoned(end)) throw new TypeError('All-day events end on a CalendarDate.');
		const shortest = event.start.add({ days: 1 });
		return { ...event, end: end.compare(shortest) < 0 ? shortest : end };
	}
	if (!isZoned(end)) throw new TypeError('Timed events end on a ZonedDateTime.');
	const shortest = event.start.add({ minutes: minDuration });
	return { ...event, end: end.compare(shortest) < 0 ? shortest : end };
}
