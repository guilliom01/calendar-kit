import { describe, expect, it } from 'vitest';
import { CalendarDate, parseZonedDateTime } from '@internationalized/date';
import { moveEvent, resizeEvent, resizeEventStart, snapMinutes, zonedAt } from '../src/index.js';
import { allDay, timeZone, timed } from './fixtures.js';

const day = new CalendarDate(2026, 11, 18);
const lima = (value: string) => parseZonedDateTime(`${value}[${timeZone}]`);

describe('snapMinutes', () => {
	it('rounds to the nearest step and stays inside the day', () => {
		expect(snapMinutes(547, 15)).toBe(540);
		expect(snapMinutes(553, 15)).toBe(555);
		expect(snapMinutes(-20, 15)).toBe(0);
		expect(snapMinutes(1500, 15)).toBe(1440);
		expect(snapMinutes(547, 30)).toBe(540);
	});
});

describe('zonedAt', () => {
	it('builds the wall-clock time of a day', () => {
		expect(zonedAt(day, 570, timeZone).toString()).toBe(lima('2026-11-18T09:30').toString());
	});

	it('treats minute 1440 as midnight of the next day', () => {
		expect(zonedAt(day, 1440, timeZone).toString()).toBe(lima('2026-11-19T00:00').toString());
	});
});

describe('moveEvent', () => {
	it('moves a timed event and keeps its duration', () => {
		const moved = moveEvent(
			timed('a', '2026-11-18T09:00', '2026-11-18T10:30'),
			lima('2026-11-20T14:00')
		);

		expect(moved.start.toString()).toBe(lima('2026-11-20T14:00').toString());
		expect(moved.end.toString()).toBe(lima('2026-11-20T15:30').toString());
		expect(moved.id).toBe('a');
	});

	it('moves an all-day event and keeps its number of days', () => {
		const moved = moveEvent(
			allDay('trip', day, new CalendarDate(2026, 11, 21)),
			new CalendarDate(2026, 11, 25)
		);

		expect([moved.start.toString(), moved.end.toString()]).toEqual(['2026-11-25', '2026-11-28']);
	});

	it('does not mutate the original event', () => {
		const original = timed('a', '2026-11-18T09:00', '2026-11-18T10:00');
		moveEvent(original, lima('2026-11-18T12:00'));
		expect(original.start.toString()).toBe(lima('2026-11-18T09:00').toString());
	});

	it('rejects moving an event to a start of the other kind', () => {
		expect(() =>
			moveEvent(timed('a', '2026-11-18T09:00', '2026-11-18T10:00'), new CalendarDate(2026, 11, 19))
		).toThrow(TypeError);
	});
});

describe('resizeEvent', () => {
	it('changes the end of a timed event', () => {
		const resized = resizeEvent(
			timed('a', '2026-11-18T09:00', '2026-11-18T10:00'),
			lima('2026-11-18T11:15')
		);
		expect(resized.end.toString()).toBe(lima('2026-11-18T11:15').toString());
	});

	it('keeps at least the minimum duration', () => {
		const resized = resizeEvent(
			timed('a', '2026-11-18T09:00', '2026-11-18T10:00'),
			lima('2026-11-18T08:00')
		);
		expect(resized.end.toString()).toBe(lima('2026-11-18T09:15').toString());
	});

	it('keeps at least one day for all-day events', () => {
		const resized = resizeEvent(allDay('trip', day, new CalendarDate(2026, 11, 20)), day);
		expect(resized.end.toString()).toBe('2026-11-19');
	});
});

describe('resizeEventStart', () => {
	it('changes the start of a timed event and keeps its end', () => {
		const resized = resizeEventStart(
			timed('a', '2026-11-18T09:00', '2026-11-18T10:00'),
			lima('2026-11-18T08:30')
		);
		expect(resized.start.toString()).toBe(lima('2026-11-18T08:30').toString());
		expect(resized.end.toString()).toBe(lima('2026-11-18T10:00').toString());
	});

	it('keeps at least the minimum duration', () => {
		const resized = resizeEventStart(
			timed('a', '2026-11-18T09:00', '2026-11-18T10:00'),
			lima('2026-11-18T11:00'),
			{ minDuration: 30 }
		);
		expect(resized.start.toString()).toBe(lima('2026-11-18T09:30').toString());
	});

	it('changes the first day of an all-day event, keeping at least one day', () => {
		const trip = allDay('trip', day, new CalendarDate(2026, 11, 20));
		expect(resizeEventStart(trip, new CalendarDate(2026, 11, 16)).start.toString()).toBe(
			'2026-11-16'
		);
		expect(resizeEventStart(trip, new CalendarDate(2026, 11, 25)).start.toString()).toBe(
			'2026-11-19'
		);
	});
});
