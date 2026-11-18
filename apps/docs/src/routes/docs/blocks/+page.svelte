<script lang="ts">
	import { resolve } from '$app/paths';
	import Code from '#lib/docs/code.svelte';
	import PropsTable from '#lib/docs/props-table.svelte';

	const full = `<FullCalendar.Root state={calendar}>
	<FullCalendar.Toolbar>
		<FullCalendar.NewEvent />
		<FullCalendar.Nav />
		<FullCalendar.Title />
		<FullCalendar.Loading />
		<FullCalendar.TimeZoneSelect />
		<FullCalendar.UndoRedo />
		<FullCalendar.ViewSwitcher />
	</FullCalendar.Toolbar>

	<FullCalendar.View name="month"><MonthView /></FullCalendar.View>
	<FullCalendar.View name="week"><TimeGrid /></FullCalendar.View>
	<FullCalendar.View name="day"><TimeGrid /></FullCalendar.View>
	<FullCalendar.View name="agenda"><AgendaView /></FullCalendar.View>
	<FullCalendar.View name="year"><YearView /></FullCalendar.View>
	<FullCalendar.View name="timeline"><TimelineView {resources} /></FullCalendar.View>
	<FullCalendar.View name="resources"><TimeGrid {resources} /></FullCalendar.View>
	<FullCalendar.View name="gantt"><GanttView /></FullCalendar.View>

	<EventDialog {resources} />
	<RecurrenceScopeDialog />
	<ChangeConfirmDialog />
</FullCalendar.Root>`;

	const customView = `<FullCalendar.View
	name="3days"
	label="3 days"
	unit="days"
	range={(date) => ({ start: date, end: date.add({ days: 3 }) })}
>
	<MyThreeDayView />
</FullCalendar.View>`;

	const eventContent = `<MonthView>
	{#snippet eventContent(event)}
		<strong>{event.title}</strong> · {event.data.room}
	{/snippet}
</MonthView>`;

	const eventSnippet = `<MonthView>
	<!-- props carries the handlers, ARIA, data-event-id, class and style. Keep a focusable element. -->
	{#snippet event({ event, props, dragging })}
		<button {...props} class={cn(props.class, 'rounded-full', dragging && 'ring-2')}>
			{event.title}
		</button>
	{/snippet}
	{#snippet dayCell({ day, events })}
		{#if events.some((event) => event.data?.kind === 'holiday')}<HolidayIcon />{/if}
	{/snippet}
	{#snippet more({ count, props })}
		<button {...props}>See {count} more</button>
	{/snippet}
</MonthView>`;

	const contextMenu = `<EventContextMenu>
	<!-- Our own item next to Open, Duplicate, Move to calendar and Delete. -->
	{#snippet extra({ event, actions })}
		<ContextMenu.Item onSelect={() => share(event)}>Share</ContextMenu.Item>
	{/snippet}
	<FullCalendar.View name="month"><MonthView /></FullCalendar.View>
</EventContextMenu>`;

	const external = `<script lang="ts">
	import { draggable } from '$lib/calendar-drag.js';
${'</' + 'script>'}

<ul>
	{#each tasks as task (task.id)}
		<li {@attach draggable(calendar, { title: task.title, duration: 30, data: task })}>
			{task.title}
		</li>
	{/each}
</ul>`;

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
		description: 'Replaces what is drawn inside each event; the element itself stays.'
	};
	const eventRow = (args: string) => ({
		name: 'event',
		type: `Snippet<[{ event, props, resizeProps, dragging${args} }]>`,
		description:
			'Replaces the whole event element. Spread props on yours to keep clicks, dragging, keyboard and ARIA; render resizeProps.start and .end inside it to keep resizing.'
	});
	const dayHeaderRow = {
		name: 'dayHeader',
		type: 'Snippet<[{ day, isToday, props }]>',
		description: 'Replaces the day header button. Spread props to keep opening the day.'
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

<h2>full-calendar</h2>
<p>
	The parts every calendar uses. <code>FullCalendar.Root</code> shares the state with everything inside
	it; the rest are optional.
</p>
<PropsTable
	caption="FullCalendar parts"
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
			type: "class, variant = 'auto'",
			description:
				"One button per registered view, or a select ('select'); 'auto' uses a select while the calendar is narrower than 42rem. Hidden when there is only one view."
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

<h2>Customizing what views draw</h2>
<p>
	Views take snippets for their parts, so you can change markup without editing the copied files.
	There are two kinds:
</p>
<ul>
	<li>
		<strong>Interactive parts</strong> (events, day buttons, "+N") receive <code>props</code>: the
		handlers, ARIA attributes, <code>data-event-id</code>, class and style the default element uses.
		Spread them on your own element (like bits-ui's <code>child</code>) and it keeps working: click
		hooks, dragging, keyboard move mode and screen reader labels. Keep it focusable, e.g. a
		<code>&lt;button&gt;</code>.
	</li>
	<li>
		<strong>Display parts</strong> (day cell, resource label, hour label, now line) receive data only.
	</li>
</ul>
<p>
	<code>eventContent</code> is the shortcut when only the inside of the event should change. For anything
	the snippets do not cover, edit the copied component: it is your code.
</p>
<Code code={eventSnippet} label="Our own event chip, day mark and '+N' button" />

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
		{
			name: 'compact',
			type: "boolean | 'auto' = 'auto'",
			description:
				"Phone layout: dots per day and the tapped day's events below. 'auto' uses it while the view is narrower than 40rem."
		},
		eventContentRow,
		eventRow(''),
		{
			name: 'dayNumber',
			type: 'Snippet<[{ day, isToday, inMonth, props }]>',
			description: 'Replaces the day number button.'
		},
		{
			name: 'dayCell',
			type: 'Snippet<[{ day, isToday, inMonth, events }]>',
			description: 'Extra content in each day cell, under the day number.'
		},
		{
			name: 'more',
			type: 'Snippet<[{ day, count, events, props }]>',
			description: 'Replaces the "+N" button. Spread props to keep opening the list.'
		}
	]}
/>
<Code code={eventContent} label="Custom event content (every view accepts it)" />

<h2>time-grid</h2>
<p>
	Week and day views with hours, an all-day row, overlapping events side by side and a "now" line.
	Drag to move, drag the top or bottom edge to resize, drag over empty time to create. Dragging an
	event between the all-day row and the hours converts it (all-day events get <code
		>defaultDuration</code
	>).
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
		eventContentRow,
		{
			...eventRow(', allDay'),
			description: 'Replaces timed blocks and all-day bars; allDay tells which one it is.'
		},
		dayHeaderRow,
		{
			name: 'resourceLabel',
			type: 'Snippet<[{ resource }]>',
			description: 'Content of a resource column header.'
		},
		{
			name: 'hourLabel',
			type: 'Snippet<[{ hour, label }]>',
			description: 'Text next to each hour line.'
		},
		{
			name: 'nowIndicator',
			type: 'Snippet<[{ time }]>',
			description: 'Replaces the "now" line; it is already placed.'
		}
	]}
/>

<h2>agenda-view</h2>
<PropsTable
	caption="AgendaView props"
	rows={[
		...classOnly,
		{ name: 'resources', type: 'Resource[]', description: 'Names shown next to each event.' },
		eventContentRow,
		{
			name: 'event',
			type: 'Snippet<[{ event, props, when, resources }]>',
			description: 'Replaces a whole event row; when and resources are the formatted texts.'
		},
		dayHeaderRow
	]}
/>

<h2>year-view</h2>
<p>Twelve small months. Busier days get a stronger tint; clicking a day calls onDateClick.</p>
<PropsTable
	caption="YearView props"
	rows={[
		...classOnly,
		{
			name: 'dayNumber',
			type: 'Snippet<[{ day, count, isToday, props }]>',
			description: 'Replaces each day button; count is its number of events.'
		}
	]}
/>

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
		eventContentRow,
		eventRow(''),
		dayHeaderRow,
		{
			name: 'resourceLabel',
			type: 'Snippet<[{ resource, title, depth, hasChildren, collapsed, toggle }]>',
			description: 'Content of a row label. resource is null for the unassigned row.'
		}
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
		eventContentRow,
		eventRow(''),
		dayHeaderRow,
		{
			name: 'taskLabel',
			type: 'Snippet<[{ event, progress }]>',
			description: 'Content of a task label; progress is the formatted percentage.'
		}
	]}
/>

<h2>Dragging your own items in</h2>
<p>
	<code>draggable(calendar, item)</code> (from <code>calendar-drag</code>, installed with the state)
	makes any element draggable onto the views. Dropped on the hours it becomes a timed event lasting
	<code>item.duration</code> minutes (or <code>defaultDuration</code>); on a day, an all-day event;
	on a resource row or column, it gets that resource. <code>onExternalDrop</code> decides what is created.
	Dragging has no keyboard path, so offer another way too (a "Schedule" button).
</p>
<Code code={external} />

<h2>mini-calendar</h2>
<p>
	A small month to jump to any date: its arrows browse months, a click moves the calendar to that
	day (keeping the view), days with events get a dot and the visible range is shaded. Arrow keys
	move between days, Page Up and Page Down between months, Enter opens the focused day.
</p>
<PropsTable caption="MiniCalendar props" rows={classOnly} />

<h2>calendar-search</h2>
<p>
	A search box bound to the state's <code>query</code>: every view shows only the events whose title
	has every word typed, ignoring accents and case ("ingles" finds "Clase de inglés"). It searches
	what is loaded in the visible range.
</p>
<PropsTable
	caption="CalendarSearch props"
	rows={[
		...classOnly,
		{ name: 'placeholder', type: 'string', description: 'Default: labels.search.' }
	]}
/>

<h2>calendar-list</h2>
<p>
	One checkbox per calendar in the state's <code>calendars</code>, in its color, to show or hide its
	events. Events belong to a calendar through <code>calendarId</code> and take its color when they
	have none. The event dialog shows a calendar select when <code>calendars</code> is set.
</p>
<PropsTable
	caption="CalendarList props"
	rows={[
		...classOnly,
		{ name: 'title', type: 'string', description: 'Heading. Default: labels.calendars.' }
	]}
/>

<h2>event-context-menu</h2>
<p>
	Wrap the views to get a menu on events with a right-click, Shift+F10 or the menu key: Open,
	Duplicate, Move to calendar (with <code>calendars</code>) and Delete. Actions the user may not do
	(<code>isEditable(event, action)</code>) are left out. Your <code>onEventContextMenu</code> hook
	runs first; returning <code>false</code> keeps this menu closed.
</p>
<PropsTable
	caption="EventContextMenu props"
	rows={[
		...classOnly,
		{ name: 'children', type: 'Snippet', description: 'The views.' },
		{
			name: 'menu',
			type: 'Snippet<[{ event, actions }]>',
			description:
				'Replaces the whole menu content. actions has open, and duplicate, remove and moveTo(calendarId) when allowed.'
		},
		{
			name: 'extra',
			type: 'Snippet<[{ event, actions }]>',
			description: 'Items added after the built-in ones, before Delete.'
		}
	]}
/>
<Code code={contextMenu} />

<h2>event-preview</h2>
<p>
	Wrap the views to show a card with an event's title, dates and calendar when the pointer rests on
	it (<code>delay</code>, 500 ms) or it gets keyboard focus. The card is the event's description (<code
		>aria-describedby</code
	>), closes with Escape, scrolling or a press, and stays while the pointer is on it. While it is
	mounted, events drop the browser's <code>title</code> tooltip.
</p>
<PropsTable
	caption="EventPreview props"
	rows={[
		...classOnly,
		{ name: 'children', type: 'Snippet', description: 'The views.' },
		{ name: 'content', type: 'Snippet<[{ event }]>', description: "Replaces the card's content." },
		{ name: 'delay', type: 'number = 500', description: 'Hover time before it shows.' }
	]}
/>

<h2>event-dialog</h2>
<p>
	<code>EventDialog</code> creates, edits and deletes events (title, all-day, dates, repeat,
	resources, progress, color). <code>RecurrenceScopeDialog</code> asks whether a change to a
	recurring event applies to one, the following, or all occurrences. Without them, nothing opens:
	use the hooks to show your own UI.

	<code>ChangeConfirmDialog</code> asks before a drag or resize is saved (turn it off with
	<code>confirmChanges: false</code>). Each dialog registers itself when mounted: without
	<code>ChangeConfirmDialog</code>, changes save directly; without
	<code>RecurrenceScopeDialog</code>
	(or <code>resolveScope</code>), changes to a recurring event apply to that occurrence only.
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
