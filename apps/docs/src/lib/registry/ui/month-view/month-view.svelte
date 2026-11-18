<script lang="ts">
	import { DateFormatter, isSameMonth, isToday, type CalendarDate } from '@internationalized/date';
	import { isAllDay, layoutWeekRow, monthGrid, type CalendarEvent } from '@calendar-kit/core';
	import type { Snippet } from 'svelte';
	import { dragAcrossDays, touchOf, withPreview } from '#lib/registry/lib/calendar-drag.js';
	import * as Popover from '#lib/registry/ui/popover/index.js';
	import { dayStepper, keyboardMove } from '#lib/registry/lib/calendar-keyboard.js';
	import {
		getCalendar,
		pluralLabel,
		type DaySnippetArgs,
		type EventSnippetArgs,
		type PartProps
	} from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	interface Props {
		class?: string;
		/** Event lanes shown per week before collapsing the rest into "+N". */
		maxLanes?: number;
		/** Custom content inside each event chip (the chip itself stays). */
		eventContent?: Snippet<[CalendarEvent]>;
		/** Replaces the whole event chip. Spread `props` on your element to keep dragging, clicks and ARIA. */
		event?: Snippet<[EventSnippetArgs]>;
		/** Replaces the day number button. Spread `props` to keep opening the day. */
		dayNumber?: Snippet<[DaySnippetArgs & { inMonth: boolean }]>;
		/** Extra content inside each day cell, under the day number (e.g. an icon or a count). */
		dayCell?: Snippet<
			[{ day: CalendarDate; isToday: boolean; inMonth: boolean; events: CalendarEvent[] }]
		>;
		/** Replaces the "+N" button. Spread `props` to keep opening the day's list. */
		more?: Snippet<
			[{ day: CalendarDate; count: number; events: CalendarEvent[]; props: PartProps }]
		>;
	}

	let {
		class: className,
		maxLanes = 3,
		eventContent,
		event: eventSnippet,
		dayNumber,
		dayCell,
		more
	}: Props = $props();

	const calendar = getCalendar();

	// Event being dragged, at its preview position.
	let preview: CalendarEvent | null = $state.raw(null);

	const events = $derived(withPreview(calendar.visibleEvents, preview));
	const weeks = $derived(
		monthGrid(calendar.date, calendar.weekOptions).map((days) => ({
			days,
			items: layoutWeekRow(events, days, calendar.timeZone)
		}))
	);

	const formatter = (options: Intl.DateTimeFormatOptions) =>
		new DateFormatter(calendar.locale, { ...options, timeZone: calendar.timeZone });
	const weekday = $derived(formatter({ weekday: 'short' }));
	const time = $derived(formatter({ hour: 'numeric', minute: '2-digit' }));
	const fullDate = $derived(formatter({ dateStyle: 'full' }));

	/** Day whose "+N" list is open. */
	let openDay: string | null = $state(null);

	function setOpen(key: string, open: boolean, day: CalendarDate, events: CalendarEvent[]) {
		if (!open) {
			if (openDay === key) openDay = null;
		} else if (calendar.clickMore(day, events)) openDay = key;
	}

	/** Every event shown on a day of the week row, hidden or not, in lane order. */
	function eventsOnDay(items: (typeof weeks)[number]['items'], dayIndex: number) {
		return items
			.filter((item) => item.startIndex <= dayIndex && dayIndex < item.startIndex + item.span)
			.sort((a, b) => a.lane - b.lane)
			.map((item) => item.event);
	}

	function hiddenCount(items: (typeof weeks)[number]['items'], dayIndex: number) {
		return items.filter(
			(item) =>
				item.lane >= maxLanes &&
				item.startIndex <= dayIndex &&
				dayIndex < item.startIndex + item.span
		).length;
	}

	function startDrag(down: PointerEvent, event: CalendarEvent) {
		if (!calendar.canEdit(event, 'move')) return;
		dragAcrossDays(
			down,
			event,
			{
				onPreview: (moved) => (preview = moved),
				onDrop: (moved) => {
					if (moved) void calendar.changeEvent({ event: moved, previous: event, kind: 'move' });
				}
			},
			touchOf(calendar)
		);
	}

	/** Delete removes the event; `moveKey` (without modifiers) starts keyboard move mode. */
	function onEventKey(key: KeyboardEvent, event: CalendarEvent) {
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
				dayStepper(7),
				(moved) => (preview = moved)
			);
		}
	}

	const toDate = (day: CalendarDate) => day.toDate(calendar.timeZone);

	type Item = (typeof weeks)[number]['items'][number];

	/** Everything an event chip needs to behave as one; used by the default chip and `event`. */
	function eventProps(item: Item): PartProps {
		const event = item.event;
		const bar = isAllDay(event) || item.span > 1;
		return {
			type: 'button',
			class: cn(
				'pointer-events-auto mx-0.5 flex min-w-0 items-center gap-1 rounded px-1.5 text-start text-xs [-webkit-touch-callout:none]',
				bar
					? 'bg-(--event-color)/15 font-medium text-foreground hover:bg-(--event-color)/25'
					: 'text-foreground hover:bg-muted',
				item.continuesBefore && 'ms-0 rounded-s-none',
				item.continuesAfter && 'me-0 rounded-e-none',
				preview?.id === event.id && 'opacity-70 shadow-md',
				calendar.eventClass(event)
			),
			style: `grid-column: ${item.startIndex + 1} / span ${item.span}; grid-row: ${item.lane + 1}; --event-color: ${event.color ?? 'var(--primary)'}`,
			title: event.title || calendar.labels.untitled,
			'data-event-id': event.id,
			'aria-keyshortcuts': calendar.canEdit(event, 'move')
				? calendar.moveKey.toUpperCase()
				: undefined,
			onpointerdown: (down: PointerEvent) => startDrag(down, event),
			onclick: (click: MouseEvent) => calendar.clickEvent(event, click),
			onkeydown: (key: KeyboardEvent) => onEventKey(key, event)
		};
	}

	function dayNumberProps(day: CalendarDate): PartProps {
		return {
			type: 'button',
			class: cn(
				'inline-flex size-7 items-center justify-center rounded-full text-xs hover:bg-muted',
				isToday(day, calendar.timeZone) && 'bg-primary text-primary-foreground hover:bg-primary/90'
			),
			'aria-label': fullDate.format(toDate(day)),
			onclick: (click: MouseEvent) => calendar.clickDate(day, click)
		};
	}
</script>

<div
	class={cn(
		'flex flex-col overflow-y-auto rounded-lg border select-none print:overflow-visible',
		className
	)}
>
	<div class="grid grid-cols-7 border-b bg-muted/40">
		{#each weeks[0]?.days ?? [] as day (day.toString())}
			<div class="px-2 py-1.5 text-center text-xs font-medium text-muted-foreground capitalize">
				{weekday.format(toDate(day))}
			</div>
		{/each}
	</div>

	{#each weeks as week (week.days[0]?.toString())}
		<!-- Tall enough for the day number, `maxLanes` lanes and the "+N" row. -->
		<div
			class="relative grid flex-1 grid-cols-7 border-b last:border-b-0"
			style:min-height="calc(2.5rem + {maxLanes + 1} * 1.5rem)"
		>
			{#each week.days as day (day.toString())}
				<!-- Clicking an empty spot creates an all-day event; keyboard users use the toolbar. -->
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
				<div
					data-date={day.toString()}
					class={cn(
						'border-e p-1 last:border-e-0',
						!isSameMonth(day, calendar.date) && 'bg-muted/30 text-muted-foreground'
					)}
					onclick={(click) => {
						if (click.target === click.currentTarget)
							calendar.select({ start: day, end: day.add({ days: 1 }), allDay: true, fields: {} });
					}}
				>
					{#if dayNumber}
						{@render dayNumber({
							day,
							isToday: isToday(day, calendar.timeZone),
							inMonth: isSameMonth(day, calendar.date),
							props: dayNumberProps(day)
						})}
					{:else}
						<button {...dayNumberProps(day)}>{day.day}</button>
					{/if}
					{@render dayCell?.({
						day,
						isToday: isToday(day, calendar.timeZone),
						inMonth: isSameMonth(day, calendar.date),
						events: eventsOnDay(week.items, week.days.indexOf(day))
					})}
				</div>
			{/each}

			<div
				class="pointer-events-none absolute inset-x-0 top-9 grid auto-rows-[1.375rem] grid-cols-7 gap-y-0.5 px-0.5"
			>
				{#each week.items.filter((item) => item.lane < maxLanes) as item (item.event.id)}
					{@const event = item.event}
					{#if eventSnippet}
						{@render eventSnippet({
							event,
							props: eventProps(item),
							dragging: preview?.id === event.id
						})}
					{:else}
						{@const bar = isAllDay(event) || item.span > 1}
						<button {...eventProps(item)}>
							{#if eventContent}
								{@render eventContent(event)}
							{:else}
								{#if !bar}
									<span class="size-2 shrink-0 rounded-full bg-(--event-color)"></span>
									{#if !isAllDay(event)}
										<span class="shrink-0 text-muted-foreground"
											>{time.format(event.start.toDate())}</span
										>
									{/if}
								{/if}
								<span class="truncate">{event.title || calendar.labels.untitled}</span>
							{/if}
						</button>
					{/if}
				{/each}

				{#each week.days as day, dayIndex (day.toString())}
					{@const hidden = hiddenCount(week.items, dayIndex)}
					{#if hidden > 0}
						{@const key = day.toString()}
						{@const dayEvents = eventsOnDay(week.items, dayIndex)}
						<!-- Opening goes through onMoreClick, which may keep it closed and do something else. -->
						<Popover.Root
							bind:open={() => openDay === key, (open) => setOpen(key, open, day, dayEvents)}
						>
							<Popover.Trigger
								class="pointer-events-auto mx-0.5 rounded px-1.5 text-start text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground data-[state=open]:text-foreground"
								style="grid-column: {dayIndex + 1}; grid-row: {maxLanes + 1}"
							>
								{#snippet child({ props })}
									{#if more}
										{@render more({ day, count: hidden, events: dayEvents, props })}
									{:else}
										<button {...props}>
											<span aria-hidden="true">+{hidden}</span>
											<span class="sr-only">
												{pluralLabel(calendar.labels.moreEvents, hidden, calendar.locale)},
												{fullDate.format(toDate(day))}
											</span>
										</button>
									{/if}
								{/snippet}
							</Popover.Trigger>
							<Popover.Content
								class="w-64 gap-2 p-2"
								align="start"
								role="dialog"
								aria-label={fullDate.format(toDate(day))}
							>
								<button
									type="button"
									class="rounded px-2 py-1 text-start text-sm font-semibold first-letter:uppercase hover:bg-muted"
									onclick={(click) => {
										openDay = null;
										calendar.clickDate(day, click);
									}}
								>
									{fullDate.format(toDate(day))}
								</button>
								<ul class="grid gap-0.5">
									{#each dayEvents as event (event.id)}
										<li>
											<button
												type="button"
												class="flex w-full min-w-0 items-center gap-1.5 rounded px-2 py-1 text-start text-xs hover:bg-muted"
												style:--event-color={event.color ?? 'var(--primary)'}
												onclick={(click) => {
													openDay = null;
													calendar.clickEvent(event, click);
												}}
											>
												{#if eventContent}
													{@render eventContent(event)}
												{:else}
													<span class="size-2 shrink-0 rounded-full bg-(--event-color)"></span>
													{#if !isAllDay(event)}
														<span class="shrink-0 text-muted-foreground"
															>{time.format(event.start.toDate())}</span
														>
													{/if}
													<span class="truncate">{event.title || calendar.labels.untitled}</span>
												{/if}
											</button>
										</li>
									{/each}
								</ul>
							</Popover.Content>
						</Popover.Root>
					{/if}
				{/each}
			</div>
		</div>
	{/each}
</div>
