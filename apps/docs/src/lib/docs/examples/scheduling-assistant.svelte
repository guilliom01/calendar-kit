<script lang="ts">
  import { today, toZoned } from "@internationalized/date";
  import type { Resource } from "@guilli/calendar-core";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { EventDialog } from "#lib/registry/ui/event-dialog/index.js";
  import { SchedulingAssistant } from "#lib/registry/ui/scheduling-assistant/index.js";
  import { TimeGrid } from "#lib/registry/ui/time-grid/index.js";
  import { labels } from "./labels.js";

  const people: Resource[] = [
    { id: "ana", title: "Ana", color: "oklch(0.65 0.15 150)" },
    { id: "luis", title: "Luis", color: "oklch(0.7 0.15 70)" },
    { id: "rosa", title: "Rosa", color: "oklch(0.6 0.15 250)" },
  ];

  const timeZone = "America/Lima";
  const day = today(timeZone);
  const at = (offset: number, hour: number) =>
    toZoned(day.add({ days: offset }), timeZone).set({ hour });

  const calendar = new CalendarState({
    locale: "es-PE",
    timeZone,
    labels,
    view: "resources",
    events: [
      { id: "a", title: "Ocupada", start: at(1, 9), end: at(1, 12), resourceIds: ["ana"] },
      { id: "l", title: "Ocupado", start: at(1, 11), end: at(1, 15), resourceIds: ["luis"] },
      { id: "r", title: "Ocupada", start: at(1, 15), end: at(1, 16), resourceIds: ["rosa"] },
    ],
  });
</script>

<FullCalendar.Root state={calendar}>
  <div class="flex min-h-0 flex-1 gap-4">
    <!-- Pick people and a length; a suggestion opens as a new event with them assigned. -->
    <SchedulingAssistant class="w-64 shrink-0" resources={people} days={7} />
    <div class="flex min-w-0 flex-1 flex-col gap-3">
      <FullCalendar.Toolbar>
        <FullCalendar.Nav />
        <FullCalendar.Title />
      </FullCalendar.Toolbar>
      <FullCalendar.View name="resources">
        <TimeGrid class="flex-1" resources={people} scrollToHour={8} />
      </FullCalendar.View>
    </div>
  </div>
  <EventDialog resources={people} />
</FullCalendar.Root>
