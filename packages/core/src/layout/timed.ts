import {
	toCalendarDate,
	toTimeZone,
	type CalendarDate,
	type ZonedDateTime
} from '@internationalized/date';
import { spansDays } from '../events/queries.js';
import type { CalendarEvent, TimedEvent } from '../events/types.js';

const MINUTES_PER_DAY = 24 * 60;

export interface TimedEventLayout<T extends CalendarEvent = CalendarEvent> {
	event: T;
	/** Minutes from midnight (wall clock), clipped to the day. */
	start: number;
	/** Minutes from midnight (wall clock), clipped to the day; at least `start + minDuration`. */
	end: number;
	column: number;
	/** Columns in the overlap group this event belongs to. */
	columns: number;
	continuesBefore: boolean;
	continuesAfter: boolean;
}

export interface TimedLayoutOptions {
	/** Minimum visual length in minutes, so short events stay readable and do not overlap. */
	minDuration?: number | undefined;
}

const minutesOf = (time: ZonedDateTime) => time.hour * 60 + time.minute;

/**
 * Positions the timed events of `day` for a time grid (day and week views).
 * Overlapping events share the width in columns; an event reuses the first column that is free.
 * All-day and day-spanning events are skipped: they belong to the all-day row.
 */
export function layoutTimedEvents<T extends CalendarEvent>(
	events: readonly T[],
	day: CalendarDate,
	timeZone: string,
	{ minDuration = 15 }: TimedLayoutOptions = {}
): TimedEventLayout<T>[] {
	const items: TimedEventLayout<T>[] = [];

	for (const event of events) {
		if (spansDays(event)) continue;
		const timed = event as T & TimedEvent;
		const start = toTimeZone(timed.start, timeZone);
		const end = toTimeZone(timed.end, timeZone);
		const startsBefore = toCalendarDate(start).compare(day) < 0;
		const endsAfter = toCalendarDate(end).compare(day) > 0;
		const startMinutes = startsBefore ? 0 : minutesOf(start);
		const endMinutes = endsAfter ? MINUTES_PER_DAY : minutesOf(end);

		if (toCalendarDate(start).compare(day) > 0 || toCalendarDate(end).compare(day) < 0) continue;
		// Started on an earlier day and ended exactly at this day's midnight.
		if (startsBefore && endMinutes === 0) continue;

		items.push({
			event,
			start: startMinutes,
			end: Math.min(MINUTES_PER_DAY, Math.max(endMinutes, startMinutes + minDuration)),
			column: 0,
			columns: 1,
			continuesBefore: startsBefore,
			continuesAfter: endsAfter && !(endMinutes === MINUTES_PER_DAY && minutesOf(end) === 0)
		});
	}

	items.sort((a, b) => a.start - b.start || b.end - a.end);
	assignColumns(items);
	return items;
}

function assignColumns(items: TimedEventLayout<CalendarEvent>[]) {
	let group: TimedEventLayout<CalendarEvent>[] = [];
	let columnEnds: number[] = [];
	let groupEnd = -1;

	const closeGroup = () => {
		for (const item of group) item.columns = columnEnds.length;
	};

	for (const item of items) {
		if (item.start >= groupEnd) {
			closeGroup();
			group = [];
			columnEnds = [];
		}
		let column = columnEnds.findIndex((end) => end <= item.start);
		if (column === -1) column = columnEnds.push(item.end) - 1;
		else columnEnds[column] = item.end;

		item.column = column;
		group.push(item);
		groupEnd = Math.max(groupEnd, item.end);
	}
	closeGroup();
}
