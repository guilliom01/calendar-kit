<script lang="ts">
	import {
		DateFormatter,
		isToday,
		now,
		toCalendarDate,
		toZoned,
		type CalendarDate
	} from '@internationalized/date';
	import {
		isAllDay,
		layoutTimedEvents,
		layoutWeekRow,
		spansDays,
		type CalendarEvent
	} from '@calendar-kit/core';
	import type { Snippet } from 'svelte';
	import { getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	interface Props {
		class?: string;
		/** Height of one hour, as a CSS length. */
		hourHeight?: string;
		/** Hour the grid scrolls to when it mounts. */
		scrollToHour?: number;
		/** Text next to the all-day row, e.g. "Todo el día". Intl has no translation for it. */
		allDayLabel?: string;
		/** Custom content inside each event block. */
		eventContent?: Snippet<[CalendarEvent]>;
	}

	let {
		class: className,
		hourHeight = '3rem',
		scrollToHour = 7,
		allDayLabel = '',
		eventContent
	}: Props = $props();

	const calendar = getCalendar();
	const MINUTES_PER_DAY = 24 * 60;
	const percent = (minutes: number) => `${(minutes / MINUTES_PER_DAY) * 100}%`;

	const days = $derived(calendar.days);
	const columns = $derived(`4rem repeat(${days.length}, minmax(0, 1fr))`);
	const allDayItems = $derived(
		layoutWeekRow(calendar.visibleEvents.filter(spansDays), days, calendar.timeZone)
	);
	const allDayLanes = $derived(Math.max(0, ...allDayItems.map((item) => item.lane + 1)));
	const dayItems = $derived(
		days.map((day) => layoutTimedEvents(calendar.visibleEvents, day, calendar.timeZone))
	);

	const formatter = (options: Intl.DateTimeFormatOptions) =>
		new DateFormatter(calendar.locale, { ...options, timeZone: calendar.timeZone });
	const weekday = $derived(formatter({ weekday: 'short' }));
	const fullDate = $derived(formatter({ dateStyle: 'full' }));
	const hour = $derived(formatter({ hour: 'numeric' }));
	const time = $derived(formatter({ hour: 'numeric', minute: '2-digit' }));

	// Current time, refreshed every minute, for the "now" line.
	let current = $state(now(calendar.timeZone));
	$effect(() => {
		const timer = setInterval(() => (current = now(calendar.timeZone)), 60_000);
		return () => clearInterval(timer);
	});
	const nowMinutes = $derived(current.hour * 60 + current.minute);

	const toDate = (day: CalendarDate) => day.toDate(calendar.timeZone);
	const hourLabel = (h: number) =>
		hour.format(toZoned(days[0]!, calendar.timeZone).set({ hour: h }).toDate());
</script>

<div class={cn('flex min-h-0 flex-col overflow-hidden rounded-lg border', className)}>
	<div class="grid border-b bg-muted/40" style:grid-template-columns={columns}>
		<div></div>
		{#each days as day (day.toString())}
			<button
				type="button"
				class="flex flex-col items-center gap-0.5 py-1.5 hover:bg-muted"
				aria-label={fullDate.format(toDate(day))}
				onclick={() => calendar.openDay(day)}
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
		{/each}
	</div>

	{#if allDayLanes > 0}
		<div
			class="grid auto-rows-[1.5rem] gap-y-0.5 border-b py-1"
			style:grid-template-columns={columns}
		>
			<div
				class="self-center pe-2 text-end text-xs text-muted-foreground first-letter:uppercase"
				style:grid-row="1 / span {allDayLanes}"
			>
				{allDayLabel}
			</div>
			{#each allDayItems as item (item.event.id)}
				<div
					class={cn(
						'mx-0.5 flex min-w-0 items-center rounded bg-(--event-color)/15 px-1.5 text-xs font-medium',
						item.continuesBefore && 'ms-0 rounded-s-none',
						item.continuesAfter && 'me-0 rounded-e-none'
					)}
					style:grid-column="{item.startIndex + 2} / span {item.span}"
					style:grid-row={item.lane + 1}
					style:--event-color={item.event.color ?? 'var(--primary)'}
					title={item.event.title}
				>
					{#if eventContent}
						{@render eventContent(item.event)}
					{:else}
						<span class="truncate">{item.event.title}</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<div
		class="min-h-0 flex-1 overflow-y-auto"
		{@attach (node) => {
			node.scrollTop = (node.scrollHeight * scrollToHour) / 24;
		}}
	>
		<div
			class="relative grid"
			style:grid-template-columns={columns}
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

			{#each days as day, dayIndex (day.toString())}
				<div
					class="relative border-s"
					style:background-image="repeating-linear-gradient(to bottom, var(--border) 0 1px,
					transparent 1px {hourHeight})"
				>
					{#each dayItems[dayIndex] ?? [] as item (item.event.id)}
						{@const event = item.event}
						<div
							class={cn(
								'absolute overflow-hidden rounded-md border-s-4 border-(--event-color) bg-(--event-color)/15 px-1.5 py-0.5 text-xs ring-1 ring-background',
								item.continuesBefore && 'rounded-t-none',
								item.continuesAfter && 'rounded-b-none'
							)}
							style:top={percent(item.start)}
							style:height={percent(item.end - item.start)}
							style:left="{(item.column / item.columns) * 100}%"
							style:width="{100 / item.columns}%"
							style:--event-color={event.color ?? 'var(--primary)'}
							title={event.title}
						>
							{#if eventContent}
								{@render eventContent(event)}
							{:else}
								<p class="truncate font-medium">{event.title}</p>
								{#if !isAllDay(event)}
									<p class="truncate text-muted-foreground">
										{time.formatRange(event.start.toDate(), event.end.toDate())}
									</p>
								{/if}
							{/if}
						</div>
					{/each}

					{#if toCalendarDate(current).compare(day) === 0}
						<div
							class="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-destructive"
							style:top={percent(nowMinutes)}
						>
							<span class="absolute -top-1 -left-1 size-2.5 rounded-full bg-destructive"></span>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>
