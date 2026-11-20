<script lang="ts">
  import { getDayOfWeek, today } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { sampleEvents } from "./sample-events.js";

  const timeZone = "America/Lima";
  let message = $state("Click an event or an empty day, or drag an event.");

  // Each hook runs before the built-in behavior; returning false skips it.
  const calendar = new CalendarState({
    editable: true,
    locale: "en-US",
    timeZone,
    events: sampleEvents(today(timeZone), timeZone),
    // Our own panel instead of the event dialog.
    onEventClick: (event) => {
      message = `Opened: ${event.title}`;
      return false;
    },
    // Stay in the month instead of opening the day.
    onDateClick: (date) => {
      message = `Day: ${date.toString()}`;
      return false;
    },
    // An empty day was picked: no dialog, just report it.
    onSelect: ({ start }) => {
      message = `Selected: ${start.toString()}`;
      return false;
    },
    // A rule of our own: nothing moves to a Sunday.
    onEventChange: ({ event }) => {
      if (getDayOfWeek(event.start, "en-US", "sun") === 0) {
        message = "No work on Sundays.";
        return false;
      }
      message = `Moved: ${event.title}`;
    },
  });
</script>

<p class="mb-2 text-sm" role="status">{message}</p>
<FullCalendar.Root state={calendar}>
  <FullCalendar.Toolbar>
    <FullCalendar.Nav />
    <FullCalendar.Title />
  </FullCalendar.Toolbar>
  <FullCalendar.View name="month"><MonthView class="flex-1" /></FullCalendar.View>
</FullCalendar.Root>
