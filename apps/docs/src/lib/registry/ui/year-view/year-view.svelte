<script lang="ts">
	import { DateFormatter, isSameMonth, isToday, type CalendarDate } from '@internationalized/date';
	import { countByDay, monthGrid } from '@calendar-kit/core';
	import { getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	let { class: className }: { class?: string } = $props();

	const calendar = getCalendar();

	const months = $derived(
		Array.from({ length: 12 }, (_, index) => {
			const month = calendar.date.set({ month: index + 1, day: 1 });
			return { month, weeks: monthGrid(month, calendar.weekOptions) };
		})
	);
	const counts = $derived(countByDay(calendar.visibleEvents, calendar.range, calendar.timeZone));

	const formatter = (options: Intl.DateTimeFormatOptions) =>
		new DateFormatter(calendar.locale, { ...options, timeZone: calendar.timeZone });
	const monthName = $derived(formatter({ month: 'long' }));
	const weekday = $derived(formatter({ weekday: 'narrow' }));
	const fullDate = $derived(formatter({ dateStyle: 'full' }));
	const toDate = (day: CalendarDate) => day.toDate(calendar.timeZone);

	function openMonth(month: CalendarDate) {
		calendar.date = month;
		calendar.view = 'month';
	}

	/** Busier days get a stronger tint. */
	const tint = (count: number) =>
		count >= 4
			? 'bg-primary/40'
			: count >= 2
				? 'bg-primary/25'
				: count === 1
					? 'bg-primary/10'
					: '';
</script>

<div
	class={cn(
		'grid min-h-0 grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] content-start gap-6 overflow-y-auto rounded-lg border p-4',
		className
	)}
>
	{#each months as { month, weeks } (month.toString())}
		<section aria-label={monthName.format(toDate(month))}>
			<h3>
				<button
					type="button"
					class="mb-2 rounded px-1 text-sm font-semibold capitalize hover:bg-muted"
					onclick={() => openMonth(month)}
				>
					{monthName.format(toDate(month))}
				</button>
			</h3>
			<div class="grid grid-cols-7 text-center text-xs">
				{#each weeks[0] ?? [] as day (day.toString())}
					<span class="py-1 text-muted-foreground uppercase" aria-hidden="true">
						{weekday.format(toDate(day))}
					</span>
				{/each}
				{#each weeks.flat() as day (day.toString())}
					{#if isSameMonth(day, month)}
						{@const count = counts.get(day.toString()) ?? 0}
						<button
							type="button"
							class={cn(
								'mx-auto inline-flex size-8 items-center justify-center rounded-full hover:ring-1 hover:ring-ring',
								tint(count),
								isToday(day, calendar.timeZone) &&
									'bg-primary font-semibold text-primary-foreground'
							)}
							aria-label="{fullDate.format(toDate(day))}{count
								? `, ${count} ${calendar.labels.events}`
								: ''}"
							title={count ? `${count} ${calendar.labels.events}` : undefined}
							onclick={(click) => calendar.clickDate(day, click)}
						>
							{day.day}
						</button>
					{:else}
						<span></span>
					{/if}
				{/each}
			</div>
		</section>
	{/each}
</div>
