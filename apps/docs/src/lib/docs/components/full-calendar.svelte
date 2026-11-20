<script lang="ts">
  import Code from "#lib/docs/code.svelte";
  import PropsTable from "#lib/docs/props-table.svelte";

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
</script>

<h2>Usage</h2>
<p>
  The parts every calendar uses. <code>FullCalendar.Root</code> shares the state with everything inside
  it; the rest are optional.
</p>
<p>A calendar with every block looks like this. Keep only the lines you need:</p>
<Code code={full} />
<h3>Custom views</h3>
<p>
  A view of your own registers like the built-in ones; give it a range and a unit for the arrows.
</p>
<Code code={customView} />
<h2>API reference</h2>
<PropsTable
  caption="FullCalendar parts"
  rows={[
    {
      name: "Root",
      type: "state, class, shortcuts = true",
      description:
        "Provides the state. With shortcuts, Ctrl/Cmd+Z undoes and Ctrl/Cmd+Shift+Z or Ctrl+Y redoes. Loads ranges when the state has loadEvents.",
    },
    {
      name: "View",
      type: "name, label?, range?, unit?",
      description:
        "Shows its children when this view is selected, and registers it for the ViewSwitcher. Built-in names know their range; custom names pass range and unit.",
    },
    { name: "Toolbar", type: "class", description: "A flex row for the parts below." },
    {
      name: "Nav",
      type: "class, today = true",
      description: 'Today, previous and next. Labels come from Intl ("today", "next week").',
    },
    { name: "Title", type: "class", description: 'The visible period, e.g. "November 2026".' },
    {
      name: "ViewSwitcher",
      type: "class, variant = 'auto'",
      description:
        "One button per registered view, or a select ('select'); 'auto' uses a select while the calendar is narrower than 42rem. Hidden when there is only one view.",
    },
    {
      name: "NewEvent",
      type: "class",
      description:
        "Picks a one-hour slot (next full hour today, 9:00 otherwise) and calls select().",
    },
    { name: "UndoRedo", type: "class", description: "Undo and redo buttons." },
    {
      name: "TimeZoneSelect",
      type: "class, zones?",
      description: "Changes state.timeZone. Lists every IANA zone unless zones is given.",
    },
    { name: "Loading", type: "class", description: "A spinner while state.loading is true." },
  ]}
/>
