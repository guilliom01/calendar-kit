import type { CalendarDate, ZonedDateTime } from '@internationalized/date';
import type { CalendarEvent } from '../events/types.js';

export interface IcsExportOptions {
	/** Calendar name for apps that show one (X-WR-CALNAME). */
	name?: string | undefined;
	/** PRODID of the file. */
	productId?: string | undefined;
	/** Time written as DTSTAMP. Defaults to now. */
	now?: Date | undefined;
}

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

const dateText = (date: { year: number; month: number; day: number }) =>
	`${pad(date.year, 4)}${pad(date.month)}${pad(date.day)}`;
const timeText = (time: { hour: number; minute: number; second: number }) =>
	`${pad(time.hour)}${pad(time.minute)}${pad(time.second)}`;

/** `NAME;params:value` for a date or time, keeping the event's own time zone. */
function dateProperty(name: string, value: CalendarDate | ZonedDateTime) {
	if (!('hour' in value)) return `${name};VALUE=DATE:${dateText(value)}`;
	if (value.timeZone === 'UTC') return `${name}:${dateText(value)}T${timeText(value)}Z`;
	return `${name};TZID=${value.timeZone}:${dateText(value)}T${timeText(value)}`;
}

/** Escapes TEXT values (RFC 5545 §3.3.11). */
export const escapeText = (text: string) =>
	text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Splits a line into 75-byte pieces (continuations start with a space), never inside a character. */
export function foldLine(line: string): string {
	const encoder = new TextEncoder();
	const pieces: string[] = [];
	let current = '';
	let bytes = 0;
	for (const character of line) {
		const size = encoder.encode(character).length;
		const limit = pieces.length === 0 ? 75 : 74;
		if (bytes + size > limit) {
			pieces.push(current);
			current = '';
			bytes = 0;
		}
		current += character;
		bytes += size;
	}
	pieces.push(current);
	return pieces.join('\r\n ');
}

function eventLines(event: CalendarEvent, stamp: string): string[] {
	const lines = [
		'BEGIN:VEVENT',
		`UID:${escapeText(event.id)}`,
		`DTSTAMP:${stamp}`,
		`SUMMARY:${escapeText(event.title)}`,
		dateProperty('DTSTART', event.start),
		dateProperty('DTEND', event.end)
	];
	if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
	if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
	if (event.rrule) lines.push(`RRULE:${event.rrule}`);
	for (const date of event.exdates ?? []) lines.push(dateProperty('EXDATE', date));
	// calendar-kit fields other apps ignore but a round trip keeps.
	if (event.color) lines.push(`X-CALENDAR-KIT-COLOR:${escapeText(event.color)}`);
	if (event.resourceIds?.length) {
		lines.push(`X-CALENDAR-KIT-RESOURCES:${event.resourceIds.map(escapeText).join(',')}`);
	}
	if (event.progress !== undefined) lines.push(`X-CALENDAR-KIT-PROGRESS:${event.progress}`);
	if (event.dependsOn?.length) {
		lines.push(`X-CALENDAR-KIT-DEPENDS-ON:${event.dependsOn.map(escapeText).join(',')}`);
	}
	lines.push('END:VEVENT');
	return lines;
}

/**
 * Serializes events as an iCalendar file (RFC 5545) that Google Calendar, Outlook and Apple
 * Calendar import. Pass the stored events (series, not expanded occurrences). Lines end in CRLF.
 */
export function toICS(events: readonly CalendarEvent[], options: IcsExportOptions = {}): string {
	const now = utcParts(options.now ?? new Date());
	const stamp = `${dateText(now)}T${timeText(now)}Z`;
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		`PRODID:${options.productId ?? '-//calendar-kit//EN'}`,
		'CALSCALE:GREGORIAN',
		...(options.name ? [`X-WR-CALNAME:${escapeText(options.name)}`] : []),
		...events.flatMap((event) => eventLines(event, stamp)),
		'END:VCALENDAR'
	];
	return lines.map(foldLine).join('\r\n') + '\r\n';
}

function utcParts(date: Date) {
	return {
		year: date.getUTCFullYear(),
		month: date.getUTCMonth() + 1,
		day: date.getUTCDate(),
		hour: date.getUTCHours(),
		minute: date.getUTCMinutes(),
		second: date.getUTCSeconds()
	};
}
