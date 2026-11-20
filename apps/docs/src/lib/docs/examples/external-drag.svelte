<script lang="ts">
  import { today } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { draggable } from "#lib/registry/lib/calendar-drag.js";
  import { TimeGrid } from "#lib/registry/ui/time-grid/index.js";

  const timeZone = "America/Lima";

  // Your own list, rendered your own way.
  let tasks = $state([
    { id: "call", title: "Call the supplier", duration: 30 },
    { id: "contract", title: "Review the contract", duration: 90 },
    { id: "report", title: "Prepare the report", duration: 60 },
  ]);

  const calendar = new CalendarState({
    editable: true,
    locale: "en-US",
    timeZone,
    view: "week",
    date: today(timeZone),
    // Decide what a drop creates. Here: take the task off the list, keep the default event.
    onExternalDrop: ({ item }) => {
      tasks = tasks.filter((task) => task.id !== (item.data as { id: string }).id);
    },
  });
</script>

<FullCalendar.Root state={calendar}>
  <FullCalendar.Toolbar>
    <FullCalendar.Nav />
    <FullCalendar.Title />
  </FullCalendar.Toolbar>
  <div class="flex min-h-0 flex-1 gap-4">
    <div class="grid w-48 shrink-0 content-start gap-2 text-sm">
      <p id="tasks-heading" class="font-medium">Unscheduled</p>
      <ul aria-labelledby="tasks-heading" class="grid gap-1">
        {#each tasks as task (task.id)}
          <!-- Drop it on the hours for a timed event, on a day for an all-day one. -->
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
    <div class="flex min-w-0 flex-1 flex-col">
      <FullCalendar.View name="week"><TimeGrid class="flex-1" scrollToHour={8} /></FullCalendar.View
      >
    </div>
  </div>
</FullCalendar.Root>
