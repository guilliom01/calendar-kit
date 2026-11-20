<script lang="ts">
  import { today, toZoned } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { EventDialog } from "#lib/registry/ui/event-dialog/index.js";
  import { TimeGrid } from "#lib/registry/ui/time-grid/index.js";
  import { labels } from "./labels.js";

  const timeZone = "America/Lima";
  const day = today(timeZone);
  const at = (offset: number, hour: number) =>
    toZoned(day.add({ days: offset }), timeZone).set({ hour });

  const calendar = new CalendarState({
    editable: true,
    locale: "es-PE",
    timeZone,
    labels,
    view: "week",
    events: [
      { id: "free", title: "Editable", start: at(0, 9), end: at(0, 10) },
      {
        id: "booking",
        title: "Reserva de sala",
        start: at(1, 11),
        end: at(1, 12),
        data: { kind: "booking" },
      },
      {
        id: "holiday",
        title: "Feriado",
        start: day.add({ days: 2 }),
        end: day.add({ days: 3 }),
        data: { kind: "holiday" },
      },
      {
        id: "maybe",
        title: "Por confirmar",
        start: at(3, 15),
        end: at(3, 16),
        data: { tentative: true },
      },
    ],
    // Per event and action: "move", "resize", "delete" or "edit" (the dialog).
    isEditable: (event, action) => {
      const kind = (event.data as { kind?: string } | undefined)?.kind;
      if (kind === "holiday") return false; // fixed
      if (kind === "booking") return action === "move"; // keeps its length, cannot be deleted
      return true;
    },
    // Extra classes in every view: tentative events are dashed.
    eventClass: (event) =>
      (event.data as { tentative?: boolean } | undefined)?.tentative
        ? "border border-dashed opacity-80"
        : undefined,
  });
</script>

<FullCalendar.Root state={calendar}>
  <FullCalendar.Toolbar>
    <FullCalendar.Nav />
    <FullCalendar.Title />
  </FullCalendar.Toolbar>
  <FullCalendar.View name="week"><TimeGrid class="flex-1" scrollToHour={8} /></FullCalendar.View>
  <EventDialog />
</FullCalendar.Root>
