import { describe, expect, it } from 'vitest';
import { CalendarDate, parseZonedDateTime } from '@internationalized/date';
import { parseICS, toICS, type CalendarEvent } from '../src/index.js';
import { allDay, timeZone, timed } from './fixtures.js';

const stamp = new Date('2026-11-17T19:00:00Z');
const lines = (ics: string) => ics.split('\r\n');

describe('toICS', () => {
	it('writes a VCALENDAR with CRLF lines, all-day dates and zoned times', () => {
		const ics = toICS(
			[
				allDay('holiday', new CalendarDate(2026, 11, 24), new CalendarDate(2026, 11, 25)),
				timed('meeting', '2026-11-18T09:00', '2026-11-18T10:30')
			],
			{ now: stamp, name: 'Trabajo' }
		);

		expect(lines(ics)).toEqual([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//calendar-kit//EN',
			'CALSCALE:GREGORIAN',
			'X-WR-CALNAME:Trabajo',
			'BEGIN:VEVENT',
			'UID:holiday',
			'DTSTAMP:20261117T190000Z',
			'SUMMARY:holiday',
			'DTSTART;VALUE=DATE:20261124',
			'DTEND;VALUE=DATE:20261125',
			'END:VEVENT',
			'BEGIN:VEVENT',
			'UID:meeting',
			'DTSTAMP:20261117T190000Z',
			'SUMMARY:meeting',
			'DTSTART;TZID=America/Lima:20261118T090000',
			'DTEND;TZID=America/Lima:20261118T103000',
			'END:VEVENT',
			'END:VCALENDAR',
			''
		]);
	});

	it('escapes text and folds lines longer than 75 bytes without splitting characters', () => {
		const title = 'Reunión; revisión, cierre\\notas\n' + 'ñ'.repeat(60);
		const ics = toICS([{ ...timed('x', '2026-11-18T09:00', '2026-11-18T10:00'), title }], {
			now: stamp
		});

		const physical = lines(ics);
		for (const line of physical)
			expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
		const summary = ics
			.replace(/\r\n /g, '')
			.split('\r\n')
			.find((line) => line.startsWith('SUMMARY'));
		expect(summary).toBe(String.raw`SUMMARY:Reunión\; revisión\, cierre\\notas\n` + 'ñ'.repeat(60));
	});

	it('writes recurrence, exclusions, UTC times and calendar-kit fields', () => {
		const series = {
			...timed('class', '2026-11-16T18:00', '2026-11-16T20:00'),
			rrule: 'FREQ=WEEKLY;BYDAY=MO,WE',
			exdates: [parseZonedDateTime('2026-11-23T18:00[America/Lima]')],
			color: 'oklch(0.6 0.15 250)',
			resourceIds: ['room-a', 'ana'],
			progress: 0.5,
			dependsOn: ['design']
		};
		const utc = {
			id: 'utc',
			title: 'utc',
			start: parseZonedDateTime('2026-11-18T14:00[UTC]'),
			end: parseZonedDateTime('2026-11-18T15:00[UTC]')
		};
		const ics = lines(toICS([series, utc], { now: stamp }));

		expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE');
		expect(ics).toContain('EXDATE;TZID=America/Lima:20261123T180000');
		expect(ics).toContain('X-CALENDAR-KIT-COLOR:oklch(0.6 0.15 250)');
		expect(ics).toContain('X-CALENDAR-KIT-RESOURCES:room-a,ana');
		expect(ics).toContain('X-CALENDAR-KIT-PROGRESS:0.5');
		expect(ics).toContain('X-CALENDAR-KIT-DEPENDS-ON:design');
		expect(ics).toContain('DTSTART:20261118T140000Z');
	});
});

describe('parseICS', () => {
	it('reads back what toICS writes', () => {
		const events: CalendarEvent[] = [
			allDay('holiday', new CalendarDate(2026, 11, 24), new CalendarDate(2026, 11, 25)),
			{
				...timed('class', '2026-11-16T18:00', '2026-11-16T20:00'),
				title: 'Clase; de inglés, nivel 2\nAula 3',
				rrule: 'FREQ=WEEKLY;BYDAY=MO,WE',
				exdates: [parseZonedDateTime('2026-11-23T18:00[America/Lima]')],
				color: 'oklch(0.6 0.15 250)',
				resourceIds: ['room-a'],
				progress: 0.25,
				dependsOn: ['holiday']
			}
		];
		const { events: imported, warnings } = parseICS(toICS(events, { now: stamp }));

		expect(warnings).toEqual([]);
		expect(
			imported.map((event) => ({
				...event,
				start: String(event.start),
				end: String(event.end),
				exdates: event.exdates?.map(String)
			}))
		).toEqual(
			events.map((event) => ({
				...event,
				start: String(event.start),
				end: String(event.end),
				exdates: event.exdates?.map(String)
			}))
		);
	});

	it('handles what other apps export: folding, UTC, floating times, DURATION and missing DTEND', () => {
		const text = [
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'BEGIN:VTIMEZONE',
			'TZID:America/Lima',
			'BEGIN:STANDARD',
			'DTSTART:19700101T000000',
			'TZOFFSETFROM:-0500',
			'TZOFFSETTO:-0500',
			'END:STANDARD',
			'END:VTIMEZONE',
			'BEGIN:VEVENT',
			'UID:a@google.com',
			'SUMMARY:Una descripción muy larga que el exportador partió en',
			'  dos líneas',
			'DTSTART:20261118T140000Z',
			'DTEND:20261118T150000Z',
			'END:VEVENT',
			'BEGIN:VEVENT',
			'UID:b',
			'SUMMARY:Flotante',
			'DTSTART:20261119T090000',
			'DURATION:PT1H30M',
			'END:VEVENT',
			'BEGIN:VEVENT',
			'UID:c',
			'SUMMARY:Día entero sin fin',
			'DTSTART;VALUE=DATE:20261120',
			'END:VEVENT',
			'END:VCALENDAR'
		].join('\n');

		const { events } = parseICS(text, { timeZone });
		expect(
			events.map((event) => [event.id, event.title, String(event.start), String(event.end)])
		).toEqual([
			[
				'a@google.com',
				'Una descripción muy larga que el exportador partió en dos líneas',
				'2026-11-18T14:00:00+00:00[UTC]',
				'2026-11-18T15:00:00+00:00[UTC]'
			],
			[
				'b',
				'Flotante',
				'2026-11-19T09:00:00-05:00[America/Lima]',
				'2026-11-19T10:30:00-05:00[America/Lima]'
			],
			['c', 'Día entero sin fin', '2026-11-20', '2026-11-21']
		]);
	});

	it('turns modified occurrences into an exclusion plus a single event, and skips cancelled ones', () => {
		const text = [
			'BEGIN:VCALENDAR',
			'BEGIN:VEVENT',
			'UID:series',
			'SUMMARY:Clase',
			'DTSTART;TZID=America/Lima:20261116T180000',
			'DTEND;TZID=America/Lima:20261116T190000',
			'RRULE:FREQ=WEEKLY;COUNT=4',
			'END:VEVENT',
			'BEGIN:VEVENT',
			'UID:series',
			'RECURRENCE-ID;TZID=America/Lima:20261123T180000',
			'SUMMARY:Clase (cambiada de hora)',
			'DTSTART;TZID=America/Lima:20261123T200000',
			'DTEND;TZID=America/Lima:20261123T210000',
			'END:VEVENT',
			'BEGIN:VEVENT',
			'UID:gone',
			'STATUS:CANCELLED',
			'SUMMARY:Cancelado',
			'DTSTART;VALUE=DATE:20261125',
			'END:VEVENT',
			'END:VCALENDAR'
		].join('\r\n');

		const { events } = parseICS(text);
		expect(events.map((event) => event.id)).toEqual([
			'series',
			'series::2026-11-23T18:00:00-05:00[America/Lima]'
		]);
		expect(events[0]?.exdates?.map(String)).toEqual(['2026-11-23T18:00:00-05:00[America/Lima]']);
		expect(events[1]).toMatchObject({ title: 'Clase (cambiada de hora)' });
		expect(events[1]).not.toHaveProperty('rrule');
	});

	it('keeps events whose rule or time zone it cannot use, and says why', () => {
		const text = [
			'BEGIN:VCALENDAR',
			'BEGIN:VEVENT',
			'UID:hourly',
			'SUMMARY:Cada hora',
			'DTSTART:20261118T090000Z',
			'RRULE:FREQ=HOURLY',
			'END:VEVENT',
			'BEGIN:VEVENT',
			'UID:windows',
			'SUMMARY:Zona de Windows',
			'DTSTART;TZID=SA Pacific Standard Time:20261118T090000',
			'END:VEVENT',
			'END:VCALENDAR'
		].join('\r\n');

		const { events, warnings } = parseICS(text, { timeZone });
		expect(events.map((event) => [event.id, event.rrule, String(event.start)])).toEqual([
			['hourly', undefined, '2026-11-18T09:00:00+00:00[UTC]'],
			['windows', undefined, '2026-11-18T09:00:00-05:00[America/Lima]']
		]);
		expect(warnings).toEqual([
			'hourly: unsupported recurrence rule (Unsupported FREQ: HOURLY); imported as a single event',
			'windows: unknown time zone "SA Pacific Standard Time"; read as America/Lima'
		]);
	});
});
