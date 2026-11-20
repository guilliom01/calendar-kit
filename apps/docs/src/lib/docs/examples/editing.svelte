<script lang="ts">
  import { today } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { ChangeConfirmDialog, EventDialog } from "#lib/registry/ui/event-dialog/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { TimeGrid } from "#lib/registry/ui/time-grid/index.js";
  import { labels } from "./labels.js";
  import { sampleEvents } from "./sample-events.js";

  const timeZone = "America/Lima";

  // Editable is the default. Changes show at once; add onMutate to save them (see "Saving").
  const calendar = new CalendarState({
    editable: true,
    locale: "es-PE",
    timeZone,
    labels,
    events: sampleEvents(today(timeZone), timeZone),
  });
</script>

<FullCalendar.Root state={calendar}>
  <FullCalendar.Toolbar>
    <FullCalendar.NewEvent />
    <FullCalendar.Nav />
    <FullCalendar.Title />
    <FullCalendar.UndoRedo class="ms-auto" />
    <FullCalendar.ViewSwitcher />
  </FullCalendar.Toolbar>
  <FullCalendar.View name="month"><MonthView class="flex-1" /></FullCalendar.View>
  <FullCalendar.View name="week"><TimeGrid class="flex-1" /></FullCalendar.View>

  <!-- Click an event or an empty slot to open it; drag to move, drag an edge to resize. -->
  <EventDialog />
  <!-- Asks before saving a drag or resize, so a slip of the mouse changes nothing. -->
  <ChangeConfirmDialog />
</FullCalendar.Root>
