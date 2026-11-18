import { createContext } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
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
	isAllDay,
	RangeLoader,
	seriesChanges,
	shiftDate,
	viewRange,
	weekDays,
	type CalendarEvent,
	type CalendarView,
	type DateRange,
	type DayOfWeek,
	type EventStoreOptions,
	type SeriesScope,
	type WeekOptions
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
	/** Plural forms by `Intl.PluralRules` category; `other` is required. */
	eventCount: { one: '{count} event', other: '{count} events' } as PluralForms,
	unassigned: 'Unassigned',
	progress: 'Progress',
	views: 'Views',
	repeatEvery: 'Repeat every',
	repeatOn: 'Repeat on',
	onDay: 'On day {day}',
	onWeekday: 'On the {ordinal} {weekday}',
	exportIcs: 'Export .ics',
	importIcs: 'Import .ics',
	exportCsv: 'Export CSV',
	print: 'Print',
	moreEvents: { one: '{count} more event', other: '{count} more events' } as PluralForms,
	confirmMoveTitle: 'Move event?',
	confirmResizeTitle: 'Change duration?',
	confirmMoveDescription: '"{title}" will move to {when}.',
	confirmResizeDescription: '"{title}" will be {when}.',
	move: 'Move',
	change: 'Change',
	moveMode:
		'Moving "{title}": arrow keys move it, Shift with arrow keys changes its length, Enter saves, Escape cancels.',
	moveCancelled: 'Move cancelled.'
};

export type CalendarLabels = typeof defaultLabels;

/** A label per plural category (`zero`, `one`, `two`, `few`, `many`, `other`). */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

/** Picks the plural form for `count` in `locale` and fills its `{count}`. */
export function pluralLabel(forms: PluralForms, count: number, locale: string) {
	const category = new Intl.PluralRules(locale).select(count);
	return fillLabel(forms[category] ?? forms.other, { count });
}

/** Replaces `{name}` placeholders in a label. */
export function fillLabel(label: string, values: Record<string, string | number>) {
	return label.replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match));
}

/** A range the user picked on the calendar: a click on a day or slot, or a drag over empty time. */
export interface Selection<T extends CalendarEvent> {
	start: CalendarDate | ZonedDateTime;
	end: CalendarDate | ZonedDateTime;
	allDay: boolean;
	/** Extra fields for an event created here, e.g. `resourceIds` of the clicked row. */
	fields: Partial<T>;
}

/**
 * Attributes (handlers, ARIA, data, class and style) that make an element behave as a calendar
 * part. Spread them on your own element in a render snippet: `<div {...props}>…</div>`.
 */
export type PartProps = Record<string, unknown> & { class?: string; style?: string };

/**
 * Invisible handles that resize an event from its start or end edge; missing when that edge cannot
 * be resized (not allowed, or it continues outside the shown range). Put them inside your element.
 */
export interface ResizeHandles {
	start?: PartProps;
	end?: PartProps;
}

/** Arguments of a view's `event` snippet, which replaces the whole event element. */
export interface EventSnippetArgs<T extends CalendarEvent = CalendarEvent> {
	event: T;
	props: PartProps;
	resizeProps: ResizeHandles;
	/** True while this event is being dragged or moved with the keyboard. */
	dragging: boolean;
}

/** Arguments of `dayNumber` / `dayHeader` snippets (day buttons that open the day). */
export interface DaySnippetArgs {
	day: CalendarDate;
	isToday: boolean;
	props: PartProps;
}

/** What the user is about to do to an event; `edit` is the event dialog. */
export type EditAction = 'move' | 'resize' | 'delete' | 'edit';

/** An event the user moved or resized by dragging. */
export interface EventChange<T extends CalendarEvent> {
	event: T;
	previous: T;
	kind: 'move' | 'resize';
}

/** A change to one occurrence of a series, waiting for the user to choose its scope. */
export interface ScopeRequest<T extends CalendarEvent> {
	action: 'update' | 'delete';
	occurrence: T;
	changed: T | null;
	/** False when the recurrence rule itself changed: that cannot apply to one occurrence. */
	allowThis: boolean;
}

export interface CalendarStateOptions<T extends CalendarEvent> extends EventStoreOptions<T> {
	view?: string;
	/** Date the calendar is centered on. Defaults to today. */
	date?: CalendarDate;
	/** BCP 47 locale for labels and the first day of the week. Defaults to the browser locale. */
	locale?: string;
	/** IANA time zone used to show events. Defaults to the browser time zone. */
	timeZone?: string;
	firstDayOfWeek?: DayOfWeek;
	/** Minutes that drag, resize and create snap to. */
	snapStep?: number;
	/** Minutes an all-day event lasts after it is dragged onto the hours of the time grid. */
	defaultDuration?: number;
	/** Set to false to show events without letting users change them. */
	editable?: boolean;
	/**
	 * Per-event, per-action permission, e.g. `(event) => event.data.owner === me` or
	 * `(event, action) => action !== 'resize'`. Runs only when `editable` is true.
	 */
	isEditable?(event: T, action: EditAction): boolean;
	/** Extra classes for an event's element in every view, e.g. dashed when tentative. */
	eventClass?(event: T): string | undefined;
	labels?: Partial<CalendarLabels>;
	/** Builds ids for events created in the UI. Your backend can replace them in `onMutate`. */
	createId?: () => string;
	/** Loads events on demand, one month at a time, as the user navigates. */
	loadEvents?(range: DateRange): Promise<readonly T[]>;
	/** Months to load ahead on each side of the visible range (default 1). */
	preload?: number;
	onLoadError?(error: unknown, range: DateRange): void;

	// Interaction hooks. Each runs before the built-in behavior; return false to skip it.
	// Hooks are methods so a state of a narrower event type still fits `CalendarState`.

	/** An event was clicked (or activated with the keyboard). Built-in: open the event dialog. */
	onEventClick?(event: T, nativeEvent: Event): boolean | void;
	/** "+N" was clicked on a day with hidden events. Built-in: a popover listing all of them. */
	onMoreClick?(day: CalendarDate, events: T[]): boolean | void;
	/** A day number or day header was clicked. Built-in: show that day in the day view. */
	onDateClick?(date: CalendarDate, nativeEvent: Event): boolean | void;
	/** An empty day or time range was picked. Built-in: open the dialog for a new event. */
	onSelect?(selection: Selection<T>): boolean | void;
	/** An event was dragged or resized. Return false to cancel, or an event to save instead. */
	onEventChange?(change: EventChange<T>): boolean | T | void;
	/**
	 * Ask before saving a drag or resize (with `<ChangeConfirmDialog>` mounted). Default true;
	 * false saves directly; a function decides per change, e.g. only when the day changes.
	 */
	// Written as a method type so a state of a narrower event type still fits `CalendarState`.
	confirmChanges?: boolean | { decide(change: EventChange<T>): boolean }['decide'];
	/** Key that starts moving the focused event with the keyboard. Default 'm'. */
	moveKey?: string;
	/** Let touch users drag events (after a long press). Default true. */
	touchDrag?: boolean;
	/** Milliseconds a finger must rest on an event before it can be dragged. Default 400. */
	touchDragDelay?: number;
	/** Decide the scope of a change to a recurring event yourself instead of asking the user. */
	resolveScope?(request: ScopeRequest<T>): SeriesScope | null;
}

/** An event being created or edited in the event dialog. */
export interface EventDraft<T extends CalendarEvent> {
	event: T;
	isNew: boolean;
}

/** A view registered by `<Calendar.View>`. Built-in names get their range automatically. */
export interface ViewDefinition {
	name: string;
	label?: string;
	/** Days the view shows around the date. Needed for custom view names. */
	range?: (date: CalendarDate, options: WeekOptions) => DateRange;
	/** How far previous/next move. Needed for custom view names. */
	unit?: 'days' | 'weeks' | 'months' | 'years';
}

const BUILT_IN_VIEWS = new Set<string>([
	'month',
	'week',
	'day',
	'year',
	'agenda',
	'timeline',
	'resources',
	'gantt'
]);

/**
 * Reactive calendar state shared by every calendar part through context. It knows nothing about
 * specific views: they register themselves with `<Calendar.View>`.
 *
 * Event changes go through an `EventStore`: they show right away, are saved with `onMutate`,
 * roll back if saving fails, and can be undone. Recurring events (`rrule`) are expanded for the
 * visible range; changing one occurrence asks whether it applies to it, the following, or all.
 */
export class CalendarState<T extends CalendarEvent = CalendarEvent> {
	readonly store: EventStore<T>;
	events: readonly T[] = $state.raw([]);
	canUndo = $state(false);
	canRedo = $state(false);

	view: string = $state('month');
	date: CalendarDate = $state.raw(today(getLocalTimeZone()));
	locale: string = $state(new Intl.DateTimeFormat().resolvedOptions().locale);
	timeZone: string = $state(getLocalTimeZone());
	firstDayOfWeek: DayOfWeek | undefined = $state();
	snapStep = $state(15);
	defaultDuration = $state(60);
	editable = $state(true);
	labels: CalendarLabels = $state(defaultLabels);
	draft: EventDraft<T> | null = $state.raw(null);
	scopeRequest: ScopeRequest<T> | null = $state.raw(null);
	/** A drag or resize waiting for the user to confirm it. */
	changeRequest: EventChange<T> | null = $state.raw(null);
	touchDrag = $state(true);
	moveKey = $state('m');
	/** Text for screen readers, read by the live region of `<Calendar.Root>`. */
	announcement = $state('');
	touchDragDelay = $state(400);
	/** True while events of the visible range are being loaded. */
	loading = $state(false);
	/** Views registered by `<Calendar.View>`, in order. */
	readonly views = new SvelteMap<string, ViewDefinition>();

	#options: CalendarStateOptions<T>;
	#createId: () => string;
	#loader: RangeLoader<T> | undefined;
	// Mounted dialogs. Without one, the request it would show is resolved by a safe default.
	#confirmDialogs = 0;
	#scopeDialogs = 0;

	constructor(options: CalendarStateOptions<T> = {}) {
		this.#options = options;
		const { view, date, locale, timeZone, firstDayOfWeek, snapStep, editable, labels } = options;
		if (timeZone) this.timeZone = timeZone;
		if (locale) this.locale = locale;
		if (view) this.view = view;
		this.date = date ?? today(this.timeZone);
		this.firstDayOfWeek = firstDayOfWeek;
		if (snapStep) this.snapStep = snapStep;
		if (options.defaultDuration) this.defaultDuration = options.defaultDuration;
		if (editable !== undefined) this.editable = editable;
		if (options.touchDrag !== undefined) this.touchDrag = options.touchDrag;
		if (options.moveKey) this.moveKey = options.moveKey;
		if (options.touchDragDelay !== undefined) this.touchDragDelay = options.touchDragDelay;
		this.labels = { ...defaultLabels, ...labels };
		this.#createId = options.createId ?? (() => crypto.randomUUID());

		const { events, onMutate, onError, historyLimit } = options;
		this.store = new EventStore({ events, onMutate, onError, historyLimit });
		this.store.subscribe((list) => {
			this.events = list;
			this.#syncHistory();
		});
		if (options.loadEvents) {
			this.#loader = new RangeLoader({
				store: this.store,
				load: options.loadEvents,
				preload: options.preload ?? 1,
				onError: options.onLoadError,
				onLoadingChange: (loading) => (this.loading = loading)
			});
		}
	}

	readonly weekOptions = $derived({ locale: this.locale, firstDayOfWeek: this.firstDayOfWeek });
	readonly range: DateRange = $derived.by(() => {
		const custom = this.views.get(this.view)?.range;
		if (custom) return custom(this.date, this.weekOptions);
		if (BUILT_IN_VIEWS.has(this.view)) {
			return viewRange(this.date, this.view as CalendarView, this.weekOptions);
		}
		return { start: this.date, end: this.date.add({ days: 1 }) };
	});
	/** Days shown as columns: one for day-like views, the week otherwise. */
	readonly days = $derived(
		this.view === 'day' || this.view === 'resources'
			? [this.date]
			: weekDays(this.date, this.weekOptions)
	);
	/** Events and occurrences of recurring events that overlap the visible range. */
	readonly visibleEvents = $derived(expandEvents(this.events, this.range, this.timeZone));
	readonly title = $derived(formatTitle(this));

	/** Registers a view (done by `<Calendar.View>`); returns a function that unregisters it. */
	registerView(definition: ViewDefinition) {
		this.views.set(definition.name, definition);
		return () => {
			if (this.views.get(definition.name) === definition) this.views.delete(definition.name);
		};
	}

	/** Loads the events of `range` when `loadEvents` is set; `<Calendar.Root>` calls it on navigation. */
	ensureLoaded(range: DateRange = this.range) {
		return this.#loader?.ensure(range) ?? Promise.resolve();
	}

	next() {
		this.#shift(1);
	}

	previous() {
		this.#shift(-1);
	}

	goToday() {
		this.date = today(this.timeZone);
	}

	/** Shows `date` in the day view, e.g. when a day number is clicked. */
	openDay(date: CalendarDate) {
		this.date = date;
		this.view = 'day';
	}

	/** Whether the user may do `action` to `event` (global `editable` plus `isEditable`). */
	canEdit(event?: T, action: EditAction = 'edit') {
		return this.editable && (!event || (this.#options.isEditable?.(event, action) ?? true));
	}

	/** Classes from the `eventClass` option, for views to add to an event's element. */
	eventClass(event: T) {
		return this.#options.eventClass?.(event);
	}

	// Interactions, called by the views. Each runs its hook, then the built-in behavior.

	clickEvent(event: T, nativeEvent: Event) {
		if (this.#options.onEventClick?.(event, nativeEvent) === false) return;
		if (this.canEdit(event)) this.draft = { event, isNew: false };
	}

	/** Whether "+N" should open its built-in list, after `onMoreClick` had its say. */
	clickMore(day: CalendarDate, events: T[]) {
		return this.#options.onMoreClick?.(day, events) !== false;
	}

	clickDate(date: CalendarDate, nativeEvent: Event) {
		if (this.#options.onDateClick?.(date, nativeEvent) === false) return;
		// Only when a day view exists; a month-only calendar stays where it is.
		if (this.views.has('day')) this.openDay(date);
	}

	select(selection: Selection<T>) {
		if (!this.editable || this.#options.onSelect?.(selection) === false) return;
		this.compose(selection.start, selection.end, selection.fields);
	}

	/** Says `text` to screen reader users (also when it repeats the previous one). */
	announce(text: string) {
		this.announcement = this.announcement === text ? `${text}\u00a0` : text;
	}

	/** "jueves, 19 de noviembre de 2026, 3:00 – 6:00 p. m." in the calendar's locale and zone. */
	describe(event: T) {
		const { locale, timeZone } = this;
		if (isAllDay(event)) {
			const format = new DateFormatter(locale, { dateStyle: 'full', timeZone });
			const last = event.end.subtract({ days: 1 });
			return event.start.compare(last) === 0
				? format.format(event.start.toDate(timeZone))
				: format.formatRange(event.start.toDate(timeZone), last.toDate(timeZone));
		}
		return new DateFormatter(locale, {
			dateStyle: 'full',
			timeStyle: 'short',
			timeZone
		}).formatRange(event.start.toDate(), event.end.toDate());
	}

	/**
	 * Saves an event the user dragged, resized or moved with the keyboard, after `onEventChange`.
	 * `confirmed` skips the confirmation dialog (the keyboard move mode is already explicit).
	 */
	changeEvent(change: EventChange<T>, { confirmed = false } = {}) {
		const verdict = this.#options.onEventChange?.(change);
		if (verdict === false) return Promise.resolve(undefined);
		const approved = { ...change, event: verdict && verdict !== true ? verdict : change.event };
		// Recurring events already ask "this / following / all", which confirms the change.
		if (
			!confirmed &&
			this.#confirmDialogs > 0 &&
			!this.#occurrence(approved.event.id) &&
			this.#needsConfirm(approved)
		) {
			this.changeRequest = approved;
			return Promise.resolve(undefined);
		}
		return this.update(approved.event);
	}

	/** Saves the pending drag or resize when `accept` is true, drops it otherwise. */
	confirmChange(accept: boolean) {
		const request = this.changeRequest;
		this.changeRequest = null;
		return request && accept ? this.update(request.event) : Promise.resolve(undefined);
	}

	/** Called by a mounted confirmation dialog; returns the function that unregisters it. */
	registerConfirmDialog() {
		this.#confirmDialogs++;
		return () => void this.#confirmDialogs--;
	}

	/** Called by a mounted scope dialog; returns the function that unregisters it. */
	registerScopeDialog() {
		this.#scopeDialogs++;
		return () => void this.#scopeDialogs--;
	}

	#needsConfirm(change: EventChange<T>) {
		const rule = this.#options.confirmChanges ?? true;
		return typeof rule === 'function' ? rule(change) : rule;
	}

	create(event: T) {
		return this.#track(this.store.create(event));
	}

	/** Saves a changed event. For an occurrence of a series, first asks for the scope. */
	update(event: T) {
		const occurrence = this.#occurrence(event.id);
		if (occurrence) {
			const allowThis = event.rrule === occurrence.rrule;
			return this.#askScope({ action: 'update', occurrence, changed: event, allowThis });
		}
		return this.#track(this.store.update(event));
	}

	/** Deletes an event. For an occurrence of a series, first asks for the scope. */
	remove(id: string) {
		const occurrence = this.#occurrence(id);
		if (occurrence) {
			return this.#askScope({ action: 'delete', occurrence, changed: null, allowThis: true });
		}
		return this.#track(this.store.remove(id));
	}

	/** Applies the pending occurrence change to `scope`, or drops it when `scope` is null. */
	applyScope(scope: SeriesScope | null) {
		const request = this.scopeRequest;
		this.scopeRequest = null;
		return request ? this.#applyScope(request, scope) : Promise.resolve();
	}

	undo() {
		return this.#track(this.store.undo());
	}

	redo() {
		return this.#track(this.store.redo());
	}

	/**
	 * Adds events from outside (e.g. an imported .ics) as one undo step: events with a known id
	 * replace the current ones, the rest are created.
	 */
	importEvents(events: readonly T[]) {
		// A plain lookup table used once here, not reactive state.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const current = new Map(this.events.map((event) => [event.id, event]));
		return this.#track(
			this.store.batch(
				events.map((event) => {
					const before = current.get(event.id);
					return before
						? { type: 'update' as const, before, after: event }
						: { type: 'create' as const, event };
				})
			)
		);
	}

	/** Opens the event dialog for an existing event. */
	edit(event: T) {
		if (this.canEdit(event)) this.draft = { event, isNew: false };
	}

	/** Opens the event dialog for a new event covering `start` to `end`. */
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

	#shift(amount: number) {
		const unit = this.views.get(this.view)?.unit;
		if (unit) this.date = this.date.add({ [unit]: amount });
		else if (BUILT_IN_VIEWS.has(this.view)) {
			this.date = shiftDate(this.date, this.view as CalendarView, amount);
		} else this.date = this.date.add({ days: amount });
	}

	#occurrence(id: string) {
		return this.visibleEvents.find((event) => event.id === id && event.seriesId);
	}

	#askScope(request: ScopeRequest<T>) {
		if (this.#options.resolveScope) {
			return this.#applyScope(request, this.#options.resolveScope(request));
		}
		// Without a dialog to ask, change only this occurrence: the least destructive choice.
		if (this.#scopeDialogs === 0)
			return this.#applyScope(request, request.allowThis ? 'this' : 'all');
		this.scopeRequest = request;
		return Promise.resolve(undefined);
	}

	#applyScope(request: ScopeRequest<T>, scope: SeriesScope | null) {
		const series = this.events.find((event) => event.id === request.occurrence.seriesId);
		if (!scope || !series) return Promise.resolve();
		const changes = seriesChanges(series, request.occurrence, request.changed, scope, () =>
			this.#createId()
		);
		return this.#track(this.store.batch(changes));
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

function formatTitle({
	view,
	date,
	range,
	locale,
	timeZone
}: {
	view: string;
	date: CalendarDate;
	range: DateRange;
	locale: string;
	timeZone: string;
}) {
	const format = (options: Intl.DateTimeFormatOptions, value = date) =>
		new DateFormatter(locale, { ...options, timeZone }).format(value.toDate(timeZone));

	if (view === 'year') return format({ year: 'numeric' });
	if (view === 'month' || view === 'agenda' || view === 'gantt') {
		return format({ month: 'long', year: 'numeric' });
	}
	const last = range.end.subtract({ days: 1 });
	if (range.start.compare(last) === 0) return format({ dateStyle: 'full' });
	return new DateFormatter(locale, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone
	}).formatRange(range.start.toDate(timeZone), last.toDate(timeZone));
}

export const [getCalendar, setCalendar] = createContext<CalendarState>();
