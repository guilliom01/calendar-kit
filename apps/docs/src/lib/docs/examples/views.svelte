<script lang="ts">
  import { today } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { AgendaView } from "#lib/registry/ui/agenda-view/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { TimeGrid } from "#lib/registry/ui/time-grid/index.js";
  import { YearView } from "#lib/registry/ui/year-view/index.js";
  import { labels } from "./labels.js";
  import { sampleEvents } from "./sample-events.js";

  const timeZone = "America/Lima";

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
    <!-- One option per registered view; a select when the calendar is narrow. -->
    <FullCalendar.ViewSwitcher class="ms-auto" />
  </FullCalendar.Toolbar>

  <!-- Keep only the views you need. Week and day are both a TimeGrid. -->
  <FullCalendar.View name="month"><MonthView class="flex-1" /></FullCalendar.View>
  <FullCalendar.View name="week"><TimeGrid class="flex-1" /></FullCalendar.View>
  <FullCalendar.View name="day"><TimeGrid class="flex-1" /></FullCalendar.View>
  <FullCalendar.View name="agenda"><AgendaView class="flex-1" /></FullCalendar.View>
  <FullCalendar.View name="year"><YearView class="flex-1" /></FullCalendar.View>
</FullCalendar.Root>
