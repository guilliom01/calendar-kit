<script lang="ts">
	import { today } from '@internationalized/date';
	import * as Calendar from '#lib/registry/ui/calendar/index.js';
	import { CalendarState } from '#lib/registry/ui/calendar/index.js';
	import { MonthView } from '#lib/registry/ui/month-view/index.js';
	import type { CalendarEvent } from '@calendar-kit/core';
	import { demoEvents } from '../demo-events.js';

	const timeZone = 'America/Lima';
	let selected: CalendarEvent | null = $state(null);
	let picked = $state('');

	// Only the month view, read-only, and our own reaction to clicks: no dialog, no other views.
	const calendar = new CalendarState({
		locale: 'es-PE',
		timeZone,
		editable: false,
		events: demoEvents(today(timeZone), 'es-PE', timeZone).filter(
			(event) => event.progress === undefined
		),
		onEventClick: (event) => {
			selected = event;
			picked = '';
		},
		onDateClick: (date) => {
			selected = null;
			picked = date.toString();
			return false; // stay in the month view
		}
	});
</script>

<svelte:head><title>Solo vista de mes · calendar-kit</title></svelte:head>

<main class="mx-auto flex h-full max-w-5xl flex-col gap-4 p-4">
	<h1 class="text-2xl font-semibold">Solo vista de mes</h1>

	<Calendar.Root state={calendar} class="flex-1">
		<Calendar.Toolbar>
			<Calendar.Nav />
			<Calendar.Title />
		</Calendar.Toolbar>
		<Calendar.View name="month"><MonthView class="flex-1" /></Calendar.View>
	</Calendar.Root>

	<aside class="rounded-lg border p-3 text-sm" aria-live="polite" data-testid="panel">
		{#if selected}
			Evento elegido: <strong>{selected.title}</strong>
		{:else if picked}
			Día elegido: <strong>{picked}</strong>
		{:else}
			Haz clic en un evento o en un número de día.
		{/if}
	</aside>
</main>
