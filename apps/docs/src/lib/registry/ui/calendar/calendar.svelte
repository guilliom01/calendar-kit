<script lang="ts">
	import type { CalendarEvent } from '@calendar-kit/core';
	import type { Snippet } from 'svelte';
	import { EventDialog, RecurrenceScopeDialog } from '#lib/registry/ui/event-dialog/index.js';
	import { AgendaView } from '#lib/registry/ui/agenda-view/index.js';
	import { GanttView } from '#lib/registry/ui/gantt-view/index.js';
	import { MonthView } from '#lib/registry/ui/month-view/index.js';
	import { TimeGrid } from '#lib/registry/ui/time-grid/index.js';
	import { TimelineView } from '#lib/registry/ui/timeline-view/index.js';
	import { YearView } from '#lib/registry/ui/year-view/index.js';
	import { setCalendar, type CalendarState } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';
	import CalendarToolbar from './calendar-toolbar.svelte';

	interface Props {
		/** Create it with `new CalendarState({ events, locale, timeZone, onMutate })`. */
		state: CalendarState;
		class?: string;
		/** Replaces the default toolbar. */
		toolbar?: Snippet;
		/** Custom content inside each event, in every view. */
		eventContent?: Snippet<[CalendarEvent]>;
	}

	let { state, class: className, toolbar, eventContent }: Props = $props();

	// svelte-ignore state_referenced_locally
	setCalendar(state);

	// Loads the visible range when `loadEvents` is set (cached per month).
	$effect(() => {
		void state.ensureLoaded(state.range);
	});

	/** Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z or Ctrl+Y redoes, unless the user is typing. */
	function onKeydown(event: KeyboardEvent) {
		const target = event.target as HTMLElement | null;
		const typing = target?.closest('input, textarea, select, [contenteditable]');
		if (!state.editable || typing || state.draft || !(event.ctrlKey || event.metaKey)) return;

		const key = event.key.toLowerCase();
		if (key === 'z' && !event.shiftKey) {
			event.preventDefault();
			void state.undo();
		} else if ((key === 'z' && event.shiftKey) || key === 'y') {
			event.preventDefault();
			void state.redo();
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class={cn('flex h-full min-h-0 flex-col gap-3', className)}>
	{#if toolbar}
		{@render toolbar()}
	{:else}
		<CalendarToolbar />
	{/if}

	{#if state.view === 'month'}
		<MonthView class="flex-1" {eventContent} />
	{:else if state.view === 'year'}
		<YearView class="flex-1" />
	{:else if state.view === 'agenda'}
		<AgendaView class="flex-1" {eventContent} />
	{:else if state.view === 'timeline'}
		<TimelineView class="flex-1" {eventContent} />
	{:else if state.view === 'gantt'}
		<GanttView class="flex-1" {eventContent} />
	{:else}
		<TimeGrid class="flex-1" {eventContent} />
	{/if}

	<EventDialog />
	<RecurrenceScopeDialog />
</div>
