import { describe, expect, it } from 'vitest';
import { CalendarDate } from '@internationalized/date';
import { monthGrid } from '../src/index.js';

const iso = (weeks: CalendarDate[][]) => weeks.map((week) => week.map((day) => day.toString()));

describe('monthGrid', () => {
	it('returns full weeks that cover the month, starting on the locale first day', () => {
		// November 2026 starts on a Sunday and ends on a Monday.
		const weeks = iso(monthGrid(new CalendarDate(2026, 11, 17), { locale: 'en-US' }));

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
		const weeks = iso(
			monthGrid(new CalendarDate(2026, 11, 1), { locale: 'en-US', firstDayOfWeek: 'mon' })
		);

		expect(weeks).toHaveLength(6);
		expect(weeks[0]?.[0]).toBe('2026-10-26');
		expect(weeks.at(-1)?.at(-1)).toBe('2026-12-06');
	});

	it('uses the locale week start when none is given', () => {
		// es-ES weeks start on Monday.
		const weeks = iso(monthGrid(new CalendarDate(2026, 2, 10), { locale: 'es-ES' }));

		expect(weeks[0]?.[0]).toBe('2026-01-26');
		expect(weeks.every((week) => week.length === 7)).toBe(true);
	});
});
