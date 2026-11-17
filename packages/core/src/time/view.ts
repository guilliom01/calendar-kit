import {
	endOfMonth,
	endOfWeek,
	startOfMonth,
	startOfWeek,
	type CalendarDate
} from '@internationalized/date';
import type { WeekOptions } from './week.js';

export type CalendarView = 'month' | 'week' | 'day';

/** Range of days; `end` is exclusive. */
export interface DateRange {
	start: CalendarDate;
	end: CalendarDate;
}

/** The days a view shows around `date`. The month view includes the leading and trailing days of its grid. */
export function viewRange(date: CalendarDate, view: CalendarView, options: WeekOptions): DateRange {
	const { locale, firstDayOfWeek } = options;

	if (view === 'day') return { start: date, end: date.add({ days: 1 }) };
	if (view === 'week') {
		const start = startOfWeek(date, locale, firstDayOfWeek);
		return { start, end: start.add({ weeks: 1 }) };
	}
	return {
		start: startOfWeek(startOfMonth(date), locale, firstDayOfWeek),
		end: endOfWeek(endOfMonth(date), locale, firstDayOfWeek).add({ days: 1 })
	};
}

const units = { month: 'months', week: 'weeks', day: 'days' } as const;

/** Moves `date` by `amount` units of the view (used by previous/next navigation). */
export function shiftDate(date: CalendarDate, view: CalendarView, amount: number): CalendarDate {
	return date.add({ [units[view]]: amount });
}
