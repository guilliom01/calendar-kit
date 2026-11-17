<script lang="ts">
	import { resolve } from '$app/paths';
	import Code from '#lib/docs/code.svelte';
	import PropsTable from '#lib/docs/props-table.svelte';

	const full = `<Calendar.Root state={calendar}>
	<Calendar.Toolbar>
		<Calendar.NewEvent />
		<Calendar.Nav />
		<Calendar.Title />
		<Calendar.Loading />
		<Calendar.TimeZoneSelect />
		<Calendar.UndoRedo />
		<Calendar.ViewSwitcher />
	</Calendar.Toolbar>

	<Calendar.View name="month"><MonthView /></Calendar.View>
	<Calendar.View name="week"><TimeGrid /></Calendar.View>
	<Calendar.View name="day"><TimeGrid /></Calendar.View>
	<Calendar.View name="agenda"><AgendaView /></Calendar.View>
	<Calendar.View name="year"><YearView /></Calendar.View>
	<Calendar.View name="timeline"><TimelineView {resources} /></Calendar.View>
	<Calendar.View name="resources"><TimeGrid {resources} /></Calendar.View>
	<Calendar.View name="gantt"><GanttView /></Calendar.View>

	<EventDialog {resources} />
	<RecurrenceScopeDialog />
</Calendar.Root>`;

	const customView = `<Calendar.View
	name="3days"
	label="3 days"
	unit="days"
	range={(date) => ({ start: date, end: date.add({ days: 3 }) })}
>
	<MyThreeDayView />
</Calendar.View>`;

	const eventContent = `<MonthView>
	{#snippet eventContent(event)}
		<strong>{event.title}</strong> · {event.data.room}
	{/snippet}
</MonthView>`;

	const recurrence = `<EventDialog>
	{#snippet recurrence({ value, setValue, start })}
		<RecurrenceEditor {value} onchange={setValue} {start} />
	{/snippet}
</EventDialog>`;

	const classOnly = [
		{ name: 'class', type: 'string', description: 'Extra classes for the root element.' }
	];
	const eventContentRow = {
		name: 'eventContent',
		type: 'Snippet<[CalendarEvent]>',
		description: 'Replaces what is drawn inside each event.'
	};
</script>

<svelte:head><title>Blocks · calendar-kit docs</title></svelte:head>

<h1>Blocks</h1>
<p>
	Every block is an item of the registry. Add it with <code
		>npx shadcn-svelte add &lt;registry-url&gt;/r/&lt;item&gt;.json</code
	>; its dependencies (other items, npm packages) come along. <code>calendar-state</code> is installed
	by every block.
</p>
<p>A calendar with every block looks like this. Keep only the lines you need:</p>
<Code code={full} />

<h2>calendar</h2>
<p>
	The parts every calendar uses. <code>Calendar.Root</code> shares the state with everything inside it;
	the rest are optional.
</p>
<PropsTable
	caption="Calendar parts"
	rows={[
		{
			name: 'Root',
			type: 'state, class, shortcuts = true',
			description:
				'Provides the state. With shortcuts, Ctrl/Cmd+Z undoes and Ctrl/Cmd+Shift+Z or Ctrl+Y redoes. Loads ranges when the state has loadEvents.'
		},
		{
			name: 'View',
			type: 'name, label?, range?, unit?',
			description:
				'Shows its children when this view is selected, and registers it for the ViewSwitcher. Built-in names know their range; custom names pass range and unit.'
		},
		{ name: 'Toolbar', type: 'class', description: 'A flex row for the parts below.' },
		{
			name: 'Nav',
			type: 'class, today = true',
			description: 'Today, previous and next. Labels come from Intl ("today", "next week").'
		},
		{ name: 'Title', type: 'class', description: 'The visible period, e.g. "noviembre de 2026".' },
		{
			name: 'ViewSwitcher',
			type: 'class',
			description: 'One button per registered view. Hidden when there is only one.'
		},
		{
			name: 'NewEvent',
			type: 'class',
			description:
				'Picks a one-hour slot (next full hour today, 9:00 otherwise) and calls select().'
		},
		{ name: 'UndoRedo', type: 'class', description: 'Undo and redo buttons.' },
		{
			name: 'TimeZoneSelect',
			type: 'class, zones?',
			description: 'Changes state.timeZone. Lists every IANA zone unless zones is given.'
		},
		{ name: 'Loading', type: 'class', description: 'A spinner while state.loading is true.' }
	]}
/>
<h3>Custom views</h3>
<Code code={customView} />

<h2>month-view</h2>
<p>
	A month grid. Multi-day events are bars. When a day is full, the rest collapse into "+N", which
	opens a popover listing every event of that day (or runs your <code>onMoreClick</code> hook instead).
</p>
<PropsTable
	caption="MonthView props"
	rows={[
		...classOnly,
		{ name: 'maxLanes', type: 'number = 3', description: 'Event rows per week before "+N".' },
		eventContentRow
	]}
/>
<Code code={eventContent} label="Custom event content (every view accepts it)" />

<h2>time-grid</h2>
<p>
	Week and day views with hours, an all-day row, overlapping events side by side and a "now" line.
	Drag to move, drag the bottom edge to resize, drag over empty time to create.
</p>
<PropsTable
	caption="TimeGrid props"
	rows={[
		{
			name: 'resources',
			type: 'Resource[]',
			description:
				'One column per resource (without children) for the shown day, instead of one per day.'
		},
		...classOnly,
		{ name: 'hourHeight', type: "string = '3rem'", description: 'Height of one hour.' },
		{
			name: 'scrollToHour',
			type: 'number = 7',
			description: 'Hour shown at the top when it opens.'
		},
		eventContentRow
	]}
/>

<h2>agenda-view</h2>
<PropsTable
	caption="AgendaView props"
	rows={[
		...classOnly,
		{ name: 'resources', type: 'Resource[]', description: 'Names shown next to each event.' },
		eventContentRow
	]}
/>

<h2>year-view</h2>
<p>Twelve small months. Busier days get a stronger tint; clicking a day calls onDateClick.</p>
<PropsTable caption="YearView props" rows={classOnly} />

<h2>timeline-view</h2>
<p>
	Resources as rows and the week's days as columns. Use <code>parentId</code> to group resources; groups
	collapse. Dragging an event to another row moves it to that resource.
</p>
<PropsTable
	caption="TimelineView props"
	rows={[
		{
			name: 'resources',
			type: 'Resource[]',
			description: 'Required. { id, title, color?, parentId? }'
		},
		...classOnly,
		eventContentRow
	]}
/>

<h2>gantt-view</h2>
<p>One row per task across the month, with a progress bar and arrows for dependencies.</p>
<PropsTable
	caption="GanttView props"
	rows={[
		...classOnly,
		{
			name: 'filter',
			type: '(event) => boolean',
			description: 'Which events are tasks. Default: events with progress or dependsOn.'
		},
		eventContentRow
	]}
/>

<h2>event-dialog</h2>
<p>
	<code>EventDialog</code> creates, edits and deletes events (title, all-day, dates, repeat,
	resources, progress, color). <code>RecurrenceScopeDialog</code> asks whether a change to a recurring
	event applies to one, the following, or all occurrences. Without them, nothing opens: use the hooks
	to show your own UI.
</p>
<PropsTable
	caption="EventDialog props"
	rows={[
		{
			name: 'colors',
			type: '(string | undefined)[]',
			description: 'Colors offered; undefined is the theme color.'
		},
		{
			name: 'resources',
			type: 'Resource[]',
			description: 'Resources the event can be assigned to. Hidden when empty.'
		},
		{
			name: 'recurrence',
			type: 'Snippet<[{ value, setValue, start }]>',
			description: 'Replaces the "Repeat" select.'
		}
	]}
/>

<h2>recurrence-editor</h2>
<p>
	A repeat-rule editor: every N days, weeks, months or years; several weekdays; the day of the month
	or the nth weekday. Use it in the dialog or in your own form.
</p>
<Code code={recurrence} />
<PropsTable
	caption="RecurrenceEditor props"
	rows={[
		{
			name: 'value',
			type: 'string',
			description: "RRULE without COUNT/UNTIL; '' means no repeat."
		},
		{ name: 'onchange', type: '(value: string) => void', description: 'Called with the new rule.' },
		{
			name: 'start',
			type: 'CalendarDate',
			description: 'First date; defaults (weekday, day of month) come from it.'
		},
		...classOnly
	]}
/>

<h2>import-export</h2>
<p>
	<code>ExportIcs</code>, <code>ImportIcs</code>, <code>ExportCsv</code> and <code>Print</code>
	buttons. See <a href={resolve('/docs/import-export')}>Import and export</a>.
</p>
