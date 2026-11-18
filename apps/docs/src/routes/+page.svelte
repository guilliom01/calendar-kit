<script lang="ts">
	import { today } from '@internationalized/date';
	import * as Calendar from '#lib/registry/ui/calendar/index.js';
	import { CalendarState } from '#lib/registry/ui/calendar/index.js';
	import { AgendaView } from '#lib/registry/ui/agenda-view/index.js';
	import { CalendarList } from '#lib/registry/ui/calendar-list/index.js';
	import { CalendarSearch } from '#lib/registry/ui/calendar-search/index.js';
	import { EventContextMenu } from '#lib/registry/ui/event-context-menu/index.js';
	import { EventPreview } from '#lib/registry/ui/event-preview/index.js';
	import {
		ChangeConfirmDialog,
		EventDialog,
		RecurrenceScopeDialog
	} from '#lib/registry/ui/event-dialog/index.js';
	import { GanttView } from '#lib/registry/ui/gantt-view/index.js';
	import * as Exchange from '#lib/registry/ui/import-export/index.js';
	import { MonthView } from '#lib/registry/ui/month-view/index.js';
	import { RecurrenceEditor } from '#lib/registry/ui/recurrence-editor/index.js';
	import { TimeGrid } from '#lib/registry/ui/time-grid/index.js';
	import { TimelineView } from '#lib/registry/ui/timeline-view/index.js';
	import { YearView } from '#lib/registry/ui/year-view/index.js';
	import { demoCalendars, demoEvents, demoResources } from './demo-events.js';
	import { spanishLabels } from './demo-labels.js';

	const locale = 'es-PE';
	const timeZone = 'America/Lima';

	let importWarnings: string[] = $state([]);

	const calendar = new CalendarState({
		locale,
		timeZone,
		events: demoEvents(today(timeZone), locale, timeZone),
		calendars: demoCalendars,
		// Simulates a backend call: changes show at once and "save" a moment later.
		onMutate: () => new Promise((resolve) => setTimeout(resolve, 300)),
		labels: spanishLabels
	});
</script>

<svelte:head><title>Calendario completo · calendar-kit</title></svelte:head>

<main class="mx-auto flex h-full max-w-6xl flex-col gap-4 p-4">
	<h1 class="text-2xl font-semibold">Calendario completo</h1>

	<!-- Every block composed together. Each one is optional: keep only what you need. -->
	<Calendar.Root state={calendar} class="flex-1">
		<Calendar.Toolbar>
			<Calendar.NewEvent />
			<Calendar.Nav />
			<Calendar.Title />
			<Calendar.Loading />
			<CalendarSearch class="w-48" />
			<div class="ms-auto flex flex-wrap items-center gap-2">
				<Exchange.ImportIcs onImport={({ warnings }) => (importWarnings = warnings)} />
				<Exchange.ExportIcs filename="calendario.ics" name="calendar-kit" />
				<Exchange.ExportCsv filename="calendario.csv" />
				<Exchange.Print />
				<Calendar.TimeZoneSelect />
				<Calendar.UndoRedo />
				<Calendar.ViewSwitcher />
			</div>
		</Calendar.Toolbar>
		{#if importWarnings.length}
			<ul class="rounded-lg border p-3 text-sm text-muted-foreground" data-testid="import-warnings">
				{#each importWarnings as warning (warning)}<li>{warning}</li>{/each}
			</ul>
		{/if}

		<div class="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
			<CalendarList class="shrink-0 md:w-36 print:hidden" />
			<EventContextMenu class="min-w-0">
				<EventPreview>
					<Calendar.View name="month"><MonthView class="flex-1" /></Calendar.View>
					<Calendar.View name="week"><TimeGrid class="flex-1" /></Calendar.View>
					<Calendar.View name="day"><TimeGrid class="flex-1" /></Calendar.View>
					<Calendar.View name="agenda"
						><AgendaView class="flex-1" resources={demoResources} /></Calendar.View
					>
					<Calendar.View name="year"><YearView class="flex-1" /></Calendar.View>
					<Calendar.View name="timeline">
						<TimelineView class="flex-1" resources={demoResources} />
					</Calendar.View>
					<Calendar.View name="resources">
						<TimeGrid class="flex-1" resources={demoResources} />
					</Calendar.View>
					<Calendar.View name="gantt"><GanttView class="flex-1" /></Calendar.View>
				</EventPreview>
			</EventContextMenu>
		</div>

		<EventDialog resources={demoResources}>
			{#snippet recurrence({ value, setValue, start })}
				<RecurrenceEditor {value} onchange={setValue} {start} />
			{/snippet}
		</EventDialog>
		<RecurrenceScopeDialog />
		<ChangeConfirmDialog />
	</Calendar.Root>
</main>
