import { startOfWeek, type CalendarDate, type DayOfWeek } from '@internationalized/date';

export type { DayOfWeek };

export interface WeekOptions {
	/** BCP 47 locale; decides the first day of the week when `firstDayOfWeek` is omitted. */
	locale: string;
	firstDayOfWeek?: DayOfWeek | undefined;
}

/** The 7 days of the week that contains `date`. */
export function weekDays(
	date: CalendarDate,
	{ locale, firstDayOfWeek }: WeekOptions
): CalendarDate[] {
	const start = startOfWeek(date, locale, firstDayOfWeek);
	return Array.from({ length: 7 }, (_, offset) => start.add({ days: offset }));
}
