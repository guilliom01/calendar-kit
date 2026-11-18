<script lang="ts">
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";

  // Dates and calendar words come from Intl in this locale.
  const calendar = new CalendarState({ locale: "es-PE", timeZone: "America/Lima" });
</script>

<FullCalendar.Root state={calendar}>
  <FullCalendar.Toolbar>
    <FullCalendar.Nav />
    <FullCalendar.Title />
  </FullCalendar.Toolbar>
  <FullCalendar.View name="month">
    <MonthView class="flex-1" />
  </FullCalendar.View>
</FullCalendar.Root>
