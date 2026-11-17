import { describe, expect, it } from 'vitest';
import { CalendarDate } from '@internationalized/date';
import { layoutTimedEvents, layoutWeekRow, weekDays } from '../src/index.js';
import { allDay, locale, timeZone, timed } from './fixtures.js';

const day = new CalendarDate(2026, 11, 18);

describe('layoutTimedEvents', () => {
	it('places a single event by wall-clock minutes in one full-width column', () => {
		const [item] = layoutTimedEvents(
			[timed('a', '2026-11-18T09:00', '2026-11-18T10:30')],
			day,
			timeZone
		);

		expect(item).toMatchObject({ start: 540, end: 630, column: 0, columns: 1 });
		expect(item?.event.id).toBe('a');
	});

	it('splits overlapping events into columns and keeps separate groups full width', () => {
		const items = layoutTimedEvents(
			[
				timed('a', '2026-11-18T09:00', '2026-11-18T11:00'),
				timed('b', '2026-11-18T10:00', '2026-11-18T12:00'),
				timed('c', '2026-11-18T11:00', '2026-11-18T12:00'),
				timed('d', '2026-11-18T14:00', '2026-11-18T15:00')
			],
			day,
			timeZone
		);
		const byId = Object.fromEntries(items.map((item) => [item.event.id, item]));

		// a and b overlap; c starts when a ends, so it reuses a's column.
		expect(byId.a).toMatchObject({ column: 0, columns: 2 });
		expect(byId.b).toMatchObject({ column: 1, columns: 2 });
		expect(byId.c).toMatchObject({ column: 0, columns: 2 });
		expect(byId.d).toMatchObject({ column: 0, columns: 1 });
	});

	it('clips events that cross midnight to the visible day', () => {
		const items = layoutTimedEvents(
			[
				timed('late', '2026-11-17T22:00', '2026-11-18T01:00'),
				timed('night', '2026-11-18T23:00', '2026-11-19T02:00')
			],
			day,
			timeZone
		);

		expect(items.map(({ start, end }) => [start, end])).toEqual([
			[0, 60],
			[1380, 1440]
		]);
		expect(items[0]).toMatchObject({ continuesBefore: true, continuesAfter: false });
		expect(items[1]).toMatchObject({ continuesBefore: false, continuesAfter: true });
	});

	it('gives very short events a minimum duration so they do not overlap visually', () => {
		const items = layoutTimedEvents(
			[
				timed('reminder', '2026-11-18T09:00', '2026-11-18T09:00'),
				timed('next', '2026-11-18T09:10', '2026-11-18T09:40')
			],
			day,
			timeZone
		);

		expect(items[0]).toMatchObject({ start: 540, end: 555, columns: 2 });
	});

	it('ignores all-day and day-spanning events (they belong to the all-day row)', () => {
		const items = layoutTimedEvents(
			[
				allDay('holiday', day, day.add({ days: 1 })),
				timed('trip', '2026-11-17T08:00', '2026-11-19T08:00')
			],
			day,
			timeZone
		);
		expect(items).toEqual([]);
	});
});

describe('layoutWeekRow', () => {
	const days = weekDays(day, { locale }); // 2026-11-15 .. 2026-11-21

	it('packs multi-day events into the lowest free lane', () => {
		const items = layoutWeekRow(
			[
				allDay('long', new CalendarDate(2026, 11, 16), new CalendarDate(2026, 11, 20)),
				allDay('short', new CalendarDate(2026, 11, 20), new CalendarDate(2026, 11, 21)),
				timed('meeting', '2026-11-17T09:00', '2026-11-17T10:00')
			],
			days,
			timeZone
		);
		const byId = Object.fromEntries(items.map((item) => [item.event.id, item]));

		expect(byId.long).toMatchObject({ startIndex: 1, span: 4, lane: 0 });
		expect(byId.short).toMatchObject({ startIndex: 5, span: 1, lane: 0 });
		expect(byId.meeting).toMatchObject({ startIndex: 2, span: 1, lane: 1 });
	});

	it('clips events that start before or end after the row', () => {
		const [item] = layoutWeekRow(
			[allDay('trip', new CalendarDate(2026, 11, 10), new CalendarDate(2026, 11, 25))],
			days,
			timeZone
		);
		expect(item).toMatchObject({
			startIndex: 0,
			span: 7,
			continuesBefore: true,
			continuesAfter: true
		});
	});

	it('orders lanes so longer and earlier events come first', () => {
		const items = layoutWeekRow(
			[
				timed('late', '2026-11-16T15:00', '2026-11-16T16:00'),
				timed('early', '2026-11-16T08:00', '2026-11-16T09:00'),
				allDay('two-days', new CalendarDate(2026, 11, 16), new CalendarDate(2026, 11, 18))
			],
			days,
			timeZone
		);
		expect(items.map((item) => [item.event.id, item.lane])).toEqual([
			['two-days', 0],
			['early', 1],
			['late', 2]
		]);
	});
});
