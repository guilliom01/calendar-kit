<script lang="ts">
  import { today } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import * as Exchange from "#lib/registry/ui/import-export/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { labels } from "./labels.js";
  import { sampleEvents } from "./sample-events.js";

  const timeZone = "America/Lima";
  let warnings: string[] = $state([]);

  const calendar = new CalendarState({
    locale: "es-PE",
    timeZone,
    labels,
    events: sampleEvents(today(timeZone), timeZone),
  });
</script>

<FullCalendar.Root state={calendar}>
  <FullCalendar.Toolbar>
    <FullCalendar.Nav />
    <FullCalendar.Title />
    <div class="ms-auto flex flex-wrap gap-2">
      <!-- .ics from Google Calendar, Outlook or Apple; what it cannot read becomes warnings. -->
      <Exchange.ImportIcs onImport={(result) => (warnings = result.warnings)} />
      <Exchange.ExportIcs filename="calendario.ics" name="Equipo" />
      <!-- What is on screen, for spreadsheets. The CSV starts with a BOM so Excel reads ñ. -->
      <Exchange.ExportCsv filename="calendario.csv" />
      <Exchange.ExportXlsx filename="calendario.xlsx" sheetName="Eventos" />
      <!-- The browser's print dialog, which also saves as PDF. -->
      <Exchange.Print />
    </div>
  </FullCalendar.Toolbar>
  {#if warnings.length}
    <ul class="text-sm text-muted-foreground">
      {#each warnings as warning (warning)}<li>{warning}</li>{/each}
    </ul>
  {/if}
  <FullCalendar.View name="month"><MonthView class="flex-1" /></FullCalendar.View>
</FullCalendar.Root>
