<script lang="ts">
	import { DateFormatter, isSameMonth, isToday, type CalendarDate } from '@internationalized/date';
	import { isAllDay, layoutWeekRow, monthGrid, type CalendarEvent } from '@calendar-kit/core';
	import type { Snippet } from 'svelte';
	import { getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	interface Props {
		class?: string;
		/** Event lanes shown per week before collapsing the rest into "+N". */
		maxLanes?: number;
		/** Custom content inside each event chip. */
		eventContent?: Snippet<[CalendarEvent]>;
	}

	let { class: className, maxLanes = 3, eventContent }: Props = $props();

	const calendar = getCalendar();

	const weeks = $derived(
		monthGrid(calendar.date, calendar.weekOptions).map((days) => ({
			days,
			items: layoutWeekRow(calendar.visibleEvents, days, calendar.timeZone)
		}))
	);
	const weekday = $derived(
		new DateFormatter(calendar.locale, { weekday: 'short', timeZone: calendar.timeZone })
	);
	const time = $derived(
		new DateFormatter(calendar.locale, {
			hour: 'numeric',
			minute: '2-digit',
			timeZone: calendar.timeZone
		})
	);
	const fullDate = $derived(
		new DateFormatter(calendar.locale, { dateStyle: 'full', timeZone: calendar.timeZone })
	);

	function hiddenCount(items: (typeof weeks)[number]['items'], dayIndex: number) {
		return items.filter(
			(item) =>
				item.lane >= maxLanes &&
				item.startIndex <= dayIndex &&
				dayIndex < item.startIndex + item.span
		).length;
	}

	const toDate = (day: CalendarDate) => day.toDate(calendar.timeZone);
</script>

<div class={cn('flex flex-col overflow-hidden rounded-lg border', className)}>
	<div class="grid grid-cols-7 border-b bg-muted/40">
		{#each weeks[0]?.days ?? [] as day (day.toString())}
			<div class="px-2 py-1.5 text-center text-xs font-medium text-muted-foreground capitalize">
				{weekday.format(toDate(day))}
			</div>
		{/each}
	</div>

	{#each weeks as week (week.days[0]?.toString())}
		<div class="relative grid min-h-28 flex-1 grid-cols-7 border-b last:border-b-0">
			{#each week.days as day (day.toString())}
				<div
					class={cn(
						'border-e p-1 last:border-e-0',
						!isSameMonth(day, calendar.date) && 'bg-muted/30 text-muted-foreground'
					)}
				>
					<button
						type="button"
						class={cn(
							'inline-flex size-7 items-center justify-center rounded-full text-xs hover:bg-muted',
							isToday(day, calendar.timeZone) &&
								'bg-primary text-primary-foreground hover:bg-primary/90'
						)}
						aria-label={fullDate.format(toDate(day))}
						onclick={() => calendar.openDay(day)}
					>
						{day.day}
					</button>
				</div>
			{/each}

			<div
				class="pointer-events-none absolute inset-x-0 top-9 grid auto-rows-[1.375rem] grid-cols-7 gap-y-0.5 px-0.5"
			>
				{#each week.items.filter((item) => item.lane < maxLanes) as item (item.event.id)}
					{@const event = item.event}
					{@const bar = isAllDay(event) || item.span > 1}
					<div
						class={cn(
							'pointer-events-auto mx-0.5 flex min-w-0 items-center gap-1 rounded px-1.5 text-xs',
							bar
								? 'bg-(--event-color)/15 font-medium text-foreground'
								: 'text-foreground hover:bg-muted',
							item.continuesBefore && 'ms-0 rounded-s-none',
							item.continuesAfter && 'me-0 rounded-e-none'
						)}
						style:grid-column="{item.startIndex + 1} / span {item.span}"
						style:grid-row={item.lane + 1}
						style:--event-color={event.color ?? 'var(--primary)'}
						title={event.title}
					>
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
							<span class="truncate">{event.title}</span>
						{/if}
					</div>
				{/each}

				{#each week.days as day, dayIndex (day.toString())}
					{@const hidden = hiddenCount(week.items, dayIndex)}
					{#if hidden > 0}
						<button
							type="button"
							class="pointer-events-auto mx-0.5 rounded px-1.5 text-start text-xs font-medium text-muted-foreground hover:bg-muted"
							style:grid-column={dayIndex + 1}
							style:grid-row={maxLanes + 1}
							onclick={() => calendar.openDay(day)}
						>
							+{hidden}
						</button>
					{/if}
				{/each}
			</div>
		</div>
	{/each}
</div>
