<script lang="ts">
	import type { CalendarEvent } from '@calendar-kit/core';
	import type { Snippet } from 'svelte';
	import { MonthView } from '#lib/registry/ui/month-view/index.js';
	import { TimeGrid } from '#lib/registry/ui/time-grid/index.js';
	import { setCalendar, type CalendarState } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';
	import CalendarToolbar from './calendar-toolbar.svelte';

	interface Props {
		/** Create it with `new CalendarState({ events, locale, timeZone })`. */
		state: CalendarState;
		class?: string;
		/** Replaces the default toolbar. */
		toolbar?: Snippet;
		/** Text next to the all-day row in week and day views. */
		allDayLabel?: string;
		/** Custom content inside each event, in every view. */
		eventContent?: Snippet<[CalendarEvent]>;
	}

	let { state, class: className, toolbar, allDayLabel, eventContent }: Props = $props();

	// svelte-ignore state_referenced_locally
	setCalendar(state);
</script>

<div class={cn('flex h-full min-h-0 flex-col gap-3', className)}>
	{#if toolbar}
		{@render toolbar()}
	{:else}
		<CalendarToolbar />
	{/if}

	{#if state.view === 'month'}
		<MonthView class="flex-1" {eventContent} />
	{:else}
		<TimeGrid class="flex-1" {allDayLabel} {eventContent} />
	{/if}
</div>
