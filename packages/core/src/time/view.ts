import {
	endOfMonth,
	endOfWeek,
	startOfMonth,
	startOfWeek,
	type CalendarDate
} from '@internationalized/date';
import type { WeekOptions } from './week.js';

/**
 * - `month`, `week`, `day`: classic grids.
 * - `year`: twelve small months. `agenda`: a list of the month's events, day by day.
 * - `timeline`: resources as rows, the week's days as columns. `resources`: a day with one column per resource.
 * - `gantt`: one row per event across the month.
 */
export type CalendarView =
	| 'month'
	| 'week'
	| 'day'
	| 'year'
	| 'agenda'
	| 'timeline'
	| 'resources'
	| 'gantt';

/** Range of days; `end` is exclusive. */
export interface DateRange {
	start: CalendarDate;
	end: CalendarDate;
}

/** The days a view shows around `date`. The month view includes the leading and trailing days of its grid. */
export function viewRange(date: CalendarDate, view: CalendarView, options: WeekOptions): DateRange {
	const { locale, firstDayOfWeek } = options;

	if (view === 'day' || view === 'resources') return { start: date, end: date.add({ days: 1 }) };
	if (view === 'year') {
		const start = date.set({ month: 1, day: 1 });
		return { start, end: start.add({ years: 1 }) };
	}
	if (view === 'agenda' || view === 'gantt') {
		const start = startOfMonth(date);
		return { start, end: start.add({ months: 1 }) };
	}
	if (view === 'week' || view === 'timeline') {
		const start = startOfWeek(date, locale, firstDayOfWeek);
		return { start, end: start.add({ weeks: 1 }) };
	}
	return {
		start: startOfWeek(startOfMonth(date), locale, firstDayOfWeek),
		end: endOfWeek(endOfMonth(date), locale, firstDayOfWeek).add({ days: 1 })
	};
}

const units = {
	month: 'months',
	week: 'weeks',
	day: 'days',
	year: 'years',
	agenda: 'months',
	timeline: 'weeks',
	resources: 'days',
	gantt: 'months'
} as const;

/** Moves `date` by `amount` units of the view (used by previous/next navigation). */
export function shiftDate(date: CalendarDate, view: CalendarView, amount: number): CalendarDate {
	return date.add({ [units[view]]: amount });
}
