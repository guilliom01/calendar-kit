<script lang="ts">
	import Code from '#lib/docs/code.svelte';

	const series = `{
	id: 'english',
	title: 'English class',
	start: toZoned(monday, 'America/Lima').set({ hour: 19 }),
	end: toZoned(monday, 'America/Lima').set({ hour: 20, minute: 30 }),
	rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=10',
	exdates: [parseZonedDateTime('2026-12-28T19:00[America/Lima]')]
}`;

	const core = `import { occurrences, seriesChanges, parseRRule } from '@calendar-kit/core';

// Occurrences of a series in a range, seen from a time zone.
const list = occurrences(series, { start, end }, 'America/Lima');

// The store changes for "this and following" on one occurrence.
const changes = seriesChanges(series, list[3], { ...list[3], title: 'New title' }, 'following', createId);
await store.batch(changes); // one undo step`;
</script>

<svelte:head><title>Recurring events · calendar-kit docs</title></svelte:head>

<h1>Recurring events</h1>
<p>
	Give an event an RFC 5545 <code>rrule</code> and, optionally, <code>exdates</code> (starts of
	occurrences removed from the series) and <code>rdates</code> (extra starts, RDATE). An event with
	only
	<code>rdates</code> is a series too. The views show its occurrences for the visible range only.
</p>
<Code code={series} />

<h2>Supported rules</h2>
<ul>
	<li><code>FREQ</code>: DAILY, WEEKLY, MONTHLY, YEARLY.</li>
	<li>
		<code>INTERVAL</code>, <code>COUNT</code>, <code>UNTIL</code> (a date, or a UTC time for timed events).
	</li>
	<li>
		<code>BYDAY</code> with ordinals (<code>-1FR</code> is the last Friday), <code>BYMONTHDAY</code>
		(negative counts from the end), <code>BYMONTH</code>, <code>BYSETPOS</code>, <code>WKST</code>.
	</li>
</ul>
<p>
	Anything else (for example <code>BYHOUR</code> or <code>FREQ=HOURLY</code>) throws a
	<code>RangeError</code> instead of being silently ignored. Occurrences keep their wall-clock time
	across daylight saving changes. The expansion is checked against <code>rrule-temporal</code> in the
	tests.
</p>

<h2>Changing one occurrence</h2>
<p>
	Editing, moving or deleting an occurrence asks for its scope (with
	<code>RecurrenceScopeDialog</code>, or your <code>resolveScope</code> hook):
</p>
<ul>
	<li>
		<strong>This event</strong>: the occurrence is excluded and, for edits, becomes a single event
		(an exception) that keeps <code>exceptionOf</code> (the series id) and
		<code>recurrenceId</code> (its original start), so it exports with <code>RECURRENCE-ID</code>.
	</li>
	<li>
		<strong>This and following</strong>: the series ends before it and a new series starts there
		with the remaining count.
	</li>
	<li>
		<strong>All events</strong>: the series changes; moving one occurrence moves every one, and
		excluded dates move with them. Exceptions are not changed.
	</li>
</ul>
<p>Each choice is one undo step.</p>

<h2>Without the UI</h2>
<Code code={core} />
