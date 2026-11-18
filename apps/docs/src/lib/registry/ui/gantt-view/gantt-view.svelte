<script lang="ts">
	import { DateFormatter, isToday, type CalendarDate } from '@internationalized/date';
	import { eventBounds, layoutWeekRow, type CalendarEvent } from '@calendar-kit/core';
	import type { Snippet } from 'svelte';
	import {
		barResizeHandles,
		dragAcrossDays,
		touchOf,
		withPreview
	} from '#lib/registry/lib/calendar-drag.js';
	import { dayStepper, keyboardMove } from '#lib/registry/lib/calendar-keyboard.js';
	import {
		getCalendar,
		type DaySnippetArgs,
		type EventSnippetArgs,
		type PartProps
	} from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	interface Props {
		class?: string;
		/** Which events are tasks. Defaults to events with `progress` or `dependsOn`. */
		filter?: (event: CalendarEvent) => boolean;
		/** Custom content inside each bar (the bar and its progress fill stay). */
		eventContent?: Snippet<[CalendarEvent]>;
		/** Replaces the whole task bar. Spread `props` to keep dragging, clicks and ARIA. */
		event?: Snippet<[EventSnippetArgs]>;
		/** Replaces the day header button. Spread `props` to keep opening the day. */
		dayHeader?: Snippet<[DaySnippetArgs]>;
		/** Content of a task label in the first column. */
		taskLabel?: Snippet<[{ event: CalendarEvent; progress: string | undefined }]>;
	}

	let {
		class: className,
		filter = (event) => event.progress !== undefined || !!event.dependsOn?.length,
		eventContent,
		event: eventSnippet,
		dayHeader,
		taskLabel
	}: Props = $props();

	const calendar = getCalendar();

	let preview: CalendarEvent | null = $state.raw(null);
	let width = $state(0);
	let height = $state(0);
	/** Right-to-left pages mirror the dependency arrows. */
	let rtl = $state(false);

	const days = $derived.by(() => {
		const list: CalendarDate[] = [];
		for (
			let day = calendar.range.start;
			day.compare(calendar.range.end) < 0;
			day = day.add({ days: 1 })
		) {
			list.push(day);
		}
		return list;
	});

	const rows = $derived(
		withPreview(calendar.visibleEvents, preview)
			.filter(filter)
			.map((event) => ({ event, item: layoutWeekRow([event], days, calendar.timeZone)[0] }))
			.filter((row) => row.item)
			.sort(
				(a, b) =>
					eventBounds(a.event, calendar.timeZone).start -
					eventBounds(b.event, calendar.timeZone).start
			)
	);

	/** Lines from the end of each dependency to the start of the task that waits for it, in pixels. */
	const links = $derived.by(() => {
		const column = width / days.length;
		const row = rows.length ? height / rows.length : 0;
		const index = new Map(rows.map((entry, position) => [entry.event.id, position]));
		return rows.flatMap((entry, position) =>
			(entry.event.dependsOn ?? []).flatMap((id) => {
				const from = index.get(id);
				const source = from === undefined ? undefined : rows[from]?.item;
				if (from === undefined || !source) return [];
				const mirror = (x: number) => (rtl ? width - x : x);
				const x1 = mirror((source.startIndex + source.span) * column);
				const x2 = mirror(entry.item!.startIndex * column);
				const step = rtl ? -8 : 8;
				const y1 = (from + 0.5) * row;
				const y2 = (position + 0.5) * row;
				// Out of the dependency's end, down (or up) to the task's row, then into its start.
				const d = `M ${x1} ${y1} H ${x1 + step} V ${y2} H ${x2 - step / 4}`;
				return [{ id: `${id}->${entry.event.id}`, d }];
			})
		);
	});

	const formatter = (options: Intl.DateTimeFormatOptions) =>
		new DateFormatter(calendar.locale, { ...options, timeZone: calendar.timeZone });
	const weekday = $derived(formatter({ weekday: 'narrow' }));
	const fullDate = $derived(formatter({ dateStyle: 'full' }));
	const percent = $derived(new Intl.NumberFormat(calendar.locale, { style: 'percent' }));
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
				dayStepper(),
				(moved) => (preview = moved)
			);
		}
	}

	const toDate = (day: CalendarDate) => day.toDate(calendar.timeZone);
	const dayColumns = $derived(`repeat(${days.length}, minmax(0, 1fr))`);

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

	type Item = NonNullable<(typeof rows)[number]['item']>;

	/** Attributes of a task bar; used by the default bar and the `event` snippet. */
	function eventProps(event: CalendarEvent, item: Item): PartProps {
		const title = event.title || calendar.labels.untitled;
		return {
			type: 'button',
			class: cn(
				'absolute inset-y-2 flex items-center overflow-hidden rounded bg-(--event-color)/25 text-start text-xs font-medium [-webkit-touch-callout:none] hover:ring-2 hover:ring-(--event-color)/50',
				preview?.id === event.id && 'opacity-80 shadow-md',
				calendar.eventClass(event)
			),
			style: `inset-inline-start: ${(item.startIndex / days.length) * 100}%; width: ${(item.span / days.length) * 100}%; --event-color: ${event.color ?? 'var(--primary)'}`,
			title,
			'aria-label':
				event.progress !== undefined
					? `${title}, ${calendar.labels.progress} ${percent.format(event.progress)}`
					: title,
			'data-event-id': event.id,
			'aria-keyshortcuts': calendar.canEdit(event, 'move')
				? calendar.moveKey.toUpperCase()
				: undefined,
			onpointerdown: (down: PointerEvent) => startDrag(down, event),
			onclick: (click: MouseEvent) => calendar.clickEvent(event, click),
			onkeydown: (key: KeyboardEvent) => onEventKey(key, event)
		};
	}

	function dayHeaderProps(day: CalendarDate): PartProps {
		return {
			type: 'button',
			class: cn(
				'flex flex-col items-center py-1 text-xs hover:bg-muted',
				isToday(day, calendar.timeZone) && 'font-semibold text-primary'
			),
			onclick: (click: MouseEvent) => calendar.clickDate(day, click)
		};
	}

	/** The bar spans the whole shown range when it is clipped, so clipped edges get no handle. */
	function resizeHandles(event: CalendarEvent, item: Item) {
		return barResizeHandles(
			calendar,
			event,
			{ continuesBefore: item.continuesBefore, continuesAfter: item.continuesAfter },
			(resized) => (preview = resized)
		);
	}
</script>

<div
	class={cn(
		'min-h-0 overflow-auto rounded-lg border select-none print:overflow-visible',
		className
	)}
>
	{#if rows.length === 0}
		<p class="p-10 text-center text-muted-foreground">{calendar.labels.noEvents}</p>
	{:else}
		<div
			class="grid min-w-max"
			style:grid-template-columns="minmax(10rem,16rem) minmax({days.length * 2}rem, 1fr)"
		>
			<div class="sticky start-0 top-0 z-20 border-e border-b bg-background"></div>
			<div
				class="sticky top-0 z-10 grid border-b bg-background"
				style:grid-template-columns={dayColumns}
			>
				{#each days as day (day.toString())}
					{#if dayHeader}
						{@render dayHeader({
							day,
							isToday: isToday(day, calendar.timeZone),
							props: dayHeaderProps(day)
						})}
					{:else}
						<button {...dayHeaderProps(day)}>
							<span aria-hidden="true" class="text-muted-foreground uppercase"
								>{weekday.format(toDate(day))}</span
							>
							<span aria-hidden="true">{day.day}</span>
							<span class="sr-only">{fullDate.format(toDate(day))}</span>
						</button>
					{/if}
				{/each}
			</div>

			<div class="sticky start-0 z-10 border-e bg-background">
				{#each rows as { event } (event.id)}
					<div class="flex h-10 items-center justify-between gap-2 border-b px-3 text-sm">
						{#if taskLabel}
							{@render taskLabel({
								event,
								progress: event.progress === undefined ? undefined : percent.format(event.progress)
							})}
						{:else}
							<span class="truncate">{event.title || calendar.labels.untitled}</span>
							{#if event.progress !== undefined}
								<span
									class="shrink-0 text-xs text-muted-foreground"
									title={calendar.labels.progress}
								>
									{percent.format(event.progress)}
								</span>
							{/if}
						{/if}
					</div>
				{/each}
			</div>

			<div
				class="relative"
				bind:clientWidth={width}
				bind:clientHeight={height}
				{@attach (node) => {
					rtl = getComputedStyle(node).direction === 'rtl';
				}}
			>
				{#each rows as { event, item } (event.id)}
					<div class="relative grid h-10 border-b" style:grid-template-columns={dayColumns}>
						{#each days as day (day.toString())}
							<div
								data-date={day.toString()}
								class={cn(
									'border-e last:border-e-0',
									isToday(day, calendar.timeZone) && 'bg-primary/5'
								)}
							></div>
						{/each}
						{#if eventSnippet}
							{@render eventSnippet({
								event,
								resizeProps: resizeHandles(event, item!),
								props: eventProps(event, item!),
								dragging: preview?.id === event.id
							})}
						{:else}
							{@const resize = resizeHandles(event, item!)}
							<button {...eventProps(event, item!)}>
								<span
									class="absolute inset-y-0 start-0 bg-(--event-color)/60"
									style:width="{(event.progress ?? 0) * 100}%"
								></span>
								<span class="relative truncate px-2">
									{#if eventContent}{@render eventContent(event)}{:else}{event.title ||
											calendar.labels.untitled}{/if}
								</span>
								{#if resize.start}<span {...resize.start}></span>{/if}
								{#if resize.end}<span {...resize.end}></span>{/if}
							</button>
						{/if}
					</div>
				{/each}

				<svg
					class="pointer-events-none absolute inset-0 size-full overflow-visible"
					aria-hidden="true"
				>
					<defs>
						<marker
							id="gantt-arrow"
							viewBox="0 0 8 8"
							refX="7"
							refY="4"
							markerWidth="7"
							markerHeight="7"
							orient="auto-start-reverse"
						>
							<path d="M 0 0 L 8 4 L 0 8 z" class="fill-muted-foreground" />
						</marker>
					</defs>
					{#each links as link (link.id)}
						<path
							d={link.d}
							class="fill-none stroke-muted-foreground"
							stroke-width="1.5"
							marker-end="url(#gantt-arrow)"
						/>
					{/each}
				</svg>
			</div>
		</div>
	{/if}
</div>
