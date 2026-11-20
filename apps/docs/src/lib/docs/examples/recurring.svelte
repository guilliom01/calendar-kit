<script lang="ts">
  import { today, toZoned } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { EventDialog, RecurrenceScopeDialog } from "#lib/registry/ui/event-dialog/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { RecurrenceEditor } from "#lib/registry/ui/recurrence-editor/index.js";
  import { TimeGrid } from "#lib/registry/ui/time-grid/index.js";
  import { labels } from "./labels.js";

  const timeZone = "America/Lima";
  const day = today(timeZone);
  const at = (hour: number) => toZoned(day.subtract({ days: 30 }), timeZone).set({ hour });

  const calendar = new CalendarState({
    editable: true,
    locale: "es-PE",
    timeZone,
    labels,
    events: [
      // RFC 5545 rules; occurrences are expanded only for the range on screen.
      {
        id: "english",
        title: "Clase de inglés",
        start: at(19),
        end: at(19).add({ minutes: 90 }),
        rrule: "FREQ=WEEKLY;BYDAY=MO,WE",
      },
      {
        id: "report",
        title: "Informe mensual",
        start: day.subtract({ days: 30 }),
        end: day.subtract({ days: 29 }),
        // The last Friday of every month.
        rrule: "FREQ=MONTHLY;BYDAY=-1FR",
        color: "oklch(0.6 0.15 250)",
      },
    ],
  });
</script>

<FullCalendar.Root state={calendar}>
  <FullCalendar.Toolbar>
    <FullCalendar.NewEvent />
    <FullCalendar.Nav />
    <FullCalendar.Title />
    <FullCalendar.ViewSwitcher class="ms-auto" />
  </FullCalendar.Toolbar>
  <FullCalendar.View name="month"><MonthView class="flex-1" /></FullCalendar.View>
  <FullCalendar.View name="week"><TimeGrid class="flex-1" /></FullCalendar.View>

  <!-- The editor builds any rule: every 2 weeks on Tuesday and Thursday, the 2nd Monday... -->
  <EventDialog>
    {#snippet recurrence({ value, setValue, start })}
      <RecurrenceEditor {value} onchange={setValue} {start} />
    {/snippet}
  </EventDialog>
  <!-- Changing one occurrence asks: this event, this and following, or all. -->
  <RecurrenceScopeDialog />
</FullCalendar.Root>
