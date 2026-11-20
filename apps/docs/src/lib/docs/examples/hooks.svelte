<script lang="ts">
  import { getDayOfWeek, today, toZoned } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { draggable } from "#lib/registry/lib/calendar-drag.js";
  import { sampleEvents } from "./sample-events.js";

  const timeZone = "America/Lima";
  let message = $state("Click an event or an empty day, or drag an event.");

  // Four short meetings on the first day of the trip, so that day shows "+N".
  const busyDay = toZoned(today(timeZone).add({ days: 3 }), timeZone);
  const meetings = ["Planning", "Retro", "One on one", "Coffee"].map((title, index) => ({
    id: `meeting-${index}`,
    title,
    start: busyDay.set({ hour: 14 + index }),
    end: busyDay.set({ hour: 14 + index, minute: 45 }),
  }));

  // Each hook runs before the built-in behavior; returning false skips it.
  const calendar = new CalendarState({
    editable: true,
    locale: "en-US",
    timeZone,
    events: [...sampleEvents(today(timeZone), timeZone), ...meetings],
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
    // Our own reaction to "+N" instead of the built-in list.
    onMoreClick: (day, events) => {
      message = `More on ${day.toString()}: ${events.length}`;
      return false;
    },
    // Our own reaction to a right-click instead of a menu.
    onEventContextMenu: (event, nativeEvent) => {
      nativeEvent.preventDefault();
      message = `Our own menu for: ${event.title}`;
      return false;
    },
    // A dropped item is only reported, never created. Hooks may be async.
    onExternalDrop: async ({ item, start }) => {
      message = `Dropped "${item.title}" on ${start.toString()}`;
      return false;
    },
  });
</script>

<div class="mb-2 flex flex-wrap items-center gap-3 text-sm">
  <p
    class="cursor-grab rounded-md border px-2 py-1.5 select-none"
    {@attach draggable(calendar, { title: "Task without a date" })}
  >
    Task without a date
  </p>
  <p role="status">{message}</p>
</div>
<FullCalendar.Root state={calendar}>
  <FullCalendar.Toolbar>
    <FullCalendar.Nav />
    <FullCalendar.Title />
  </FullCalendar.Toolbar>
  <FullCalendar.View name="month"><MonthView class="flex-1" /></FullCalendar.View>
</FullCalendar.Root>
