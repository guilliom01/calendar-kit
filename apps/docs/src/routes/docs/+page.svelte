<script lang="ts">
  import { resolve } from "$app/paths";
  import Code from "#lib/docs/code.svelte";

  // Written in parts so this page's own <script> block does not end here.
  const closeScript = "</" + "script>";

  const install = `npx shadcn-svelte@latest add <registry-url>/r/full-calendar.json <registry-url>/r/month-view.json`;

  const quickStart = `<script lang="ts">
	import { today, toZoned } from '@internationalized/date';
	import * as FullCalendar from '$lib/components/ui/full-calendar/index.js';
	import { CalendarState } from '$lib/components/ui/full-calendar/index.js';
	import { MonthView } from '$lib/components/ui/month-view/index.js';

	const timeZone = 'America/Lima';
	const day = today(timeZone);

	const calendar = new CalendarState({
		locale: 'es-PE',
		timeZone,
		events: [
			{ id: '1', title: 'Holiday', start: day, end: day.add({ days: 1 }) },
			{
				id: '2',
				title: 'Meeting',
				start: toZoned(day, timeZone).set({ hour: 10 }),
				end: toZoned(day, timeZone).set({ hour: 11 })
			}
		]
	});
${closeScript}

<FullCalendar.Root state={calendar}>
	<FullCalendar.Toolbar>
		<FullCalendar.Nav />
		<FullCalendar.Title />
	</FullCalendar.Toolbar>
	<FullCalendar.View name="month"><MonthView /></FullCalendar.View>
</FullCalendar.Root>`;
</script>

<svelte:head><title>Introduction · calendar-kit docs</title></svelte:head>

<h1>calendar-kit</h1>
<p>
  A free, MIT-licensed full calendar for Svelte 5, built the shadcn way. You copy the components
  into your project, own their code and style them with Tailwind CSS. The logic that is hard to get
  right (dates, time zones, recurrence, layout, saving, undo) lives in
  <code>@guilli/calendar-core</code>, an npm package, so fixes reach you without touching your
  markup.
</p>

<h2>Philosophy</h2>
<ul>
  <li>
    <strong>Building blocks, not a black box.</strong> Every part is a component you compose. Use the
    ones you need, replace the ones you do not like.
  </li>
  <li>
    <strong>Pay only for what you use.</strong> If you never add the Gantt or resource views, they are
    not in your project and nothing in the API asks about them.
  </li>
  <li>
    <strong>Your rules first.</strong> Every interaction calls your hook before the built-in behavior,
    and you can stop it.
  </li>
  <li>
    <strong>Every language.</strong> Dates, weekdays, "today", "next week" and view names come from
    <code>Intl</code>. The few remaining texts are in <code>labels</code>.
  </li>
</ul>

<h2>Requirements</h2>
<p>
  Svelte 5, Tailwind CSS 4 and a project set up with shadcn-svelte (it provides the theme and the
  <code>button</code>, <code>dialog</code>… components the blocks use).
</p>

<h2>Install</h2>
<p>
  Add the calendar parts and the views you want. The CLI copies the files and adds the npm packages.
</p>
<Code code={install} />

<h2>Quick start</h2>
<p>
  Events are all-day (<code>CalendarDate</code> start and end) or timed (<code>ZonedDateTime</code>
  start and end), from <code>@internationalized/date</code>. <code>end</code> is exclusive, as in iCalendar:
  a one-day event ends the next day.
</p>
<Code code={quickStart} label="+page.svelte" />

<p>
  Next: see every <a href={resolve("/docs/blocks")}>block</a>, or how to react to clicks and save
  changes in <a href={resolve("/docs/state")}>State and hooks</a>.
</p>
