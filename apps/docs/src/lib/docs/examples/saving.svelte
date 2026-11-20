<script lang="ts">
  import { today } from "@internationalized/date";
  import { ConflictError, type CalendarEvent, type Mutation } from "@guilli/calendar-core";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { EventDialog } from "#lib/registry/ui/event-dialog/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { sampleEvents } from "./sample-events.js";

  const timeZone = "America/Lima";
  let backend: "ok" | "error" | "conflict" = $state("ok");
  let message = $state("Edit an event and save it.");

  // Your API call. Changes are already on screen; return the saved event, or throw.
  async function save(mutation: Mutation<CalendarEvent>) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (backend === "error") throw new Error("Network error");
    if (backend === "conflict" && mutation.type === "update") {
      // Someone else changed it first: send back the server's version.
      throw new ConflictError({
        ...mutation.before,
        title: `${mutation.before.title} (someone else)`,
      });
    }
    message = `Saved: ${mutation.type}`;
  }

  const calendar = new CalendarState({
    editable: true,
    locale: "en-US",
    timeZone,
    events: sampleEvents(today(timeZone), timeZone),
    onMutate: save,
    // The change was rolled back already; tell the user.
    onError: () => (message = "Could not save: the change was undone."),
    // The server's version is on screen already; tell the user.
    onConflict: () => (message = "Someone else changed it first: showing their version."),
  });
</script>

<div class="mb-2 flex flex-wrap items-center gap-4 text-sm">
  <label class="flex items-center gap-2">
    Server
    <select class="h-8 rounded-md border bg-transparent px-2" bind:value={backend}>
      <option value="ok">responds fine</option>
      <option value="error">fails</option>
      <option value="conflict">has another version</option>
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
