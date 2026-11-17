import { CalendarDate, parseZonedDateTime } from '@internationalized/date';
import type { CalendarEvent } from '../src/index.js';

export const locale = 'es-PE';
export const timeZone = 'America/Lima';

/** Timed event in Lima, e.g. timed('a', '2026-11-18T09:00', '2026-11-18T10:30'). */
export function timed(id: string, start: string, end: string): CalendarEvent {
	return {
		id,
		title: id,
		start: parseZonedDateTime(`${start}[${timeZone}]`),
		end: parseZonedDateTime(`${end}[${timeZone}]`)
	};
}

/** All-day event; `end` is exclusive, as in iCalendar. */
export function allDay(id: string, start: CalendarDate, end: CalendarDate): CalendarEvent {
	return { id, title: id, start, end };
}
