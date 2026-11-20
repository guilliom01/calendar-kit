<script lang="ts">
  import { today } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { EventPreview } from "#lib/registry/ui/event-preview/index.js";
  import { TimeGrid } from "#lib/registry/ui/time-grid/index.js";
  import { sampleEvents } from "./sample-events.js";

  const timeZone = "America/Lima";

  const calendar = new CalendarState({
    locale: "en-US",
    timeZone,
    view: "week",
    events: sampleEvents(today(timeZone), timeZone).map((event) => ({
      ...event,
      location: "Room Miraflores",
      description: "Bring a laptop.",
    })),
  });
</script>

<FullCalendar.Root state={calendar}>
  <FullCalendar.Toolbar>
    <FullCalendar.Nav />
    <FullCalendar.Title />
  </FullCalendar.Toolbar>
  <!-- Rest the pointer on an event, or focus it with the keyboard, to see its details. -->
  <EventPreview>
    <FullCalendar.View name="week"><TimeGrid class="flex-1" scrollToHour={8} /></FullCalendar.View>
  </EventPreview>
</FullCalendar.Root>
