<script lang="ts">
  import { today } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { MiniCalendar } from "#lib/registry/ui/mini-calendar/index.js";
  import { TimeGrid } from "#lib/registry/ui/time-grid/index.js";
  import { sampleEvents } from "./sample-events.js";

  const timeZone = "America/Lima";

  const calendar = new CalendarState({
    editable: true,
    locale: "en-US",
    timeZone,
    view: "week",
    events: sampleEvents(today(timeZone), timeZone),
  });
</script>

<FullCalendar.Root state={calendar}>
  <FullCalendar.Toolbar>
    <FullCalendar.Nav />
    <FullCalendar.Title />
  </FullCalendar.Toolbar>
  <div class="flex min-h-0 flex-1 gap-4">
    <!-- A click jumps the calendar to that date; arrows, Page Up/Down and Enter work too. -->
    <MiniCalendar class="w-56 shrink-0" />
    <div class="flex min-w-0 flex-1 flex-col">
      <FullCalendar.View name="week"><TimeGrid class="flex-1" scrollToHour={8} /></FullCalendar.View
      >
    </div>
  </div>
</FullCalendar.Root>
