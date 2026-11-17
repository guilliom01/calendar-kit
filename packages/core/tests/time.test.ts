import { describe, expect, it } from 'vitest';
import { CalendarDate } from '@internationalized/date';
import { daysBetween, monthGrid, shiftDate, viewRange, weekDays } from '../src/index.js';

const locale = 'es-PE';
const iso = (dates: CalendarDate[]) => dates.map((date) => date.toString());

describe('monthGrid', () => {
	it('returns full weeks that cover the month, starting on the locale first day', () => {
		// November 2026 starts on a Sunday and ends on a Monday; es-PE weeks start on Sunday.
		const weeks = monthGrid(new CalendarDate(2026, 11, 17), { locale }).map(iso);

		expect(weeks).toHaveLength(5);
		expect(weeks[0]).toEqual([
			'2026-11-01',
			'2026-11-02',
			'2026-11-03',
			'2026-11-04',
			'2026-11-05',
			'2026-11-06',
			'2026-11-07'
		]);
		expect(weeks.at(-1)?.at(-1)).toBe('2026-12-05');
	});

	it('honors an explicit first day of the week', () => {
		const weeks = monthGrid(new CalendarDate(2026, 11, 1), {
			locale,
			firstDayOfWeek: 'mon'
		}).map(iso);

		expect(weeks).toHaveLength(6);
		expect(weeks[0]?.[0]).toBe('2026-10-26');
		expect(weeks.at(-1)?.at(-1)).toBe('2026-12-06');
	});
});

describe('weekDays', () => {
	it('returns the 7 days of the week that contains the date', () => {
		expect(iso(weekDays(new CalendarDate(2026, 11, 18), { locale }))).toEqual([
			'2026-11-15',
			'2026-11-16',
			'2026-11-17',
			'2026-11-18',
			'2026-11-19',
			'2026-11-20',
			'2026-11-21'
		]);
	});
});

describe('viewRange', () => {
	const date = new CalendarDate(2026, 11, 18);

	it('covers the visible month grid for the month view (end is exclusive)', () => {
		const range = viewRange(date, 'month', { locale });
		expect([range.start.toString(), range.end.toString()]).toEqual(['2026-11-01', '2026-12-06']);
	});

	it('covers one week for the week view', () => {
		const range = viewRange(date, 'week', { locale });
		expect([range.start.toString(), range.end.toString()]).toEqual(['2026-11-15', '2026-11-22']);
	});

	it('covers one day for the day view', () => {
		const range = viewRange(date, 'day', { locale });
		expect([range.start.toString(), range.end.toString()]).toEqual(['2026-11-18', '2026-11-19']);
	});
});

describe('shiftDate', () => {
	it('moves by one unit of the view', () => {
		const date = new CalendarDate(2026, 1, 31);
		expect(shiftDate(date, 'month', 1).toString()).toBe('2026-02-28');
		expect(shiftDate(date, 'week', -1).toString()).toBe('2026-01-24');
		expect(shiftDate(date, 'day', 1).toString()).toBe('2026-02-01');
	});
});

describe('daysBetween', () => {
	it('counts calendar days, also across months and backwards', () => {
		expect(daysBetween(new CalendarDate(2026, 11, 28), new CalendarDate(2026, 12, 3))).toBe(5);
		expect(daysBetween(new CalendarDate(2026, 11, 18), new CalendarDate(2026, 11, 15))).toBe(-3);
	});
});

describe('viewRange for the phase 4 views', () => {
	const date = new CalendarDate(2026, 11, 18);
	const range = (view: Parameters<typeof viewRange>[1]) => {
		const { start, end } = viewRange(date, view, { locale });
		return [start.toString(), end.toString()];
	};

	it('covers the calendar year, month, week or day without grid padding', () => {
		expect(range('year')).toEqual(['2026-01-01', '2027-01-01']);
		expect(range('agenda')).toEqual(['2026-11-01', '2026-12-01']);
		expect(range('gantt')).toEqual(['2026-11-01', '2026-12-01']);
		expect(range('timeline')).toEqual(['2026-11-15', '2026-11-22']);
		expect(range('resources')).toEqual(['2026-11-18', '2026-11-19']);
	});

	it('moves by the unit each view shows', () => {
		expect(shiftDate(date, 'year', 1).toString()).toBe('2027-11-18');
		expect(shiftDate(date, 'agenda', -1).toString()).toBe('2026-10-18');
		expect(shiftDate(date, 'timeline', 1).toString()).toBe('2026-11-25');
		expect(shiftDate(date, 'resources', 1).toString()).toBe('2026-11-19');
	});
});
