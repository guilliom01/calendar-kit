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
	<Exchange.ExportXlsx filename="team.xlsx" sheetName="Team" />
	<Exchange.Print />
</FullCalendar.Toolbar>`;

	const core = `import { parseICS, toICS, toCSV, toXLSX } from '@calendar-kit/core';

const file = toICS(events, { name: 'Team' });
const { events: imported, warnings } = parseICS(text, { timeZone: 'America/Lima' });
const sheet = toCSV(visibleEvents, { timeZone: 'America/Lima' });
const workbook = toXLSX(visibleEvents, { timeZone: 'America/Lima', sheetName: 'Team' }); // Uint8Array`;
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

<h2>CSV and Excel</h2>
<p>
	Both export what the user sees: the visible range, with recurring events expanded, one row each
	with local times, with the columns id, title, start, end, all_day, rrule, resources, color,
	location and description. Pass <code>events</code> to export something else (for example
	<code>calendar.events</code>, with each series once).
</p>
<ul>
	<li>
		<code>ExportCsv</code>: plain text. It starts with a byte order mark so Excel reads accents and
		ñ correctly; <code>bom={'{false}'}</code> leaves it out for other tools.
	</li>
	<li>
		<code>ExportXlsx</code>: an Excel workbook (<code>toXLSX</code>, no dependencies) where start
		and end are real dates Excel can sort and filter, and <code>all_day</code> is a boolean.
		<code>sheetName</code> names the sheet.
	</li>
</ul>

<h2>Print and PDF</h2>
<p>
	<code>Print</code> opens the browser's print dialog, which also saves as PDF: that is the way to get
	an image of the calendar. In print, the calendar controls hide themselves and scrolling areas expand
	so nothing is cut.
</p>

<h2>Without the buttons</h2>
<Code code={core} />
