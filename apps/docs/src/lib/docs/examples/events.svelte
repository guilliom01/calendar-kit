<script lang="ts">
  import { today, toZoned } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { Button } from "#lib/registry/ui/button/index.js";

  const timeZone = "America/Lima";
  const day = today(timeZone);

  const calendar = new CalendarState({
    locale: "es-PE",
    timeZone,
    // Read-only: nothing can be dragged, resized or deleted by the user.
    editable: false,
    events: [
      // Timed events use ZonedDateTime...
      {
        id: "meeting",
        title: "Reunión de equipo",
        start: toZoned(day, timeZone).set({ hour: 10 }),
        end: toZoned(day, timeZone).set({ hour: 11 }),
      },
      // ...all-day events use CalendarDate. `end` is exclusive: this one lasts 2 days.
      {
        id: "trip",
        title: "Viaje a Cusco",
        start: day.add({ days: 2 }),
        end: day.add({ days: 4 }),
        color: "oklch(0.7 0.15 70)",
      },
    ],
  });

  const titles = ["Llamada", "Café", "Entrevista", "Clase", "Demo"];
  let count = 0;

  // The state is yours to change from your own UI, editable or not.
  function addRandomEvent() {
    const start = toZoned(day.set({ day: 1 + Math.floor(Math.random() * 28) }), timeZone).set({
      hour: 8 + Math.floor(Math.random() * 9),
    });
    void calendar.create({
      id: `random-${++count}`,
      title: titles[count % titles.length]!,
      start,
      end: start.add({ hours: 1 }),
    });
  }
</script>

<FullCalendar.Root state={calendar}>
  <FullCalendar.Toolbar>
    <FullCalendar.Nav />
    <FullCalendar.Title />
    <Button variant="outline" size="sm" class="ms-auto" onclick={addRandomEvent}>
      Agregar evento aleatorio
    </Button>
  </FullCalendar.Toolbar>
  <FullCalendar.View name="month">
    <MonthView class="flex-1" />
  </FullCalendar.View>
</FullCalendar.Root>
