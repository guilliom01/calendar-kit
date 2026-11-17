import { createContext } from 'svelte';
import { DateFormatter, getLocalTimeZone, today, type CalendarDate } from '@internationalized/date';
import {
	eventsInRange,
	shiftDate,
	viewRange,
	weekDays,
	type CalendarEvent,
	type CalendarView,
	type DayOfWeek
} from '@calendar-kit/core';

export interface CalendarStateOptions<T extends CalendarEvent> {
	events?: T[];
	view?: CalendarView;
	/** Date the calendar is centered on. Defaults to today. */
	date?: CalendarDate;
	/** BCP 47 locale for labels and the first day of the week. Defaults to the browser locale. */
	locale?: string;
	/** IANA time zone used to show events. Defaults to the browser time zone. */
	timeZone?: string;
	firstDayOfWeek?: DayOfWeek;
}

/** Reactive calendar state shared by the toolbar and the views through context. */
export class CalendarState<T extends CalendarEvent = CalendarEvent> {
	events: T[] = $state.raw([]);
	view: CalendarView = $state('month');
	date: CalendarDate = $state.raw(today(getLocalTimeZone()));
	locale: string = $state(new Intl.DateTimeFormat().resolvedOptions().locale);
	timeZone: string = $state(getLocalTimeZone());
	firstDayOfWeek: DayOfWeek | undefined = $state();

	constructor(options: CalendarStateOptions<T> = {}) {
		Object.assign(this, options);
		if (!options.date) this.date = today(this.timeZone);
	}

	readonly weekOptions = $derived({ locale: this.locale, firstDayOfWeek: this.firstDayOfWeek });
	readonly range = $derived(viewRange(this.date, this.view, this.weekOptions));
	/** Days shown as columns by the time grid views. */
	readonly days = $derived(
		this.view === 'day' ? [this.date] : weekDays(this.date, this.weekOptions)
	);
	readonly visibleEvents = $derived(eventsInRange(this.events, this.range, this.timeZone));
	readonly title = $derived(formatTitle(this));

	next() {
		this.date = shiftDate(this.date, this.view, 1);
	}

	previous() {
		this.date = shiftDate(this.date, this.view, -1);
	}

	goToday() {
		this.date = today(this.timeZone);
	}

	/** Shows `date` in the day view, e.g. when a day number is clicked. */
	openDay(date: CalendarDate) {
		this.date = date;
		this.view = 'day';
	}
}

function formatTitle({ view, date, range, locale, timeZone }: CalendarState) {
	if (view === 'month') {
		return new DateFormatter(locale, { month: 'long', year: 'numeric', timeZone }).format(
			date.toDate(timeZone)
		);
	}
	if (view === 'day') {
		return new DateFormatter(locale, { dateStyle: 'full', timeZone }).format(date.toDate(timeZone));
	}
	return new DateFormatter(locale, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone
	}).formatRange(range.start.toDate(timeZone), range.end.subtract({ days: 1 }).toDate(timeZone));
}

export const [getCalendar, setCalendar] = createContext<CalendarState>();
