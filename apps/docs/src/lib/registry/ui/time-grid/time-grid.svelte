<script lang="ts">
	import {
		DateFormatter,
		fromAbsolute,
		isToday,
		toCalendarDate,
		toZoned,
		type CalendarDate
	} from '@internationalized/date';
	import {
		eventsForResource,
		flattenResources,
		isAllDay,
		layoutTimedEvents,
		layoutWeekRow,
		moveEvent,
		resizeEvent,
		snapMinutes,
		spansDays,
		zonedAt,
		type CalendarEvent,
		type Resource,
		type TimedEvent,
		type TimedEventLayout
	} from '@calendar-kit/core';
	import type { Snippet } from 'svelte';
	import { dragAcrossDays, trackPointer, withPreview } from '#lib/registry/lib/calendar-drag.js';
	import { getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	interface Props {
		/** Show one column per resource (for the shown day) instead of one per day. */
		resources?: Resource[];
		class?: string;
		/** Height of one hour, as a CSS length. */
		hourHeight?: string;
		/** Hour the grid scrolls to when it mounts. */
		scrollToHour?: number;
		/** Custom content inside each event block. */
		eventContent?: Snippet<[CalendarEvent]>;
	}

	let {
		resources,
		class: className,
		hourHeight = '3rem',
		scrollToHour = 7,
		eventContent
	}: Props = $props();

	const calendar = getCalendar();
	const MINUTES_PER_DAY = 24 * 60;
	const NEW_EVENT_ID = 'calendar-new-event';
	const percent = (minutes: number) => `${(minutes / MINUTES_PER_DAY) * 100}%`;

	// Event being dragged, resized or drawn, at its preview position.
	let preview: CalendarEvent | null = $state.raw(null);
	let columnElements: HTMLElement[] = $state([]);

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
	const hourLabel = (h: number) =>
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
		if (!calendar.canEdit(item.event)) return;
		const event = item.event as TimedEvent;
		const source = pointAt(down);
		const grab = source.minutes - item.start;

		trackPointer(down, {
			onMove: (move) => {
				const { column, day, minutes } = pointAt(move);
				const moved = moveEvent(event, at(day, snapMinutes(minutes - grab, step)));
				const from = source.column.resource?.id;
				const to = column.resource?.id;
				preview =
					from && to ? { ...moved, resourceIds: reassign(event.resourceIds, from, to) } : moved;
			},
			onDrop: () => finishDrag(event, 'move'),
			onCancel: () => (preview = null)
		});
	}

	function startResize(down: PointerEvent, item: TimedEventLayout) {
		down.stopPropagation();
		if (!calendar.canEdit(item.event)) return;
		const event = item.event as TimedEvent;

		trackPointer(down, {
			onMove: (move) => {
				const { day, minutes } = pointAt(move);
				preview = resizeEvent(event, at(day, snapMinutes(minutes, step)), { minDuration: step });
			},
			onDrop: () => finishDrag(event, 'resize'),
			onCancel: () => (preview = null)
		});
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

		trackPointer(down, {
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
		});
	}

	function startAllDayDrag(down: PointerEvent, event: CalendarEvent) {
		if (!calendar.canEdit(event)) return;
		dragAcrossDays(down, event, {
			onPreview: (moved) => (preview = moved),
			onDrop: (moved) => {
				if (moved) void calendar.changeEvent({ event: moved, previous: event, kind: 'move' });
			}
		});
	}

	function openEvent(event: CalendarEvent, click: Event) {
		if (event.id !== NEW_EVENT_ID) calendar.clickEvent(event, click);
	}

	function onEventKey(key: KeyboardEvent, event: CalendarEvent) {
		if ((key.key === 'Delete' || key.key === 'Backspace') && calendar.canEdit(event)) {
			key.preventDefault();
			void calendar.remove(event.id);
		}
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
					<span
						class="size-2.5 shrink-0 rounded-full bg-(--resource-color)"
						style:--resource-color={resource.color ?? 'var(--primary)'}
					></span>
					<span class="truncate">{resource.title}</span>
				</div>
			{:else}
				<button
					type="button"
					class="flex flex-col items-center gap-0.5 py-1.5 hover:bg-muted"
					aria-label={fullDate.format(toDate(day))}
					onclick={(click) => calendar.clickDate(day, click)}
				>
					<span class="text-xs font-medium text-muted-foreground capitalize">
						{weekday.format(toDate(day))}
					</span>
					<span
						class={cn(
							'inline-flex size-8 items-center justify-center rounded-full text-lg',
							isToday(day, calendar.timeZone) && 'bg-primary text-primary-foreground'
						)}
					>
						{day.day}
					</span>
				</button>
			{/if}
		{/each}
	</div>

	<div
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
			<button
				type="button"
				class={cn(
					'mx-0.5 flex min-w-0 touch-none items-center rounded bg-(--event-color)/15 px-1.5 text-start text-xs font-medium hover:bg-(--event-color)/25',
					item.continuesBefore && 'ms-0 rounded-s-none',
					item.continuesAfter && 'me-0 rounded-e-none',
					preview?.id === event.id && 'opacity-70 shadow-md'
				)}
				style:grid-column="{item.startIndex + 2} / span {item.span}"
				style:grid-row={item.lane + 1}
				style:--event-color={event.color ?? 'var(--primary)'}
				title={event.title || calendar.labels.untitled}
				onpointerdown={(down) => startAllDayDrag(down, event)}
				onclick={(click) => openEvent(event, click)}
				onkeydown={(key) => onEventKey(key, event)}
			>
				{#if eventContent}
					{@render eventContent(event)}
				{:else}
					<span class="truncate">{event.title || calendar.labels.untitled}</span>
				{/if}
			</button>
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
						{hourLabel(index + 1)}
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
						<button
							type="button"
							class={cn(
								'group absolute flex touch-none flex-col overflow-hidden rounded-md border-s-4 border-(--event-color) bg-(--event-color)/15 px-1.5 py-0.5 text-start text-xs ring-1 ring-background hover:bg-(--event-color)/25',
								item.continuesBefore && 'rounded-t-none',
								item.continuesAfter && 'rounded-b-none',
								preview?.id === event.id && 'z-20 opacity-80 shadow-lg'
							)}
							style:top={percent(item.start)}
							style:height={percent(item.end - item.start)}
							style:inset-inline-start="{(item.column / item.columns) * 100}%"
							style:width="{100 / item.columns}%"
							style:--event-color={event.color ?? 'var(--primary)'}
							title={event.title || calendar.labels.untitled}
							onpointerdown={(down) => startMove(down, item)}
							onclick={(click) => openEvent(event, click)}
							onkeydown={(key) => onEventKey(key, event)}
						>
							{#if eventContent}
								{@render eventContent(event)}
							{:else}
								<span class="truncate font-medium">{event.title || calendar.labels.untitled}</span>
								{#if !isAllDay(event)}
									<span class="truncate text-muted-foreground">
										{time.formatRange(event.start.toDate(), event.end.toDate())}
									</span>
								{/if}
							{/if}
							{#if calendar.canEdit(event) && !item.continuesAfter}
								<span
									aria-hidden="true"
									class="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
									onpointerdown={(down) => startResize(down, item)}
								></span>
							{/if}
						</button>
					{/each}

					{#if toCalendarDate(current).compare(day) === 0}
						<div
							class="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-destructive"
							style:top={percent(nowMinutes)}
						>
							<span class="absolute -start-1 -top-1 size-2.5 rounded-full bg-destructive"></span>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>
