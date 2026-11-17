<script lang="ts">
	import { toZoned, type CalendarDate } from '@internationalized/date';
	import type { CalendarEvent, DateRange } from '@calendar-kit/core';
	import * as Calendar from '#lib/registry/ui/calendar/index.js';
	import { CalendarState } from '#lib/registry/ui/calendar/index.js';
	import { MonthView } from '#lib/registry/ui/month-view/index.js';

	const timeZone = 'America/Lima';
	let requests: string[] = $state([]);

	/** Simulates a backend: one event per week of the requested month, after a short delay. */
	async function loadEvents({ start }: DateRange): Promise<CalendarEvent[]> {
		requests.push(start.toString().slice(0, 7));
		await new Promise((resolve) => setTimeout(resolve, 400));
		const events: CalendarEvent[] = [];
		for (let day: CalendarDate = start; day.month === start.month; day = day.add({ weeks: 1 })) {
			const at = toZoned(day, timeZone).set({ hour: 10 });
			events.push({
				id: `remote-${day}`,
				title: `Evento remoto ${day.day}/${day.month}`,
				start: at,
				end: at.add({ hours: 1 })
			});
		}
		return events;
	}

	const calendar = new CalendarState({
		locale: 'es-PE',
		timeZone,
		loadEvents,
		labels: { loading: 'Cargando…' }
	});
</script>

<main class="mx-auto flex h-dvh max-w-6xl flex-col gap-4 p-4">
	<h1 class="text-2xl font-semibold">Carga por rango</h1>
	<p class="text-sm text-muted-foreground" data-testid="requests">
		Meses pedidos: {requests.join(', ')}
	</p>
	<Calendar.Root state={calendar} class="flex-1">
		<Calendar.Toolbar>
			<Calendar.Nav />
			<Calendar.Title />
			<Calendar.Loading />
		</Calendar.Toolbar>
		<Calendar.View name="month"><MonthView class="flex-1" /></Calendar.View>
	</Calendar.Root>
</main>
