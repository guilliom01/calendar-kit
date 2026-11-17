<script lang="ts">
	import { getDayOfWeek, today } from '@internationalized/date';
	import * as Calendar from '#lib/registry/ui/calendar/index.js';
	import { CalendarState } from '#lib/registry/ui/calendar/index.js';
	import { MonthView } from '#lib/registry/ui/month-view/index.js';
	import { demoEvents } from '../demo-events.js';

	const timeZone = 'America/Lima';
	let message = $state('');

	// Our own rules on top of the built-in behavior.
	const calendar = new CalendarState({
		locale: 'es-PE',
		timeZone,
		events: demoEvents(today(timeZone), 'es-PE', timeZone).filter(
			(event) => event.progress === undefined
		),
		// Holidays are fixed.
		isEditable: (event) => event.id !== 'holiday',
		// Nothing can be moved to a Sunday.
		onEventChange: ({ event }) => {
			const day = 'hour' in event.start ? event.start : event.start;
			if (getDayOfWeek(day, 'en-US', 'sun') === 0) {
				message = 'No se permiten eventos en domingo';
				return false;
			}
			message = `Movido: ${event.title}`;
		},
		// Show the picked day instead of opening a dialog.
		onSelect: ({ start }) => {
			message = `Selección: ${start.toString()}`;
			return false;
		}
	});
</script>

<main class="mx-auto flex h-full max-w-5xl flex-col gap-4 p-4">
	<h1 class="text-2xl font-semibold">Ganchos de interacción</h1>
	<p class="rounded-lg border p-3 text-sm" aria-live="polite" data-testid="message">
		{message || 'Arrastra un evento o haz clic en un día vacío.'}
	</p>
	<Calendar.Root state={calendar} class="flex-1">
		<Calendar.Toolbar>
			<Calendar.Nav />
			<Calendar.Title />
		</Calendar.Toolbar>
		<Calendar.View name="month"><MonthView class="flex-1" /></Calendar.View>
	</Calendar.Root>
</main>
