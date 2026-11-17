<script lang="ts">
	import Code from '#lib/docs/code.svelte';
	import PropsTable from '#lib/docs/props-table.svelte';

	const saving = `const calendar = new CalendarState({
	events,
	// Called after the change is already visible. Return the saved event to replace the local
	// one (e.g. with the id your database assigned). Throw to roll the change back.
	onMutate: async (mutation) => {
		const response = await fetch('/api/events', { method: 'POST', body: JSON.stringify(mutation) });
		if (!response.ok) throw new Error('Could not save');
		return response.json();
	},
	onError: (error, mutation) => toast.error('Your change was not saved')
});`;

	const hooks = `const calendar = new CalendarState({
	events,
	// Holidays cannot be changed.
	isEditable: (event) => event.data?.kind !== 'holiday',
	// Show our own panel instead of the event dialog.
	onEventClick: (event) => {
		selected = event;
		return false;
	},
	// Nothing can move to a Sunday; anything else is saved.
	onEventChange: ({ event }) => getDayOfWeek(event.start, 'en-US', 'sun') !== 0,
	// Stay in the month view when a day number is clicked.
	onDateClick: () => false
});`;

	const loading = `const calendar = new CalendarState({
	// Called once per month as the user navigates (with preload months around it).
	loadEvents: async ({ start, end }) => {
		const response = await fetch(\`/api/events?from=\${start}&to=\${end}\`);
		return (await response.json()).map(fromJson);
	},
	onLoadError: (error, range) => console.error(error, range)
});`;
</script>

<svelte:head><title>State and hooks · calendar-kit docs</title></svelte:head>

<h1>State and hooks</h1>
<p>
	<code>new CalendarState(options)</code> holds everything the blocks share: the events, the date and
	view shown, locale and time zone, the undo history, and the dialogs' drafts. It is a Svelte 5 class
	with reactive fields, so you can read and set them from your own components too.
</p>

<h2>Options</h2>
<PropsTable
	caption="CalendarState options"
	rows={[
		{ name: 'events', type: 'CalendarEvent[]', description: 'Initial events.' },
		{ name: 'view', type: 'string', description: "View shown first. Default 'month'." },
		{ name: 'date', type: 'CalendarDate', description: 'Date shown first. Default today.' },
		{
			name: 'locale',
			type: 'string',
			description:
				'BCP 47 locale for every text Intl provides and the first day of the week. Default: the browser locale.'
		},
		{
			name: 'timeZone',
			type: 'string',
			description: 'IANA zone used to show events. Default: the browser zone.'
		},
		{ name: 'firstDayOfWeek', type: "'sun' | 'mon' | …", description: 'Overrides the locale.' },
		{
			name: 'snapStep',
			type: 'number',
			description: 'Minutes drag, resize and create snap to. Default 15.'
		},
		{ name: 'editable', type: 'boolean', description: 'Set to false for a read-only calendar.' },
		{
			name: 'labels',
			type: 'Partial<CalendarLabels>',
			description: 'Texts Intl cannot provide. See defaultLabels.'
		},
		{
			name: 'createId',
			type: '() => string',
			description: 'Ids for events created in the UI. Default crypto.randomUUID().'
		},
		{ name: 'onMutate, onError, historyLimit', type: 'see below', description: 'Saving and undo.' },
		{
			name: 'loadEvents, preload, onLoadError',
			type: 'see below',
			description: 'Loading on demand.'
		}
	]}
/>

<h2>Saving changes</h2>
<p>
	Changes are optimistic: they show at once and then go to <code>onMutate</code> as
	<code>{'{ type: "create" | "update" | "delete", … }'}</code>. Changes to the same event are sent
	in order. If <code>onMutate</code> throws, the change is rolled back (unless a later change
	replaced it) and <code>onError</code> is called. Undo and redo reach <code>onMutate</code> as inverse
	changes, so your backend stays in sync.
</p>
<Code code={saving} />

<h2>Interaction hooks</h2>
<p>
	Each hook runs before the built-in behavior. Return <code>false</code> to skip it.
</p>
<PropsTable
	caption="Interaction hooks"
	rows={[
		{
			name: 'onEventClick(event, nativeEvent)',
			type: 'boolean | void',
			description: 'An event was clicked or activated. Built-in: open the event dialog.'
		},
		{
			name: 'onDateClick(date, nativeEvent)',
			type: 'boolean | void',
			description:
				'A day number or header was clicked. Built-in: show the day view, if one is registered.'
		},
		{
			name: 'onSelect(selection)',
			type: 'boolean | void',
			description:
				'An empty day or time range was picked ({ start, end, allDay, fields }). Built-in: open the new-event dialog.'
		},
		{
			name: 'onEventChange({ event, previous, kind })',
			type: 'boolean | event | void',
			description: 'A drag or resize finished. Return false to cancel, or an event to save instead.'
		},
		{
			name: 'resolveScope(request)',
			type: "'this' | 'following' | 'all' | null",
			description: 'Decides the scope of a change to a recurring event instead of asking.'
		},
		{
			name: 'isEditable(event)',
			type: 'boolean',
			description: 'Per-event permission to change it.'
		}
	]}
/>
<Code code={hooks} />

<h2>Loading on demand</h2>
<p>
	With <code>loadEvents</code>, the calendar asks for whole months as the user navigates. Each month
	is requested once; requests in flight are shared; <code>preload</code> months (default 1) are
	fetched on each side. Loaded events skip the undo history and <code>onMutate</code>. A failed
	month is requested again next time.
</p>
<Code code={loading} />

<h2>Methods and fields</h2>
<ul>
	<li>
		<code>next()</code>, <code>previous()</code>, <code>goToday()</code>,
		<code>openDay(date)</code>: navigation.
	</li>
	<li>
		<code>create(event)</code>, <code>update(event)</code>, <code>remove(id)</code>,
		<code>importEvents(events)</code>, <code>undo()</code>, <code>redo()</code>: changes, all
		optimistic and undoable.
	</li>
	<li>
		<code>select(selection)</code>, <code>clickEvent(event, nativeEvent)</code>,
		<code>clickDate(date, nativeEvent)</code>, <code>changeEvent(change)</code>: what the views
		call; use them from your own views to get the same hooks.
	</li>
	<li>
		<code>events</code>, <code>visibleEvents</code> (with recurring events expanded),
		<code>range</code>, <code>days</code>, <code>title</code>, <code>loading</code>,
		<code>canUndo</code>, <code>canRedo</code>: reactive read-outs.
	</li>
	<li>
		<code>store</code>: the underlying <code>EventStore</code> from <code>@calendar-kit/core</code>,
		for use outside Svelte.
	</li>
</ul>
