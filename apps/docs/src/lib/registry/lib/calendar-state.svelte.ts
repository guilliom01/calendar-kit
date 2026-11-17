import { createContext } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import {
	DateFormatter,
	getLocalTimeZone,
	today,
	type CalendarDate,
	type ZonedDateTime
} from '@internationalized/date';
import {
	EventStore,
	expandEvents,
	RangeLoader,
	seriesChanges,
	shiftDate,
	viewRange,
	weekDays,
	type CalendarEvent,
	type CalendarView,
	type DayOfWeek,
	type DateRange,
	type EventStoreOptions,
	type Resource,
	type SeriesScope
} from '@calendar-kit/core';

/**
 * Texts that Intl cannot provide. Override them through `labels` for your language.
 * `{name}` placeholders are filled in by the components.
 */
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
	redo: 'Redo',
	timeZone: 'Time zone',
	repeat: 'Repeat',
	doesNotRepeat: 'Does not repeat',
	daily: 'Every day',
	weekly: 'Every week on {weekday}',
	weekdays: 'Every weekday (Monday to Friday)',
	monthlyOnDay: 'Every month on day {day}',
	monthlyOnWeekday: 'Every month on the {ordinal} {weekday}',
	yearly: 'Every year on {date}',
	custom: 'Custom ({rule})',
	ordinals: ['first', 'second', 'third', 'fourth', 'fifth'],
	last: 'last',
	ends: 'Ends',
	never: 'Never',
	endsOn: 'On',
	endsAfter: 'After',
	occurrences: 'occurrences',
	editRecurring: 'Edit recurring event',
	deleteRecurring: 'Delete recurring event',
	thisEvent: 'This event',
	followingEvents: 'This and following events',
	allEvents: 'All events',
	ok: 'OK',
	agenda: 'Agenda',
	timeline: 'Timeline',
	resources: 'Resources',
	gantt: 'Gantt',
	noEvents: 'No events',
	loading: 'Loading…',
	events: 'events',
	unassigned: 'Unassigned',
	progress: 'Progress'
};

export type CalendarLabels = typeof defaultLabels;

/** Replaces `{name}` placeholders in a label. */
export function fillLabel(label: string, values: Record<string, string | number>) {
	return label.replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match));
}

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
	/** People, rooms... for the timeline and resource views. */
	resources?: Resource[];
	/** Views offered in the toolbar. Defaults to month, week, day, agenda and year (plus timeline and resources when there are resources). */
	views?: CalendarView[];
	/** Loads events on demand, one month at a time, as the user navigates. */
	loadEvents?: (range: DateRange) => Promise<readonly T[]>;
	/** Months to load ahead on each side of the visible range (default 1). */
	preload?: number;
	onLoadError?: (error: unknown, range: DateRange) => void;
}

/** A column of the time grid: a day, or a resource on the shown day. */
export interface TimeGridColumn {
	day: CalendarDate;
	resource?: Resource;
}

/** An event being created or edited in the event dialog. */
export interface EventDraft<T extends CalendarEvent> {
	event: T;
	isNew: boolean;
}

/** A change to one occurrence of a series, waiting for the user to choose its scope. */
export interface ScopeRequest<T extends CalendarEvent> {
	action: 'update' | 'delete';
	occurrence: T;
	changed: T | null;
	/** False when the recurrence rule itself changed: that cannot apply to one occurrence. */
	allowThis: boolean;
}

/**
 * Reactive calendar state shared by the toolbar, the views and the dialogs through context.
 * Event changes go through an `EventStore`: they show right away, are saved with `onMutate`,
 * roll back if saving fails, and can be undone. Recurring events (`rrule`) are expanded for the
 * visible range; changing one occurrence asks whether it applies to it, the following, or all.
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
	scopeRequest: ScopeRequest<T> | null = $state.raw(null);
	resources: readonly Resource[] = $state.raw([]);
	views: CalendarView[] = $state(['month', 'week', 'day', 'agenda', 'year']);
	/** Resources whose children are hidden in the timeline. */
	collapsed = new SvelteSet<string>();
	/** True while events of the visible range are being loaded. */
	loading = $state(false);

	#createId: () => string;
	#loader: RangeLoader<T> | undefined;

	constructor(options: CalendarStateOptions<T> = {}) {
		const {
			events,
			onMutate,
			onError,
			historyLimit,
			labels,
			createId,
			loadEvents,
			preload,
			onLoadError,
			...settings
		} = options;
		Object.assign(this, settings);
		if (!settings.date) this.date = today(this.timeZone);
		if (!settings.views && settings.resources?.length) {
			this.views = [...this.views, 'timeline', 'resources'];
		}
		this.labels = { ...defaultLabels, ...labels };
		this.#createId = createId ?? (() => crypto.randomUUID());
		this.store = new EventStore({ events, onMutate, onError, historyLimit });
		this.store.subscribe((list) => {
			this.events = list;
			this.#syncHistory();
		});
		if (loadEvents) {
			this.#loader = new RangeLoader({
				store: this.store,
				load: loadEvents,
				preload: preload ?? 1,
				onError: onLoadError,
				onLoadingChange: (loading) => (this.loading = loading)
			});
		}
	}

	/** Loads the events of `range` when `loadEvents` is set; the calendar calls it on navigation. */
	ensureLoaded(range: DateRange = this.range) {
		return this.#loader?.ensure(range) ?? Promise.resolve();
	}

	readonly weekOptions = $derived({ locale: this.locale, firstDayOfWeek: this.firstDayOfWeek });
	readonly range = $derived(viewRange(this.date, this.view, this.weekOptions));
	/** Days shown as columns by the time grid views. */
	readonly days = $derived(
		this.view === 'day' || this.view === 'resources'
			? [this.date]
			: weekDays(this.date, this.weekOptions)
	);
	/** Resources without children: the columns of the resource view. */
	readonly leafResources = $derived(
		this.resources.filter(
			(resource) => !this.resources.some((child) => child.parentId === resource.id)
		)
	);
	/** Columns of the time grid: the days, or one column per resource in the resource view. */
	readonly columns: TimeGridColumn[] = $derived(
		this.view === 'resources'
			? this.leafResources.map((resource) => ({ day: this.date, resource }))
			: this.days.map((day) => ({ day }))
	);
	/** Events and occurrences of recurring events that overlap the visible range. */
	readonly visibleEvents = $derived(expandEvents(this.events, this.range, this.timeZone));
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

	/** Saves a changed event. For an occurrence of a series, first asks for the scope. */
	update(event: T) {
		const occurrence = this.#occurrence(event.id);
		if (occurrence) {
			this.scopeRequest = {
				action: 'update',
				occurrence,
				changed: event,
				allowThis: event.rrule === occurrence.rrule
			};
			return Promise.resolve(undefined);
		}
		return this.#track(this.store.update(event));
	}

	/** Deletes an event. For an occurrence of a series, first asks for the scope. */
	remove(id: string) {
		const occurrence = this.#occurrence(id);
		if (occurrence) {
			this.scopeRequest = { action: 'delete', occurrence, changed: null, allowThis: true };
			return Promise.resolve();
		}
		return this.#track(this.store.remove(id));
	}

	/** Applies the pending occurrence change to `scope`, or drops it when `scope` is null. */
	applyScope(scope: SeriesScope | null) {
		const request = this.scopeRequest;
		this.scopeRequest = null;
		const series = this.events.find((event) => event.id === request?.occurrence.seriesId);
		if (!request || !scope || !series) return Promise.resolve();

		const changes = seriesChanges(series, request.occurrence, request.changed, scope, () =>
			this.#createId()
		);
		return this.#track(this.store.batch(changes));
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
	compose(start: CalendarDate, end: CalendarDate, fields?: Partial<T>): void;
	compose(start: ZonedDateTime, end: ZonedDateTime, fields?: Partial<T>): void;
	compose(
		start: CalendarDate | ZonedDateTime,
		end: CalendarDate | ZonedDateTime,
		fields: Partial<T> = {}
	) {
		if (!this.editable) return;
		const event = { ...fields, id: this.#createId(), title: '', start, end } as T;
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

	#occurrence(id: string) {
		return this.visibleEvents.find((event) => event.id === id && event.seriesId);
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
	if (view === 'year') {
		return new DateFormatter(locale, { year: 'numeric', timeZone }).format(date.toDate(timeZone));
	}
	if (view === 'month' || view === 'agenda' || view === 'gantt') {
		return new DateFormatter(locale, { month: 'long', year: 'numeric', timeZone }).format(
			date.toDate(timeZone)
		);
	}
	if (view === 'day' || view === 'resources') {
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
