<script lang="ts">
	import { today } from '@internationalized/date';
	import { Calendar, CalendarState } from '#lib/registry/ui/calendar/index.js';
	import { demoEvents } from './demo-events.js';

	const locale = 'es-PE';
	const timeZone = 'America/Lima';

	const calendar = new CalendarState({
		locale,
		timeZone,
		events: demoEvents(today(timeZone), locale, timeZone),
		// Simulates a backend call: changes show at once and "save" a moment later.
		onMutate: () => new Promise((resolve) => setTimeout(resolve, 300)),
		labels: {
			allDay: 'Todo el día',
			untitled: '(Sin título)',
			newEvent: 'Nuevo evento',
			editEvent: 'Editar evento',
			title: 'Título',
			start: 'Inicio',
			end: 'Fin',
			color: 'Color',
			save: 'Guardar',
			cancel: 'Cancelar',
			delete: 'Eliminar',
			undo: 'Deshacer',
			redo: 'Rehacer',
			timeZone: 'Zona horaria',
			repeat: 'Repetir',
			doesNotRepeat: 'No se repite',
			daily: 'Todos los días',
			weekly: 'Cada semana el {weekday}',
			weekdays: 'Días laborables (de lunes a viernes)',
			monthlyOnDay: 'Cada mes el día {day}',
			monthlyOnWeekday: 'Cada mes el {ordinal} {weekday}',
			yearly: 'Cada año el {date}',
			custom: 'Personalizado ({rule})',
			ordinals: ['primer', 'segundo', 'tercer', 'cuarto', 'quinto'],
			last: 'último',
			ends: 'Termina',
			never: 'Nunca',
			endsOn: 'El',
			endsAfter: 'Después de',
			occurrences: 'repeticiones',
			editRecurring: 'Editar evento recurrente',
			deleteRecurring: 'Eliminar evento recurrente',
			thisEvent: 'Este evento',
			followingEvents: 'Este y los eventos siguientes',
			allEvents: 'Todos los eventos',
			ok: 'Aceptar'
		}
	});
</script>

<main class="mx-auto flex h-dvh max-w-6xl flex-col gap-4 p-4">
	<h1 class="text-2xl font-semibold">calendar-kit</h1>
	<Calendar state={calendar} class="flex-1" />
</main>
