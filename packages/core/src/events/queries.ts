import { toZoned, type CalendarDate } from '@internationalized/date';
import type { DateRange } from '../time/view.js';
import type { AllDayEvent, CalendarEvent } from './types.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function isAllDay<T>(event: CalendarEvent<T>): event is AllDayEvent<T> {
	return !('hour' in event.start);
}

/** True for events shown in the all-day row: all-day events and timed events of 24 hours or more. */
export function spansDays(event: CalendarEvent): boolean {
	if (isAllDay(event)) return true;
	return event.end.toDate().getTime() - event.start.toDate().getTime() >= DAY_MS;
}

/** Epoch milliseconds of midnight starting `date` in `timeZone`. */
export function startOfDayMs(date: CalendarDate, timeZone: string): number {
	return toZoned(date, timeZone).toDate().getTime();
}

/**
 * Event bounds in epoch milliseconds. All-day dates are read in `timeZone`.
 * Zero-length events get 1 ms so they still overlap the moment they happen.
 */
export function eventBounds(
	event: CalendarEvent,
	timeZone: string
): { start: number; end: number } {
	const start = isAllDay(event)
		? startOfDayMs(event.start, timeZone)
		: event.start.toDate().getTime();
	const end = isAllDay(event) ? startOfDayMs(event.end, timeZone) : event.end.toDate().getTime();
	return { start, end: Math.max(end, start + 1) };
}

/** Events that overlap `range` (end exclusive) when seen from `timeZone`. Keeps input order. */
export function eventsInRange<T extends CalendarEvent>(
	events: readonly T[],
	range: DateRange,
	timeZone: string
): T[] {
	const rangeStart = startOfDayMs(range.start, timeZone);
	const rangeEnd = startOfDayMs(range.end, timeZone);

	return events.filter((event) => {
		const { start, end } = eventBounds(event, timeZone);
		return start < rangeEnd && end > rangeStart;
	});
}

/** Lowercase text without accents, so "Inglés" and "ingles" compare equal. */
const fold = (text: string, locale: string) =>
	text
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLocaleLowerCase(locale);

/**
 * Whether `event`'s title, location and description together contain every word of `query`,
 * ignoring accents and case. A blank query matches every event.
 */
export function matchesQuery(event: CalendarEvent, query: string, locale: string): boolean {
	const text = fold([event.title, event.location ?? '', event.description ?? ''].join(' '), locale);
	return fold(query, locale)
		.split(/\s+/)
		.every((word) => text.includes(word));
}
