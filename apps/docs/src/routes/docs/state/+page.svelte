<script lang="ts">
  import Code from "#lib/docs/code.svelte";
  import PropsTable from "#lib/docs/props-table.svelte";

  const saving = `const calendar = new CalendarState({
	events,
	// Called after the change is already visible. Return the saved event to replace the local
	// one (e.g. with the id your database assigned). Throw to roll the change back.
	onMutate: async (mutation) => {
		const response = await fetch('/api/events', { method: 'POST', body: JSON.stringify(mutation) });
		if (!response.ok) throw new Error('Could not save');
		return response.json();
	},
	onError: (error, mutation) => toast.error('Your change was not saved'),
	// Someone else changed it first: the store already shows their version.
	onConflict: (mutation, current) => toast.info(current ? 'Updated by someone else' : 'Deleted by someone else')
});`;

  const hooks = `const calendar = new CalendarState({
	events,
	// Holidays cannot be changed; bookings can move but keep their length.
	isEditable: (event, action) =>
		event.data?.kind !== 'holiday' && (event.data?.kind !== 'booking' || action !== 'resize'),
	// Tentative events are drawn dashed in every view.
	eventClass: (event) => (event.data?.tentative ? 'border border-dashed' : undefined),
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
    { name: "events", type: "CalendarEvent[]", description: "Initial events." },
    { name: "view", type: "string", description: "View shown first. Default 'month'." },
    { name: "date", type: "CalendarDate", description: "Date shown first. Default today." },
    {
      name: "locale",
      type: "string",
      description:
        "BCP 47 locale for every text Intl provides and the first day of the week. Default: the browser locale.",
    },
    {
      name: "timeZone",
      type: "string",
      description: "IANA zone used to show events. Default: the browser zone.",
    },
    { name: "firstDayOfWeek", type: "'sun' | 'mon' | …", description: "Overrides the locale." },
    {
      name: "snapStep",
      type: "number",
      description: "Minutes drag, resize and create snap to. Default 15.",
    },
    {
      name: "defaultDuration",
      type: "number",
      description: "Minutes an all-day event lasts when dragged onto the hours. Default 60.",
    },
    { name: "editable", type: "boolean", description: "Set to false for a read-only calendar." },
    {
      name: "filter",
      type: "(event) => boolean",
      description:
        "Shows only matching events in every view. Change it later through state.filter (null shows all).",
    },
    {
      name: "calendars",
      type: "CalendarSource[]",
      description:
        "{ id, title, color? } calendars events belong to (calendarId). Events without a color take their calendar color; hiddenCalendars hides them.",
    },
    {
      name: "confirmChanges",
      type: "boolean | (change) => boolean",
      description:
        "Ask before saving a drag or resize, with <ChangeConfirmDialog> mounted. Default true; a function decides per change.",
    },
    {
      name: "touchDrag",
      type: "boolean",
      description:
        "Let fingers drag events after a long press. Default true; a quick swipe always scrolls.",
    },
    {
      name: "touchDragDelay",
      type: "number",
      description: "Long-press milliseconds. Default 400.",
    },
    {
      name: "moveKey",
      type: "string",
      description: "Key that starts keyboard move mode on a focused event. Default 'm'.",
    },
    {
      name: "labels",
      type: "Partial<CalendarLabels>",
      description: "Texts Intl cannot provide. See defaultLabels.",
    },
    {
      name: "createId",
      type: "() => string",
      description: "Ids for events created in the UI. Default crypto.randomUUID().",
    },
    { name: "onMutate, onError, historyLimit", type: "see below", description: "Saving and undo." },
    {
      name: "loadEvents, preload, onLoadError",
      type: "see below",
      description: "Loading on demand.",
    },
  ]}
/>

<h2>Saving changes</h2>
<p>
  Changes are optimistic: they show at once and then go to <code>onMutate</code> as
  <code>{'{ type: "create" | "update" | "delete", … }'}</code>. Changes to the same event are sent
  in order. If <code>onMutate</code> throws, the change is rolled back (unless a later change
  replaced it) and <code>onError</code> is called. Undo and redo reach <code>onMutate</code> as
  inverse changes, so your backend stays in sync. When the server has a newer version, throw
  <code>new ConflictError(current)</code> (from <code>@calendar-kit/core</code>; <code>null</code>
  when it was deleted): the calendar shows that version instead of rolling back, forgets the undo steps
  that would overwrite it, and calls <code>onConflict</code>. Reloaded months never replace an event
  while a save of it is on its way.
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
      name: "onEventClick(event, nativeEvent)",
      type: "boolean | void",
      description: "An event was clicked or activated. Built-in: open the event dialog.",
    },
    {
      name: "onMoreClick(day, events)",
      type: "boolean | void",
      description:
        '"+N" was clicked in the month view. Built-in: a popover listing every event of the day.',
    },
    {
      name: "validate(event)",
      type: "{ [field]: message } | void",
      description:
        "Your rules for the event dialog, by field (title, start, end, location, description) or any other key for a general message. Nothing is saved while there is one. The dialog already checks that the end is after the start.",
    },
    {
      name: "onExternalDrop({ item, start, end, allDay, resourceIds })",
      type: "boolean | event | void",
      description:
        "An item made draggable with draggable(calendar, item) was dropped. Return false to create nothing, or the event to create. Built-in: an event with its title there.",
    },
    {
      name: "onEventContextMenu(event, nativeEvent)",
      type: "boolean | void",
      description:
        "An event was right-clicked, or got Shift+F10 or the menu key. Built-in: the event-context-menu block, if mounted.",
    },
    {
      name: "onDateClick(date, nativeEvent)",
      type: "boolean | void",
      description:
        "A day number or header was clicked. Built-in: show the day view, if one is registered.",
    },
    {
      name: "onSelect(selection)",
      type: "boolean | void",
      description:
        "An empty day or time range was picked ({ start, end, allDay, fields }). Built-in: open the new-event dialog.",
    },
    {
      name: "onEventChange({ event, previous, kind })",
      type: "boolean | event | void",
      description:
        "A drag or resize finished. Return false to cancel, or an event to save instead.",
    },
    {
      name: "resolveScope(request)",
      type: "'this' | 'following' | 'all' | null",
      description: "Decides the scope of a change to a recurring event instead of asking.",
    },
    {
      name: "isEditable(event, action)",
      type: "boolean",
      description:
        "Per-event permission for an action: 'move' (drag, keyboard move), 'resize' (edge drag, Shift+arrows), 'delete' (Delete key, dialog button) or 'edit' (open the dialog).",
    },
    {
      name: "eventClass(event)",
      type: "string | undefined",
      description: "Extra classes for the event's element in every view.",
    },
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

<h2>Performance</h2>
<p>Measured on a laptop with events spread over a year (2% of them weekly series):</p>
<!-- Focusable so keyboard users can scroll it on narrow screens. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="overflow-x-auto" tabindex="0" role="region" aria-label="Performance measurements">
  <table>
    <thead>
      <tr
        ><th scope="col">Operation</th><th scope="col">1,000 events</th><th scope="col">5,000</th
        ><th scope="col">20,000</th></tr
      >
    </thead>
    <tbody>
      <tr><td>Expand the visible month</td><td>5 ms</td><td>20 ms</td><td>70 ms</td></tr>
      <tr><td>Month layout</td><td>0.6 ms</td><td>3 ms</td><td>14 ms</td></tr>
      <tr><td>Week layout</td><td>1.6 ms</td><td>9 ms</td><td>35 ms</td></tr>
      <tr><td>Agenda grouping</td><td>0.7 ms</td><td>4 ms</td><td>17 ms</td></tr>
      <tr><td>Search</td><td>0.1 ms</td><td>0.4 ms</td><td>1.2 ms</td></tr>
    </tbody>
  </table>
</div>
<p>
  Expanding runs when the period, filters or data change; dragging only redoes the layout of the
  view. Up to about 5,000 events everything fits in a frame. Above that, use <code>loadEvents</code> so
  the calendar only holds the months around the one shown. The agenda draws every event of the month,
  so a month with thousands of events is better shown in other views.
</p>

<h2>Methods and fields</h2>
<ul>
  <li>
    <code>next()</code>, <code>previous()</code>, <code>goToday()</code>,
    <code>openDay(date)</code>: navigation.
  </li>
  <li>
    <code>create(event)</code>, <code>update(event)</code>, <code>remove(id)</code>,
    <code>duplicate(event)</code>,
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
    <code>hiddenCalendars</code> (a reactive set), <code>setCalendarVisible(id, visible)</code>,
    <code>colorOf(event)</code>: calendars shown and the color an event is drawn with.
  </li>
  <li>
    <code>query</code> and <code>filter</code>: set them to search or filter every view;
    <code>matchesQuery(event, query, locale)</code> from the core does the accent-insensitive match.
  </li>
  <li>
    <code>store</code>: the underlying <code>EventStore</code> from <code>@calendar-kit/core</code>,
    for use outside Svelte.
  </li>
</ul>
