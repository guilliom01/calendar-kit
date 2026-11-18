<script lang="ts">
	import Code from '#lib/docs/code.svelte';

	// Written in parts so this page's own <script> block does not end here.
	const closeScript = '</' + 'script>';

	const buttons = `<script lang="ts">
	import * as Exchange from '$lib/components/ui/import-export/index.js';
	let warnings: string[] = $state([]);
${closeScript}

<FullCalendar.Toolbar>
	<Exchange.ImportIcs onImport={(result) => (warnings = result.warnings)} />
	<Exchange.ExportIcs filename="team.ics" name="Team" />
	<Exchange.ExportCsv filename="team.csv" />
	<Exchange.Print />
</FullCalendar.Toolbar>`;

	const core = `import { parseICS, toICS, toCSV } from '@calendar-kit/core';

const file = toICS(events, { name: 'Team' });
const { events: imported, warnings } = parseICS(text, { timeZone: 'America/Lima' });
const sheet = toCSV(visibleEvents, { timeZone: 'America/Lima' });`;
</script>

<svelte:head><title>Import and export · calendar-kit docs</title></svelte:head>

<h1>Import and export</h1>
<p>The optional <code>import-export</code> block adds four buttons; each is a separate part.</p>
<Code code={buttons} />

<h2>iCalendar (.ics)</h2>
<ul>
	<li>
		<strong>Export</strong> writes the stored events: series once, with their rule and exclusions,
		so Google Calendar, Outlook and Apple Calendar repeat them too. Times keep their time zone.
		calendar-kit fields (color, resources, progress, dependencies) travel as
		<code>X-CALENDAR-KIT-*</code> properties other apps ignore.
	</li>
	<li>
		<strong>Import</strong> adds the file's events as one undo step (events with a known id are
		replaced). It reads folded lines, UTC and floating times, <code>DURATION</code>, modified
		occurrences (<code>RECURRENCE-ID</code>) and cancelled events. Rules or time zones it cannot use
		become <code>warnings</code> instead of failing the whole file.
	</li>
</ul>

<h2>CSV</h2>
<p>
	Exports what the user sees: the visible range, with recurring events expanded, one row each with
	local times. The file starts with a BOM so Excel reads accents correctly.
</p>

<h2>Print and PDF</h2>
<p>
	<code>Print</code> opens the browser's print dialog, which also saves as PDF. In print, the calendar
	controls hide themselves and scrolling areas expand so nothing is cut.
</p>

<h2>Without the buttons</h2>
<Code code={core} />
