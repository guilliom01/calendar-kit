<script lang="ts">
  import { getDayOfWeek, today } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { labels } from "./labels.js";
  import { sampleEvents } from "./sample-events.js";

  const timeZone = "America/Lima";
  let message = $state("Haz clic en un evento o en un día vacío, o arrastra un evento.");

  // Each hook runs before the built-in behavior; returning false skips it.
  const calendar = new CalendarState({
    locale: "es-PE",
    timeZone,
    labels,
    events: sampleEvents(today(timeZone), timeZone),
    // Our own panel instead of the event dialog.
    onEventClick: (event) => {
      message = `Abriste: ${event.title}`;
      return false;
    },
    // Stay in the month instead of opening the day.
    onDateClick: (date) => {
      message = `Día: ${date.toString()}`;
      return false;
    },
    // An empty day was picked: no dialog, just report it.
    onSelect: ({ start }) => {
      message = `Seleccionaste: ${start.toString()}`;
      return false;
    },
    // A rule of our own: nothing moves to a Sunday.
    onEventChange: ({ event }) => {
      if (getDayOfWeek(event.start, "en-US", "sun") === 0) {
        message = "Los domingos no se trabaja.";
        return false;
      }
      message = `Movido: ${event.title}`;
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
