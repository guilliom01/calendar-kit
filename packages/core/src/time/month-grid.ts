import {
	endOfMonth,
	endOfWeek,
	startOfMonth,
	startOfWeek,
	type CalendarDate,
	type DayOfWeek
} from '@internationalized/date';

export type { DayOfWeek };

export interface MonthGridOptions {
	/** BCP 47 locale; decides the first day of the week when `firstDayOfWeek` is omitted. */
	locale: string;
	firstDayOfWeek?: DayOfWeek | undefined;
}

/** Full weeks (7 days each) covering the month that contains `month`. */
export function monthGrid(month: CalendarDate, options: MonthGridOptions): CalendarDate[][] {
	const { locale, firstDayOfWeek } = options;
	const last = endOfWeek(endOfMonth(month), locale, firstDayOfWeek);
	const weeks: CalendarDate[][] = [];

	for (
		let day = startOfWeek(startOfMonth(month), locale, firstDayOfWeek);
		day.compare(last) <= 0;
		day = day.add({ weeks: 1 })
	) {
		weeks.push(Array.from({ length: 7 }, (_, offset) => day.add({ days: offset })));
	}

	return weeks;
}
