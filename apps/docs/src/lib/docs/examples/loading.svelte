<script lang="ts">
  import { toZoned, type CalendarDate } from "@internationalized/date";
  import type { CalendarEvent, DateRange } from "@guilli/calendar-core";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { labels } from "./labels.js";

  const timeZone = "America/Lima";
  let requests: string[] = $state([]);

  // Your backend call. Here it is simulated: one event per week of the month, after 400 ms.
  async function loadEvents({ start }: DateRange): Promise<CalendarEvent[]> {
    requests.push(start.toString().slice(0, 7));
    await new Promise((resolve) => setTimeout(resolve, 400));
    const events: CalendarEvent[] = [];
    for (let day: CalendarDate = start; day.month === start.month; day = day.add({ weeks: 1 })) {
      const at = toZoned(day, timeZone).set({ hour: 10 });
      events.push({
        id: `remote-${day}`,
        title: "Evento remoto",
        start: at,
        end: at.add({ hours: 1 }),
      });
    }
    return events;
  }

  // Months are requested once each, as the user navigates, plus `preload` months around them.
  const calendar = new CalendarState({ locale: "es-PE", timeZone, labels, loadEvents, preload: 1 });
</script>

<p class="mb-2 text-sm text-muted-foreground" aria-live="polite">
  Meses pedidos: {requests.join(", ")}
</p>
<FullCalendar.Root state={calendar}>
  <FullCalendar.Toolbar>
    <FullCalendar.Nav />
    <FullCalendar.Title />
    <FullCalendar.Loading />
  </FullCalendar.Toolbar>
  <FullCalendar.View name="month"><MonthView class="flex-1" /></FullCalendar.View>
</FullCalendar.Root>
