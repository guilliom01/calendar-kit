import { createContext } from 'svelte';
import {
	DateFormatter,
	getLocalTimeZone,
	today,
	type CalendarDate,
	type ZonedDateTime
} from '@internationalized/date';
import {
	EventStore,
	eventsInRange,
	shiftDate,
	viewRange,
	weekDays,
	type CalendarEvent,
	type CalendarView,
	type DayOfWeek,
	type EventStoreOptions
} from '@calendar-kit/core';

/** Texts that Intl cannot provide. Override them through `labels` for your language. */
export const defaultLabels = {
	allDay: 'All day',
	untitled: '(No title)',
	newEvent: 'New event',
	editEvent: 'Edit event',
	title: 'Title',
	start: 'Start',
	end: 'End',
	color: 'Color',
	save: 'Save',
	cancel: 'Cancel',
	delete: 'Delete',
	undo: 'Undo',
	redo: 'Redo'
};

export type CalendarLabels = typeof defaultLabels;

export interface CalendarStateOptions<T extends CalendarEvent> extends EventStoreOptions<T> {
	view?: CalendarView;
	/** Date the calendar is centered on. Defaults to today. */
	date?: CalendarDate;
	/** BCP 47 locale for labels and the first day of the week. Defaults to the browser locale. */
	locale?: string;
	/** IANA time zone used to show events. Defaults to the browser time zone. */
	timeZone?: string;
	firstDayOfWeek?: DayOfWeek;
	/** Minutes that drag, resize and create snap to. */
	snapStep?: number;
	/** Set to false to show events without letting users change them. */
	editable?: boolean;
	labels?: Partial<CalendarLabels>;
	/** Builds ids for events created in the UI. Your backend can replace them in `onMutate`. */
	createId?: () => string;
}

/** An event being created or edited in the event dialog. */
export interface EventDraft<T extends CalendarEvent> {
	event: T;
	isNew: boolean;
}

/**
 * Reactive calendar state shared by the toolbar, the views and the dialog through context.
 * Event changes go through an `EventStore`: they show right away, are saved with `onMutate`,
 * roll back if saving fails, and can be undone.
 */
export class CalendarState<T extends CalendarEvent = CalendarEvent> {
	readonly store: EventStore<T>;
	events: readonly T[] = $state.raw([]);
	canUndo = $state(false);
	canRedo = $state(false);

	view: CalendarView = $state('month');
	date: CalendarDate = $state.raw(today(getLocalTimeZone()));
	locale: string = $state(new Intl.DateTimeFormat().resolvedOptions().locale);
	timeZone: string = $state(getLocalTimeZone());
	firstDayOfWeek: DayOfWeek | undefined = $state();
	snapStep = $state(15);
	editable = $state(true);
	labels: CalendarLabels = $state(defaultLabels);
	draft: EventDraft<T> | null = $state.raw(null);

	#createId: () => string;

	constructor(options: CalendarStateOptions<T> = {}) {
		const { events, onMutate, onError, historyLimit, labels, createId, ...settings } = options;
		Object.assign(this, settings);
		if (!settings.date) this.date = today(this.timeZone);
		this.labels = { ...defaultLabels, ...labels };
		this.#createId = createId ?? (() => crypto.randomUUID());
		this.store = new EventStore({ events, onMutate, onError, historyLimit });
		this.store.subscribe((list) => {
			this.events = list;
			this.#syncHistory();
		});
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

	create(event: T) {
		return this.#track(this.store.create(event));
	}

	update(event: T) {
		return this.#track(this.store.update(event));
	}

	remove(id: string) {
		return this.#track(this.store.remove(id));
	}

	undo() {
		return this.#track(this.store.undo());
	}

	redo() {
		return this.#track(this.store.redo());
	}

	/** Opens the event dialog for an existing event. */
	edit(event: T) {
		if (this.editable) this.draft = { event, isNew: false };
	}

	/** Opens the event dialog for a new event covering `start` to `end`. */
	compose(start: CalendarDate, end: CalendarDate): void;
	compose(start: ZonedDateTime, end: ZonedDateTime): void;
	compose(start: CalendarDate | ZonedDateTime, end: CalendarDate | ZonedDateTime) {
		if (!this.editable) return;
		const event = { id: this.#createId(), title: '', start, end } as T;
		this.draft = { event, isNew: true };
	}

	/** Saves the dialog's event and closes it. */
	saveDraft(event: T) {
		const draft = this.draft;
		this.draft = null;
		if (draft) void (draft.isNew ? this.create(event) : this.update(event));
	}

	closeDraft() {
		this.draft = null;
	}

	async #track<R>(operation: Promise<R>): Promise<R> {
		const result = await operation;
		// History changes after a failed save are not announced by the store.
		this.#syncHistory();
		return result;
	}

	#syncHistory() {
		this.canUndo = this.store.canUndo;
		this.canRedo = this.store.canRedo;
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
