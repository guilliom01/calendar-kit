<script lang="ts">
  import { today } from "@internationalized/date";
  import { ConflictError } from "@calendar-kit/core";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { AgendaView } from "#lib/registry/ui/agenda-view/index.js";
  import { CalendarList } from "#lib/registry/ui/calendar-list/index.js";
  import { CalendarSearch } from "#lib/registry/ui/calendar-search/index.js";
  import { EventContextMenu } from "#lib/registry/ui/event-context-menu/index.js";
  import { EventPreview } from "#lib/registry/ui/event-preview/index.js";
  import { MiniCalendar } from "#lib/registry/ui/mini-calendar/index.js";
  import { draggable } from "#lib/registry/lib/calendar-drag.js";
  import {
    ChangeConfirmDialog,
    EventDialog,
    RecurrenceScopeDialog,
  } from "#lib/registry/ui/event-dialog/index.js";
  import { GanttView } from "#lib/registry/ui/gantt-view/index.js";
  import * as Exchange from "#lib/registry/ui/import-export/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { RecurrenceEditor } from "#lib/registry/ui/recurrence-editor/index.js";
  import { TimeGrid } from "#lib/registry/ui/time-grid/index.js";
  import { TimelineView } from "#lib/registry/ui/timeline-view/index.js";
  import { YearView } from "#lib/registry/ui/year-view/index.js";
  import { demoCalendars, demoEvents, demoResources } from "./demo-events.js";
  import { spanishLabels } from "./demo-labels.js";

  const locale = "es-PE";
  const timeZone = "America/Lima";

  let importWarnings: string[] = $state([]);
  let notice = $state("");
  // Tasks without a date; dragging one onto the calendar schedules it.
  let pending = $state([
    { id: "call", title: "Llamar al proveedor", duration: 60 },
    { id: "contract", title: "Revisar contrato", duration: 120 },
  ]);

  const calendar = new CalendarState({
    locale,
    timeZone,
    events: demoEvents(today(timeZone), locale, timeZone),
    calendars: demoCalendars,
    // The dropped task leaves the list; the calendar creates the event as usual.
    onExternalDrop: ({ item }) => {
      pending = pending.filter((task) => task.id !== (item.data as { id: string }).id);
    },
    // Simulates a backend call: changes show at once and "save" a moment later. Titles with
    // "conflicto" get the answer of a server where someone else changed the event first.
    onMutate: (mutation) =>
      new Promise((resolve, reject) =>
        setTimeout(() => {
          if (mutation.type === "update" && /conflicto/i.test(mutation.after.title)) {
            const title = `${mutation.before.title} (versión del servidor)`;
            reject(new ConflictError({ ...mutation.before, title }));
          } else resolve(undefined);
        }, 300),
      ),
    onConflict: (mutation, current) => {
      const title = mutation.type === "update" ? mutation.before.title : mutation.event.title;
      notice = current
        ? `Otra persona cambió «${title}» mientras lo editabas: se muestra su versión.`
        : `Otra persona eliminó «${title}».`;
    },
    labels: spanishLabels,
  });
</script>

<svelte:head><title>Calendario completo · calendar-kit</title></svelte:head>

<main class="mx-auto flex h-full max-w-6xl flex-col gap-4 p-4">
  <h1 class="text-2xl font-semibold">Calendario completo</h1>

  <!-- Every block composed together. Each one is optional: keep only what you need. -->
  <FullCalendar.Root state={calendar} class="flex-1">
    <FullCalendar.Toolbar>
      <FullCalendar.NewEvent />
      <FullCalendar.Nav />
      <FullCalendar.Title />
      <FullCalendar.Loading />
      <CalendarSearch class="w-48" />
      <div class="ms-auto flex flex-wrap items-center gap-2">
        <Exchange.ImportIcs onImport={({ warnings }) => (importWarnings = warnings)} />
        <Exchange.ExportIcs filename="calendario.ics" name="calendar-kit" />
        <Exchange.ExportCsv filename="calendario.csv" />
        <Exchange.ExportXlsx filename="calendario.xlsx" sheetName="Eventos" />
        <Exchange.Print />
        <FullCalendar.TimeZoneSelect />
        <FullCalendar.UndoRedo />
        <FullCalendar.ViewSwitcher />
      </div>
    </FullCalendar.Toolbar>
    <p role="status" class="text-sm empty:hidden">{notice}</p>
    {#if importWarnings.length}
      <ul class="rounded-lg border p-3 text-sm text-muted-foreground" data-testid="import-warnings">
        {#each importWarnings as warning (warning)}<li>{warning}</li>{/each}
      </ul>
    {/if}

    <div class="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
      <aside class="order-last flex shrink-0 flex-col gap-6 md:order-none md:w-56 print:hidden">
        <MiniCalendar />
        <CalendarList />
        <div class="grid gap-2 text-sm">
          <p id="pending-heading" class="font-medium">Pendientes</p>
          <ul aria-labelledby="pending-heading" class="grid gap-1">
            {#each pending as task (task.id)}
              <li
                class="cursor-grab rounded-md border px-2 py-1.5 select-none"
                {@attach draggable(calendar, {
                  title: task.title,
                  duration: task.duration,
                  data: task,
                })}
              >
                {task.title}
              </li>
            {/each}
          </ul>
        </div>
      </aside>
      <EventContextMenu class="min-h-[32rem] min-w-0 md:min-h-0">
        <EventPreview>
          <FullCalendar.View name="month"><MonthView class="flex-1" /></FullCalendar.View>
          <FullCalendar.View name="week"><TimeGrid class="flex-1" /></FullCalendar.View>
          <FullCalendar.View name="day"><TimeGrid class="flex-1" /></FullCalendar.View>
          <FullCalendar.View name="agenda"
            ><AgendaView class="flex-1" resources={demoResources} /></FullCalendar.View
          >
          <FullCalendar.View name="year"><YearView class="flex-1" /></FullCalendar.View>
          <FullCalendar.View name="timeline">
            <TimelineView class="flex-1" resources={demoResources} />
          </FullCalendar.View>
          <FullCalendar.View name="resources">
            <TimeGrid class="flex-1" resources={demoResources} />
          </FullCalendar.View>
          <FullCalendar.View name="gantt"><GanttView class="flex-1" /></FullCalendar.View>
        </EventPreview>
      </EventContextMenu>
    </div>

    <EventDialog resources={demoResources}>
      {#snippet recurrence({ value, setValue, start })}
        <RecurrenceEditor {value} onchange={setValue} {start} />
      {/snippet}
    </EventDialog>
    <RecurrenceScopeDialog />
    <ChangeConfirmDialog />
  </FullCalendar.Root>
</main>
