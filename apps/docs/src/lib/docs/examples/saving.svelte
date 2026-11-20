<script lang="ts">
  import { today } from "@internationalized/date";
  import { ConflictError, type CalendarEvent, type Mutation } from "@guilli/calendar-core";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { EventDialog } from "#lib/registry/ui/event-dialog/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { labels } from "./labels.js";
  import { sampleEvents } from "./sample-events.js";

  const timeZone = "America/Lima";
  let backend: "ok" | "error" | "conflict" = $state("ok");
  let message = $state("Edita un evento y guárdalo.");

  // Your API call. Changes are already on screen; return the saved event, or throw.
  async function save(mutation: Mutation<CalendarEvent>) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (backend === "error") throw new Error("Network error");
    if (backend === "conflict" && mutation.type === "update") {
      // Someone else changed it first: send back the server's version.
      throw new ConflictError({
        ...mutation.before,
        title: `${mutation.before.title} (otra persona)`,
      });
    }
    message = `Guardado: ${mutation.type}`;
  }

  const calendar = new CalendarState({
    editable: true,
    locale: "es-PE",
    timeZone,
    labels,
    events: sampleEvents(today(timeZone), timeZone),
    onMutate: save,
    // The change was rolled back already; tell the user.
    onError: () => (message = "No se pudo guardar: se deshizo el cambio."),
    // The server's version is on screen already; tell the user.
    onConflict: () => (message = "Otra persona lo cambió antes: se muestra su versión."),
  });
</script>

<div class="mb-2 flex flex-wrap items-center gap-4 text-sm">
  <label class="flex items-center gap-2">
    Servidor
    <select class="h-8 rounded-md border bg-transparent px-2" bind:value={backend}>
      <option value="ok">responde bien</option>
      <option value="error">falla</option>
      <option value="conflict">tiene otra versión</option>
    </select>
  </label>
  <p role="status">{message}</p>
</div>
<FullCalendar.Root state={calendar}>
  <FullCalendar.Toolbar>
    <FullCalendar.Nav />
    <FullCalendar.Title />
    <FullCalendar.UndoRedo class="ms-auto" />
  </FullCalendar.Toolbar>
  <FullCalendar.View name="month"><MonthView class="flex-1" /></FullCalendar.View>
  <EventDialog />
</FullCalendar.Root>
