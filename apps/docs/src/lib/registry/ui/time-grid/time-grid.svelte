<script lang="ts">
	import {
		DateFormatter,
		fromAbsolute,
		isToday,
		toCalendarDate,
		toTimeZone,
		toZoned,
		type CalendarDate,
		type ZonedDateTime
	} from '@internationalized/date';
	import {
		daysBetween,
		eventsForResource,
		flattenResources,
		isAllDay,
		layoutTimedEvents,
		layoutWeekRow,
		moveEvent,
		resizeEvent,
		resizeEventStart,
		snapMinutes,
		spansDays,
		zonedAt,
		type CalendarEvent,
		type Resource,
		type TimedEvent,
		type TimedEventLayout
	} from '@calendar-kit/core';
	import type { Snippet } from 'svelte';
	import {
		barResizeHandles,
		touchOf,
		trackPointer,
		withPreview
	} from '#lib/registry/lib/calendar-drag.js';
	import {
		dayStepper,
		contextMenuKey,
		keyboardMove,
		type MoveStepper
	} from '#lib/registry/lib/calendar-keyboard.js';
	import {
		getCalendar,
		type DaySnippetArgs,
		type EventSnippetArgs,
		type PartProps,
		type ResizeHandles
	} from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	interface Props {
		/** Show one column per resource (for the shown day) instead of one per day. */
		resources?: Resource[];
		class?: string;
		/** Height of one hour, as a CSS length. */
		hourHeight?: string;
		/** Hour the grid scrolls to when it mounts. */
		scrollToHour?: number;
		/** Custom content inside each event block (the block itself stays). */
		eventContent?: Snippet<[CalendarEvent]>;
		/**
		 * Replaces the whole event element, timed or all-day. Spread `props` on your element and put
		 * the `resizeProps` handles inside it to keep resizing from either edge.
		 */
		event?: Snippet<[EventSnippetArgs & { allDay: boolean }]>;
		/** Replaces the day header button. Spread `props` to keep opening the day. */
		dayHeader?: Snippet<[DaySnippetArgs]>;
		/** Content of a resource column header (with `resources`). */
		resourceLabel?: Snippet<[{ resource: Resource }]>;
		/** Text next to each hour line. */
		hourLabel?: Snippet<[{ hour: number; label: string }]>;
		/** Replaces the "now" line; it is already placed at the current time. */
		nowIndicator?: Snippet<[{ time: ZonedDateTime }]>;
	}

	let {
		resources,
		class: className,
		hourHeight = '3rem',
		scrollToHour = 7,
		eventContent,
		event: eventSnippet,
		dayHeader,
		resourceLabel,
		hourLabel,
		nowIndicator
	}: Props = $props();

	const calendar = getCalendar();
	const MINUTES_PER_DAY = 24 * 60;
	const NEW_EVENT_ID = 'calendar-new-event';
	const percent = (minutes: number) => `${(minutes / MINUTES_PER_DAY) * 100}%`;

	// Event being dragged, resized or drawn, at its preview position.
	let preview: CalendarEvent | null = $state.raw(null);
	let columnElements: HTMLElement[] = $state([]);
	let allDayElement: HTMLElement | undefined = $state();

	/** A column of the grid: a day, or a resource on the shown day. */
	interface Column {
		day: CalendarDate;
		resource?: Resource;
	}

	// Columns are days, or the leaf resources of one day when `resources` is given.
	const cols: Column[] = $derived(
		resources
			? flattenResources(resources)
					.filter((row) => !row.hasChildren)
					.map(({ resource }) => ({ day: calendar.date, resource }))
			: calendar.days.map((day) => ({ day }))
	);
	const byResource = $derived(cols.some((column) => column.resource));
	const step = $derived(calendar.snapStep);
	const events = $derived(withPreview(calendar.visibleEvents, preview));
	const template = $derived(`4rem repeat(${cols.length}, minmax(0, 1fr))`);
	const eventsOf = (list: readonly CalendarEvent[], column: Column) =>
		column.resource ? eventsForResource(list, column.resource.id) : list;
	const allDayItems = $derived(
		byResource
			? cols.flatMap((column, index) =>
					layoutWeekRow(
						eventsOf(events.filter(spansDays), column),
						[column.day],
						calendar.timeZone
					).map((item) => ({ ...item, startIndex: index }))
				)
			: layoutWeekRow(
					events.filter(spansDays),
					cols.map((column) => column.day),
					calendar.timeZone
				)
	);
	const allDayLanes = $derived(Math.max(1, ...allDayItems.map((item) => item.lane + 1)));
	const dayItems = $derived(
		cols.map((column) => layoutTimedEvents(eventsOf(events, column), column.day, calendar.timeZone))
	);

	const formatter = (options: Intl.DateTimeFormatOptions) =>
		new DateFormatter(calendar.locale, { ...options, timeZone: calendar.timeZone });
	const weekday = $derived(formatter({ weekday: 'short' }));
	const fullDate = $derived(formatter({ dateStyle: 'full' }));
	const hour = $derived(formatter({ hour: 'numeric' }));
	const time = $derived(formatter({ hour: 'numeric', minute: '2-digit' }));

	// Current time, refreshed every minute, for the "now" line. Follows time zone changes.
	let tick = $state(Date.now());
	$effect(() => {
		const timer = setInterval(() => (tick = Date.now()), 60_000);
		return () => clearInterval(timer);
	});
	const current = $derived(fromAbsolute(tick, calendar.timeZone));
	const nowMinutes = $derived(current.hour * 60 + current.minute);

	const toDate = (day: CalendarDate) => day.toDate(calendar.timeZone);
	const formatHour = (h: number) =>
		hour.format(toZoned(cols[0]!.day, calendar.timeZone).set({ hour: h }).toDate());
	const at = (day: CalendarDate, minutes: number) => zonedAt(day, minutes, calendar.timeZone);

	/** Column, its day and the minute of the day under the pointer. */
	function pointAt(pointer: PointerEvent) {
		// Measured per column, so it works left-to-right and right-to-left.
		const rects = columnElements
			.slice(0, cols.length)
			.map((element) => element.getBoundingClientRect());
		const distance = (rect: DOMRect) => Math.abs(pointer.clientX - (rect.left + rect.right) / 2);
		let index = rects.findIndex(
			(rect) => pointer.clientX >= rect.left && pointer.clientX < rect.right
		);
		if (index === -1) {
			index = rects.reduce(
				(best, rect, i) => (distance(rect) < distance(rects[best]!) ? i : best),
				0
			);
		}
		const first = rects[0]!;
		const minutes = ((pointer.clientY - first.top) / first.height) * MINUTES_PER_DAY;
		return { column: cols[index]!, day: cols[index]!.day, minutes };
	}

	/** Whether the pointer is over the all-day row (or the headers above it). */
	const overAllDay = (pointer: PointerEvent) =>
		!!allDayElement && pointer.clientY < allDayElement.getBoundingClientRect().bottom;

	/** A timed event as an all-day event starting on `day`, covering as many days as it touched. */
	function toAllDay(event: TimedEvent, day: CalendarDate): CalendarEvent {
		const first = toCalendarDate(toTimeZone(event.start, calendar.timeZone));
		const last = toCalendarDate(
			toTimeZone(event.end.subtract({ milliseconds: 1 }), calendar.timeZone)
		);
		return {
			...event,
			start: day,
			end: day.add({ days: Math.max(1, daysBetween(first, last) + 1) })
		};
	}

	/** `moved` with its resource changed when the pointer went from one resource column to another. */
	function withColumn(moved: CalendarEvent, original: CalendarEvent, from: Column, to: Column) {
		const [fromId, toId] = [from.resource?.id, to.resource?.id];
		return fromId && toId
			? { ...moved, resourceIds: reassign(original.resourceIds, fromId, toId) }
			: moved;
	}

	/** Resource ids after moving an event from one resource column to another. */
	const reassign = (ids: readonly string[] | undefined, from: string, to: string) => [
		...new Set((ids ?? []).map((id) => (id === from ? to : id)))
	];

	function finishDrag(original: CalendarEvent, kind: 'move' | 'resize') {
		const changed =
			preview &&
			(preview.start.toString() !== original.start.toString() ||
				preview.end.toString() !== original.end.toString() ||
				preview.resourceIds?.join() !== original.resourceIds?.join());
		if (changed) void calendar.changeEvent({ event: preview!, previous: original, kind });
		preview = null;
	}

	function startMove(down: PointerEvent, item: TimedEventLayout) {
		if (!calendar.canEdit(item.event, 'move')) return;
		const event = item.event as TimedEvent;
		const source = pointAt(down);
		const grab = source.minutes - item.start;

		trackPointer(
			down,
			{
				onMove: (move) => {
					const { column, day, minutes } = pointAt(move);
					// Dropped on the all-day row, it becomes an all-day event.
					const moved = overAllDay(move)
						? toAllDay(event, day)
						: moveEvent(event, at(day, snapMinutes(minutes - grab, step)));
					preview = withColumn(moved, event, source.column, column);
				},
				onDrop: () => finishDrag(event, 'move'),
				onCancel: () => (preview = null),
				onLift: () => (preview = event),
				canScroll: (move) => !overAllDay(move)
			},
			touchOf(calendar)
		);
	}

	function startResize(down: PointerEvent, item: TimedEventLayout, edge: 'start' | 'end') {
		down.stopPropagation();
		if (!calendar.canEdit(item.event, 'resize')) return;
		const event = item.event as TimedEvent;

		trackPointer(
			down,
			{
				onMove: (move) => {
					const { day, minutes } = pointAt(move);
					const time = at(day, snapMinutes(minutes, step));
					preview =
						edge === 'start'
							? resizeEventStart(event, time, { minDuration: step })
							: resizeEvent(event, time, { minDuration: step });
				},
				onDrop: () => finishDrag(event, 'resize'),
				onCancel: () => (preview = null),
				onLift: () => (preview = event)
			},
			touchOf(calendar)
		);
	}

	/** Press on an empty slot: click creates a one-hour event, drag draws its range. */
	function startCreate(down: PointerEvent, column: Column) {
		if (!calendar.editable || down.target !== down.currentTarget) return;
		const day = column.day;
		const fields = column.resource ? { resourceIds: [column.resource.id] } : {};
		const anchor = Math.floor(pointAt(down).minutes / step) * step;
		let range: [number, number] = [anchor, Math.min(anchor + 60, MINUTES_PER_DAY)];
		const select = () => {
			preview = null;
			calendar.select({ start: at(day, range[0]), end: at(day, range[1]), allDay: false, fields });
		};

		trackPointer(
			down,
			{
				onMove: (move) => {
					const minutes = snapMinutes(pointAt(move).minutes, step);
					range =
						minutes > anchor
							? [anchor, minutes]
							: [minutes, Math.min(anchor + step, MINUTES_PER_DAY)];
					preview = {
						...fields,
						id: NEW_EVENT_ID,
						title: '',
						start: at(day, range[0]),
						end: at(day, range[1])
					};
				},
				onDrop: select,
				onClick: select,
				onCancel: () => (preview = null)
			},
			touchOf(calendar)
		);
	}

	function startAllDayDrag(down: PointerEvent, event: CalendarEvent) {
		if (!calendar.canEdit(event, 'move')) return;
		const source = pointAt(down);
		trackPointer(
			down,
			{
				onMove: (move) => {
					const { column, day, minutes } = pointAt(move);
					let moved: CalendarEvent;
					if (isAllDay(event) && !overAllDay(move)) {
						// Dropped on the hours, an all-day event gets a time and `defaultDuration`.
						const start = snapMinutes(minutes, step);
						moved = {
							...event,
							start: at(day, start),
							end: at(day, start).add({ minutes: calendar.defaultDuration })
						} as CalendarEvent;
					} else moved = moveEvent(event, event.start.add({ days: daysBetween(source.day, day) }));
					preview = withColumn(moved, event, source.column, column);
				},
				onDrop: () => finishDrag(event, 'move'),
				onCancel: () => (preview = null),
				onLift: () => (preview = event),
				canScroll: (move) => !overAllDay(move)
			},
			touchOf(calendar)
		);
	}

	function openEvent(event: CalendarEvent, click: Event) {
		if (event.id !== NEW_EVENT_ID) calendar.clickEvent(event, click);
	}

	/** Up/down move by `snapStep` minutes; left/right move a day (or to the next resource column). */
	const timedStepper: MoveStepper<CalendarEvent> = (
		current,
		{ horizontal, vertical, resize, fromStart }
	) => {
		if (resize) {
			if (!vertical) return null;
			return fromStart
				? resizeEventStart(current, current.start.add({ minutes: vertical * step }), {
						minDuration: step
					})
				: resizeEvent(current, current.end.add({ minutes: vertical * step }), {
						minDuration: step
					});
		}
		if (vertical) return moveEvent(current, current.start.add({ minutes: vertical * step }));
		if (!horizontal) return null;
		if (!byResource) return moveEvent(current, current.start.add({ days: horizontal }));
		const index = cols.findIndex(
			(column) => column.resource && current.resourceIds?.includes(column.resource.id)
		);
		const from = cols[index]?.resource;
		const to = cols[index + horizontal]?.resource;
		return from && to
			? { ...current, resourceIds: reassign(current.resourceIds, from.id, to.id) }
			: null;
	};

	/** Delete removes the event; `moveKey` (without modifiers) starts keyboard move mode. */
	function onEventKey(
		key: KeyboardEvent,
		event: CalendarEvent,
		stepper: MoveStepper<CalendarEvent>
	) {
		if (contextMenuKey(key)) return;
		if ((key.key === 'Delete' || key.key === 'Backspace') && calendar.canEdit(event, 'delete')) {
			key.preventDefault();
			void calendar.remove(event.id);
		} else if (
			calendar.canEdit(event, 'move') &&
			key.key.toLowerCase() === calendar.moveKey &&
			!key.ctrlKey &&
			!key.metaKey &&
			!key.altKey
		) {
			key.preventDefault();
			keyboardMove(
				calendar,
				event,
				key.currentTarget as HTMLElement,
				stepper,
				(moved) => (preview = moved)
			);
		}
	}

	type AllDayItem = (typeof allDayItems)[number];
	type TimedItem = TimedEventLayout;

	/** Attributes of an all-day bar; used by the default bar and the `event` snippet. */
	function allDayProps(item: AllDayItem): PartProps {
		const event = item.event;
		return {
			type: 'button',
			class: cn(
				'relative mx-0.5 flex min-w-0 items-center rounded bg-(--event-color)/15 px-1.5 text-start text-xs font-medium [-webkit-touch-callout:none] hover:bg-(--event-color)/25',
				item.continuesBefore && 'ms-0 rounded-s-none',
				item.continuesAfter && 'me-0 rounded-e-none',
				preview?.id === event.id && 'opacity-70 shadow-md',
				calendar.eventClass(event)
			),
			style: `grid-column: ${item.startIndex + 2} / span ${item.span}; grid-row: ${item.lane + 1}; --event-color: ${calendar.colorOf(event)}`,
			title: event.title || calendar.labels.untitled,
			'data-event-id': event.id,
			'aria-keyshortcuts': calendar.canEdit(event, 'move')
				? calendar.moveKey.toUpperCase()
				: undefined,
			onpointerdown: (down: PointerEvent) => startAllDayDrag(down, event),
			onclick: (click: MouseEvent) => openEvent(event, click),
			oncontextmenu: (menu: MouseEvent) => onEventMenu(event, menu),
			onkeydown: (key: KeyboardEvent) => onEventKey(key, event, dayStepper())
		};
	}

	/** Attributes of a timed block; used by the default block and the `event` snippet. */
	function timedProps(item: TimedItem): PartProps {
		const event = item.event;
		return {
			type: 'button',
			class: cn(
				'group absolute flex flex-col overflow-hidden rounded-md border-s-4 border-(--event-color) bg-(--event-color)/15 px-1.5 py-0.5 text-start text-xs ring-1 ring-background [-webkit-touch-callout:none] hover:bg-(--event-color)/25',
				item.continuesBefore && 'rounded-t-none',
				item.continuesAfter && 'rounded-b-none',
				preview?.id === event.id && 'z-20 opacity-80 shadow-lg',
				calendar.eventClass(event)
			),
			style: `top: ${percent(item.start)}; height: ${percent(item.end - item.start)}; inset-inline-start: ${(item.column / item.columns) * 100}%; width: ${100 / item.columns}%; --event-color: ${calendar.colorOf(event)}`,
			title: event.title || calendar.labels.untitled,
			'data-event-id': event.id,
			'aria-keyshortcuts': calendar.canEdit(event, 'move')
				? calendar.moveKey.toUpperCase()
				: undefined,
			onpointerdown: (down: PointerEvent) => startMove(down, item),
			onclick: (click: MouseEvent) => openEvent(event, click),
			oncontextmenu: (menu: MouseEvent) => onEventMenu(event, menu),
			onkeydown: (key: KeyboardEvent) => onEventKey(key, event, timedStepper)
		};
	}

	/** Top and bottom handles of a timed block; edges that continue on another day get none. */
	function resizeProps(item: TimedItem): ResizeHandles {
		if (!calendar.canEdit(item.event, 'resize')) return {};
		const handle = (edge: 'start' | 'end') => ({
			'aria-hidden': 'true',
			class: `absolute inset-x-0 ${edge === 'start' ? 'top-0' : 'bottom-0'} h-2 cursor-ns-resize`,
			onpointerdown: (down: PointerEvent) => startResize(down, item, edge)
		});
		return {
			start: item.continuesBefore ? undefined : handle('start'),
			end: item.continuesAfter ? undefined : handle('end')
		};
	}

	const allDayResize = (item: AllDayItem) =>
		barResizeHandles(calendar, item.event, item, (resized) => (preview = resized));

	function dayHeaderProps(day: CalendarDate): PartProps {
		return {
			type: 'button',
			class: 'flex flex-col items-center gap-0.5 py-1.5 hover:bg-muted',
			onclick: (click: MouseEvent) => calendar.clickDate(day, click)
		};
	}

	/** `onEventContextMenu` decides first; returning false keeps menus around the view from opening. */
	function onEventMenu(event: CalendarEvent, menu: MouseEvent) {
		if (!calendar.contextMenu(event, menu)) menu.stopPropagation();
	}
</script>

<div
	class={cn(
		'flex min-h-0 flex-col overflow-hidden rounded-lg border select-none print:overflow-visible',
		className
	)}
>
	<div class="grid border-b bg-muted/40" style:grid-template-columns={template}>
		<div></div>
		{#each cols as { day, resource }, index (index)}
			{#if resource}
				<div class="flex min-w-0 items-center justify-center gap-1.5 px-1 py-3 text-sm font-medium">
					{#if resourceLabel}
						{@render resourceLabel({ resource })}
					{:else}
						<span
							class="size-2.5 shrink-0 rounded-full bg-(--resource-color)"
							style:--resource-color={resource.color ?? 'var(--primary)'}
						></span>
						<span class="truncate">{resource.title}</span>
					{/if}
				</div>
			{:else}
				{#if dayHeader}
					{@render dayHeader({
						day,
						isToday: isToday(day, calendar.timeZone),
						props: dayHeaderProps(day)
					})}
				{:else}
					<button {...dayHeaderProps(day)}>
						<span aria-hidden="true" class="text-xs font-medium text-muted-foreground capitalize">
							{weekday.format(toDate(day))}
						</span>
						<span
							aria-hidden="true"
							class={cn(
								'inline-flex size-8 items-center justify-center rounded-full text-lg',
								isToday(day, calendar.timeZone) && 'bg-primary text-primary-foreground'
							)}
						>
							{day.day}
						</span>
						<span class="sr-only">{fullDate.format(toDate(day))}</span>
					</button>
				{/if}
			{/if}
		{/each}
	</div>

	<div
		bind:this={allDayElement}
		class="grid auto-rows-[1.5rem] gap-y-0.5 border-b py-1"
		style:grid-template-columns={template}
	>
		<div
			class="self-center pe-2 text-end text-xs leading-tight text-muted-foreground first-letter:uppercase"
			style:grid-row="1 / span {allDayLanes}"
		>
			{calendar.labels.allDay}
		</div>
		{#each cols as { day, resource }, index (index)}
			<!-- Clicking an empty spot creates an all-day event; keyboard users use the toolbar. -->
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
			<div
				data-date={day.toString()}
				class="border-s"
				style:grid-column={index + 2}
				style:grid-row="1 / span {allDayLanes}"
				onclick={() =>
					calendar.select({
						start: day,
						end: day.add({ days: 1 }),
						allDay: true,
						fields: resource ? { resourceIds: [resource.id] } : {}
					})}
			></div>
		{/each}
		{#each allDayItems as item (`${item.event.id}:${item.startIndex}`)}
			{@const event = item.event}
			{#if eventSnippet}
				{@render eventSnippet({
					event,
					props: allDayProps(item),
					resizeProps: allDayResize(item),
					dragging: preview?.id === event.id,
					allDay: true
				})}
			{:else}
				{@const resize = allDayResize(item)}
				<button {...allDayProps(item)}>
					{#if eventContent}
						{@render eventContent(event)}
					{:else}
						<span class="truncate">{event.title || calendar.labels.untitled}</span>
					{/if}
					{#if resize.start}<span {...resize.start}></span>{/if}
					{#if resize.end}<span {...resize.end}></span>{/if}
				</button>
			{/if}
		{/each}
	</div>

	<div
		class="min-h-0 flex-1 overflow-y-auto print:overflow-visible"
		{@attach (node) => {
			node.scrollTop = (node.scrollHeight * scrollToHour) / 24;
		}}
	>
		<div
			class="relative grid"
			style:grid-template-columns={template}
			style:height="calc({hourHeight} * 24)"
		>
			<div class="relative">
				{#each { length: 23 }, index (index)}
					<span
						class="absolute end-2 -translate-y-1/2 text-xs text-muted-foreground"
						style:top={percent((index + 1) * 60)}
					>
						{#if hourLabel}
							{@render hourLabel({ hour: index + 1, label: formatHour(index + 1) })}
						{:else}
							{formatHour(index + 1)}
						{/if}
					</span>
				{/each}
			</div>

			{#each cols as column, dayIndex (dayIndex)}
				{@const day = column.day}
				<!-- Pressing an empty slot creates an event; keyboard users use the toolbar. -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					bind:this={columnElements[dayIndex]}
					class="relative border-s"
					style:background-image="repeating-linear-gradient(to bottom, var(--border) 0 1px,
					transparent 1px {hourHeight})"
					onpointerdown={(down) => startCreate(down, column)}
				>
					{#each dayItems[dayIndex] ?? [] as item (item.event.id)}
						{@const event = item.event}
						{#if eventSnippet}
							{@render eventSnippet({
								event,
								props: timedProps(item),
								dragging: preview?.id === event.id,
								allDay: false,
								resizeProps: resizeProps(item)
							})}
						{:else}
							{@const resize = resizeProps(item)}
							<button {...timedProps(item)}>
								{#if eventContent}
									{@render eventContent(event)}
								{:else}
									<span class="truncate font-medium">{event.title || calendar.labels.untitled}</span
									>
									{#if !isAllDay(event)}
										<span class="truncate text-muted-foreground">
											{time.formatRange(event.start.toDate(), event.end.toDate())}
										</span>
									{/if}
								{/if}
								{#if resize.start}<span {...resize.start}></span>{/if}
								{#if resize.end}<span {...resize.end}></span>{/if}
							</button>
						{/if}
					{/each}

					{#if toCalendarDate(current).compare(day) === 0}
						<div
							class="pointer-events-none absolute inset-x-0 z-10"
							style:top={percent(nowMinutes)}
						>
							{#if nowIndicator}
								{@render nowIndicator({ time: current })}
							{:else}
								<div class="relative h-0.5 bg-destructive">
									<span class="absolute -start-1 -top-1 size-2.5 rounded-full bg-destructive"
									></span>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>
