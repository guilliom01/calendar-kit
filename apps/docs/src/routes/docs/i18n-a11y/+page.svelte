<script lang="ts">
	import Code from '#lib/docs/code.svelte';

	const labels = `const calendar = new CalendarState({
	locale: 'es-PE',
	labels: {
		allDay: 'Todo el día',
		newEvent: 'Nuevo evento',
		save: 'Guardar',
		weekly: 'Cada semana el {weekday}',
		eventCount: { one: '{count} evento', other: '{count} eventos' }
	}
});`;
</script>

<svelte:head><title>Languages and accessibility · calendar-kit docs</title></svelte:head>

<h1>Languages and accessibility</h1>

<h2>Languages</h2>
<p>
	Set <code>locale</code> and most of the calendar is translated by the browser's <code>Intl</code>:
	month and weekday names, titles, times, "today", "next week", view names and the first day of the
	week. The texts Intl cannot provide are in <code>labels</code>; <code>defaultLabels</code> has the
	English ones. Labels may contain placeholders like <code>{'{weekday}'}</code>, and counts take
	plural forms chosen with <code>Intl.PluralRules</code>.
</p>
<Code code={labels} />

<h2>Right-to-left</h2>
<p>
	Layouts use logical properties (start/end), so a page with <code>dir="rtl"</code> mirrors the calendar:
	navigation arrows, sticky columns, Gantt bars and dependency arrows. Dragging finds the column under
	the pointer, so it works in both directions.
</p>

<h2>Dark mode</h2>
<p>
	The blocks use the shadcn theme tokens (<code>bg-background</code>,
	<code>text-muted-foreground</code>…), so they follow your <code>.dark</code> theme. Event colors are
	tints that read well on both.
</p>

<h2>Accessibility</h2>
<ul>
	<li>
		Press <kbd>M</kbd> on a focused event to move it without a mouse: arrow keys move it (minutes and
		days in the time grid, days and weeks in the month view, resources in the timeline), Shift with arrows
		changes its length, Enter saves and Escape cancels. Each step is announced to screen readers; hooks
		and recurring-event scopes still apply.
	</li>
	<li>
		Every view, the event dialog and the demo pages pass the axe-core WCAG 2.1 A and AA rules, in
		light and dark mode. The tests check it on each change.
	</li>
	<li>
		Events, days and controls are buttons: reachable with Tab, activated with Enter or Space. Delete
		or Backspace removes the focused event; Escape cancels a drag. On touch screens a quick swipe
		scrolls and a long press lifts an event to drag it.
	</li>
	<li>
		Day headers are named with the full date for screen readers; the title is a live region that
		announces navigation.
	</li>
	<li>
		Every pointer action has a keyboard path: the dialog edits dates and times, and <code
			>Calendar.NewEvent</code
		> creates events.
	</li>
</ul>
