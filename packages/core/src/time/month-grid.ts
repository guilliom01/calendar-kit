import { endOfMonth, endOfWeek, startOfMonth, type CalendarDate } from '@internationalized/date';
import { weekDays, type WeekOptions } from './week.js';

/** Full weeks (7 days each) covering the month that contains `month`. */
export function monthGrid(month: CalendarDate, options: WeekOptions): CalendarDate[][] {
	const last = endOfWeek(endOfMonth(month), options.locale, options.firstDayOfWeek);
	const weeks: CalendarDate[][] = [];

	for (let day = startOfMonth(month); ; day = day.add({ weeks: 1 })) {
		const week = weekDays(day, options);
		weeks.push(week);
		if (week[6]!.compare(last) >= 0) return weeks;
	}
}
