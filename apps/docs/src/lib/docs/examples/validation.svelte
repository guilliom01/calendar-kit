<script lang="ts">
  import { today } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { EventDialog } from "#lib/registry/ui/event-dialog/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { labels } from "./labels.js";
  import { sampleEvents } from "./sample-events.js";

  const timeZone = "America/Lima";

  const calendar = new CalendarState({
    editable: true,
    locale: "es-PE",
    timeZone,
    labels,
    events: sampleEvents(today(timeZone), timeZone),
    // Your rules for the dialog: messages by field, or any other key for a general one.
    // Nothing is saved while one is returned. The end-after-start check is built in.
    validate: (event) => {
      const errors: Record<string, string> = {};
      if (!event.title.trim()) errors.title = "El título es obligatorio.";
      if (event.title.length > 60) errors.title = "Máximo 60 caracteres.";
      return errors;
    },
  });
</script>

<FullCalendar.Root state={calendar}>
  <FullCalendar.Toolbar>
    <FullCalendar.NewEvent />
    <FullCalendar.Nav />
    <FullCalendar.Title />
  </FullCalendar.Toolbar>
  <FullCalendar.View name="month"><MonthView class="flex-1" /></FullCalendar.View>
  <EventDialog />
</FullCalendar.Root>
