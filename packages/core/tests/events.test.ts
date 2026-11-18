import { describe, expect, it } from 'vitest';
import { CalendarDate, parseZonedDateTime } from '@internationalized/date';
import { eventsInRange, isAllDay, matchesQuery, spansDays } from '../src/index.js';
import { allDay, timeZone, timed } from './fixtures.js';

const range = { start: new CalendarDate(2026, 11, 18), end: new CalendarDate(2026, 11, 19) };

describe('eventsInRange', () => {
	it('keeps events that overlap the range and drops the rest', () => {
		const events = [
			timed('inside', '2026-11-18T09:00', '2026-11-18T10:00'),
			timed('before', '2026-11-17T09:00', '2026-11-17T10:00'),
			timed('crosses-midnight', '2026-11-17T23:00', '2026-11-18T01:00'),
			timed('ends-at-range-start', '2026-11-17T22:00', '2026-11-18T00:00'),
			allDay('all-day', new CalendarDate(2026, 11, 18), new CalendarDate(2026, 11, 19)),
			allDay('all-day-next', new CalendarDate(2026, 11, 19), new CalendarDate(2026, 11, 20))
		];

		expect(eventsInRange(events, range, timeZone).map((event) => event.id)).toEqual([
			'inside',
			'crosses-midnight',
			'all-day'
		]);
	});

	it('includes a zero-length event that starts inside the range', () => {
		const events = [timed('reminder', '2026-11-18T08:00', '2026-11-18T08:00')];
		expect(eventsInRange(events, range, timeZone)).toHaveLength(1);
	});

	it('compares instants, so events stored in another time zone land on the right day', () => {
		// 2026-11-18 03:00 in Madrid is 2026-11-17 21:00 in Lima.
		const madrid = {
			id: 'madrid',
			title: 'madrid',
			start: parseZonedDateTime('2026-11-18T03:00[Europe/Madrid]'),
			end: parseZonedDateTime('2026-11-18T04:00[Europe/Madrid]')
		};
		expect(eventsInRange([madrid], range, timeZone)).toHaveLength(0);
	});
});

describe('isAllDay / spansDays', () => {
	it('treats date-only events as all-day', () => {
		expect(
			isAllDay(allDay('a', new CalendarDate(2026, 11, 18), new CalendarDate(2026, 11, 19)))
		).toBe(true);
		expect(isAllDay(timed('t', '2026-11-18T09:00', '2026-11-18T10:00'))).toBe(false);
	});

	it('flags timed events of 24 hours or more as day-spanning', () => {
		expect(spansDays(timed('long', '2026-11-18T09:00', '2026-11-19T09:00'))).toBe(true);
		expect(spansDays(timed('overnight', '2026-11-18T22:00', '2026-11-19T02:00'))).toBe(false);
	});
});

describe('matchesQuery', () => {
	const english = {
		...timed('english', '2026-11-18T19:00', '2026-11-18T20:30'),
		title: 'Clase de Inglés'
	};

	it('ignores accents and case', () => {
		expect(matchesQuery(english, 'ingles', 'es-PE')).toBe(true);
		expect(matchesQuery(english, 'CLASE', 'es-PE')).toBe(true);
		expect(matchesQuery(english, 'francés', 'es-PE')).toBe(false);
	});

	it('needs every word, in any order', () => {
		expect(matchesQuery(english, 'inglés clase', 'es-PE')).toBe(true);
		expect(matchesQuery(english, 'clase francés', 'es-PE')).toBe(false);
	});

	it('matches everything when the query is blank', () => {
		expect(matchesQuery(english, '   ', 'es-PE')).toBe(true);
	});
});
