<script lang="ts">
  import { today } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { AgendaView } from "#lib/registry/ui/agenda-view/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { TimeGrid } from "#lib/registry/ui/time-grid/index.js";
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

<!-- A phone-wide box. Parts adapt to the calendar's own width, not the window's:
     the view switcher becomes a select and the month shows dots, with the tapped day below. -->
<div class="mx-auto flex h-full w-full max-w-[24rem] flex-col rounded-xl border p-2">
  <FullCalendar.Root state={calendar}>
    <FullCalendar.Toolbar>
      <FullCalendar.Nav />
      <FullCalendar.ViewSwitcher class="ms-auto" />
      <FullCalendar.Title class="w-full" />
    </FullCalendar.Toolbar>
    <FullCalendar.View name="month"><MonthView class="flex-1" /></FullCalendar.View>
    <!-- On phones, a day reads better than a seven-column week. -->
    <FullCalendar.View name="day"><TimeGrid class="flex-1" scrollToHour={8} /></FullCalendar.View>
    <FullCalendar.View name="agenda"><AgendaView class="flex-1" /></FullCalendar.View>
  </FullCalendar.Root>
</div>
