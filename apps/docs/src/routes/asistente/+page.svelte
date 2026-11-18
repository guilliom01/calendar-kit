<script lang="ts">
  import { today } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { EventDialog } from "#lib/registry/ui/event-dialog/index.js";
  import { SchedulingAssistant } from "#lib/registry/ui/scheduling-assistant/index.js";
  import { TimeGrid } from "#lib/registry/ui/time-grid/index.js";
  import { demoEvents, demoResources } from "../demo-events.js";
  import { spanishLabels } from "../demo-labels.js";

  const timeZone = "America/Lima";

  const calendar = new CalendarState({
    locale: "es-PE",
    timeZone,
    view: "resources",
    labels: spanishLabels,
    events: demoEvents(today(timeZone), "es-PE", timeZone),
  });
</script>

<svelte:head><title>Asistente de programación · calendar-kit</title></svelte:head>

<main class="mx-auto flex h-full max-w-6xl flex-col gap-4 p-4">
  <h1 class="text-2xl font-semibold">Asistente de programación</h1>

  <FullCalendar.Root state={calendar} class="flex-1">
    <div class="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
      <SchedulingAssistant class="shrink-0 md:w-72" resources={demoResources} />
      <div class="flex min-h-[32rem] min-w-0 flex-1 flex-col gap-3 md:min-h-0">
        <FullCalendar.Toolbar>
          <FullCalendar.Nav />
          <FullCalendar.Title />
        </FullCalendar.Toolbar>
        <!-- Who is busy when, to compare with the suggestions. -->
        <FullCalendar.View name="resources">
          <TimeGrid class="flex-1" resources={demoResources} />
        </FullCalendar.View>
      </div>
    </div>
    <EventDialog resources={demoResources} />
  </FullCalendar.Root>
</main>
