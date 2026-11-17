<script lang="ts">
	import { today } from '@internationalized/date';
	import { Calendar, CalendarState } from '#lib/registry/ui/calendar/index.js';
	import { demoEvents } from './demo-events.js';

	const locale = 'es-PE';
	const timeZone = 'America/Lima';

	const calendar = new CalendarState({
		locale,
		timeZone,
		events: demoEvents(today(timeZone), locale, timeZone)
	});
</script>

<main class="mx-auto flex h-dvh max-w-6xl flex-col gap-4 p-4">
	<h1 class="text-2xl font-semibold">calendar-kit</h1>
	<Calendar state={calendar} class="flex-1" allDayLabel="todo el día" />
</main>
