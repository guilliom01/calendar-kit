<script lang="ts">
  import { today, toZoned } from "@internationalized/date";
  import type { CalendarSource } from "@guilli/calendar-core";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarList } from "#lib/registry/ui/calendar-list/index.js";
  import { EventDialog } from "#lib/registry/ui/event-dialog/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";

  // Events join a calendar with `calendarId` and take its color unless they have their own.
  const calendars: CalendarSource[] = [
    { id: "work", title: "Work", color: "oklch(0.6 0.15 250)" },
    { id: "personal", title: "Personal", color: "oklch(0.65 0.15 150)" },
    { id: "holidays", title: "Holidays", color: "oklch(0.6 0.2 25)" },
  ];

  const timeZone = "America/Lima";
  const day = today(timeZone);
  const at = (offset: number, hour: number) =>
    toZoned(day.add({ days: offset }), timeZone).set({ hour });

  const calendar = new CalendarState({
    editable: true,
    locale: "en-US",
    timeZone,
    calendars,
    events: [
      {
        id: "standup",
        title: "Daily standup",
        start: at(0, 9),
        end: at(0, 10),
        calendarId: "work",
      },
      { id: "gym", title: "Gym", start: at(1, 7), end: at(1, 8), calendarId: "personal" },
      {
        id: "holiday",
        title: "Holiday",
        start: day.add({ days: 3 }),
        end: day.add({ days: 4 }),
        calendarId: "holidays",
      },
    ],
  });
</script>

<FullCalendar.Root state={calendar}>
  <FullCalendar.Toolbar>
    <FullCalendar.Nav />
    <FullCalendar.Title />
  </FullCalendar.Toolbar>
  <div class="flex min-h-0 flex-1 gap-4">
    <!-- A checkbox per calendar hides or shows its events in every view. -->
    <CalendarList class="w-36 shrink-0" />
    <div class="flex min-w-0 flex-1 flex-col">
      <FullCalendar.View name="month"><MonthView class="flex-1" /></FullCalendar.View>
    </div>
  </div>
  <!-- With `calendars`, the dialog lets the user pick the calendar. -->
  <EventDialog />
</FullCalendar.Root>
