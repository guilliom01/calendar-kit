<script lang="ts">
	import {
		getLocalTimeZone,
		isSameMonth,
		isToday,
		today,
		type CalendarDate
	} from '@internationalized/date';
	import { monthGrid, type DayOfWeek } from '@calendar-kit/core';
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils.js';

	interface Props {
		/** Any date inside the month to show. Defaults to today. */
		month?: CalendarDate;
		locale?: string;
		firstDayOfWeek?: DayOfWeek;
		class?: string;
		/** Custom content for each day cell. */
		day?: Snippet<[CalendarDate]>;
	}

	const timeZone = getLocalTimeZone();

	let {
		month = today(timeZone),
		locale = 'en-US',
		firstDayOfWeek,
		class: className,
		day
	}: Props = $props();

	const weeks = $derived(monthGrid(month, { locale, firstDayOfWeek }));
	const weekday = $derived(new Intl.DateTimeFormat(locale, { weekday: 'short' }));
	const title = $derived(
		new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
			month.toDate(timeZone)
		)
	);
</script>

<table class={cn('w-full table-fixed border-collapse text-sm', className)} aria-label={title}>
	<thead>
		<tr>
			{#each weeks[0] ?? [] as date (date.toString())}
				<th scope="col" class="py-2 font-medium text-neutral-500 capitalize">
					{weekday.format(date.toDate(timeZone))}
				</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each weeks as week (week[0]?.toString())}
			<tr>
				{#each week as date (date.toString())}
					<td
						class={cn(
							'h-24 border border-neutral-200 p-1 align-top',
							!isSameMonth(date, month) && 'text-neutral-400'
						)}
					>
						<span
							class={cn(
								'inline-flex size-6 items-center justify-center rounded-full',
								isToday(date, timeZone) && 'bg-neutral-900 text-white'
							)}
						>
							{date.day}
						</span>
						{@render day?.(date)}
					</td>
				{/each}
			</tr>
		{/each}
	</tbody>
</table>
