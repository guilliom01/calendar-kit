<script lang="ts">
  import { parseDate, today, toZoned } from "@internationalized/date";
  import type { CalendarEvent } from "@guilli/calendar-core";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { Button } from "#lib/registry/ui/button/index.js";

  const timeZone = "America/Lima";
  const day = today(timeZone);

  // <CalendarEvent>: otherwise TypeScript infers the type from the events below, and
  // create() would only accept events shaped exactly like them.
  const calendar = new CalendarState<CalendarEvent>({
    locale: "en-US",
    timeZone,
    // Read-only: nothing can be dragged, resized or deleted by the user.
    events: [
      // Timed events use ZonedDateTime...
      {
        id: "meeting",
        title: "Team meeting",
        start: toZoned(day, timeZone).set({ hour: 10 }),
        end: toZoned(day, timeZone).set({ hour: 11 }),
      },
      // ...all-day events use CalendarDate. `end` is exclusive: this one lasts 2 days.
      {
        id: "trip",
        title: "Trip to Cusco",
        start: day.add({ days: 2 }),
        end: day.add({ days: 4 }),
        color: "oklch(0.7 0.15 70)",
      },
    ],
  });

  const titles = ["Call", "Coffee", "Interview", "Class", "Demo"];
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

  // Your own form: any fields, any look. It only has to call the state.
  let showForm = $state(false);
  let title = $state("");
  let date = $state(day.toString());

  function addFromForm(submit: SubmitEvent) {
    submit.preventDefault();
    const start = parseDate(date);
    void calendar.create({
      id: `form-${++count}`,
      title: title.trim() || "Untitled",
      start,
      end: start.add({ days: 1 }),
    });
    title = "";
    showForm = false;
  }
</script>

<FullCalendar.Root state={calendar}>
  <FullCalendar.Toolbar>
    <FullCalendar.Nav />
    <FullCalendar.Title />
    <Button variant="outline" size="sm" class="ms-auto" onclick={addRandomEvent}>
      Add a random event
    </Button>
    <Button variant="outline" size="sm" onclick={() => (showForm = !showForm)}>
      Add with my own form
    </Button>
  </FullCalendar.Toolbar>
  {#if showForm}
    <form
      aria-label="My form"
      class="flex flex-wrap items-end gap-2 text-sm"
      onsubmit={addFromForm}
    >
      <label class="grid gap-1">
        Title
        <input class="h-8 rounded-md border bg-transparent px-2" bind:value={title} required />
      </label>
      <label class="grid gap-1">
        Date
        <input
          type="date"
          class="h-8 rounded-md border bg-transparent px-2"
          bind:value={date}
          required
        />
      </label>
      <Button type="submit" size="sm">Add</Button>
    </form>
  {/if}
  <FullCalendar.View name="month">
    <MonthView class="flex-1" />
  </FullCalendar.View>
</FullCalendar.Root>
