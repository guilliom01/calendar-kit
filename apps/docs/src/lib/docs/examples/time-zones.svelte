<script lang="ts">
  import { parseZonedDateTime, today } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { TimeGrid } from "#lib/registry/ui/time-grid/index.js";
  import { labels } from "./labels.js";

  const date = today("America/Lima").toString();

  const calendar = new CalendarState({
    editable: true,
    locale: "es-PE",
    timeZone: "America/Lima",
    labels,
    view: "week",
    events: [
      // Each event keeps the zone it was planned in; the calendar shows it in its own zone.
      {
        id: "madrid",
        title: "Llamada con Madrid",
        start: parseZonedDateTime(`${date}T16:00[Europe/Madrid]`),
        end: parseZonedDateTime(`${date}T17:00[Europe/Madrid]`),
      },
      {
        id: "lima",
        title: "Reunión en Lima",
        start: parseZonedDateTime(`${date}T15:00[America/Lima]`),
        end: parseZonedDateTime(`${date}T16:00[America/Lima]`),
      },
    ],
  });
</script>

<FullCalendar.Root state={calendar}>
  <FullCalendar.Toolbar>
    <FullCalendar.Nav />
    <FullCalendar.Title />
    <!-- Without `zones`, it lists every IANA zone. -->
    <FullCalendar.TimeZoneSelect
      class="ms-auto"
      zones={["America/Lima", "America/New_York", "Europe/Madrid", "Asia/Tokyo"]}
    />
  </FullCalendar.Toolbar>
  <FullCalendar.View name="week"><TimeGrid class="flex-1" scrollToHour={6} /></FullCalendar.View>
</FullCalendar.Root>
