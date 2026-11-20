<script lang="ts">
  import { today } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { AgendaView } from "#lib/registry/ui/agenda-view/index.js";
  import { CalendarSearch } from "#lib/registry/ui/calendar-search/index.js";
  import { labels } from "./labels.js";
  import { sampleEvents } from "./sample-events.js";

  const timeZone = "America/Lima";

  const calendar = new CalendarState({
    locale: "es-PE",
    timeZone,
    labels,
    view: "agenda",
    events: sampleEvents(today(timeZone), timeZone),
  });
</script>

<FullCalendar.Root state={calendar}>
  <FullCalendar.Toolbar>
    <FullCalendar.Nav />
    <FullCalendar.Title />
    <!-- Every view shows only events whose title, place or notes have every word typed. -->
    <CalendarSearch class="ms-auto w-56" />
    <label class="flex items-center gap-2 text-sm">
      <!-- A filter of your own: any rule over your events; null shows them all. -->
      <input
        type="checkbox"
        onchange={(change) =>
          (calendar.filter = change.currentTarget.checked
            ? (event) => "hour" in event.start
            : null)}
      />
      Solo con hora
    </label>
  </FullCalendar.Toolbar>
  <FullCalendar.View name="agenda"><AgendaView class="flex-1" /></FullCalendar.View>
</FullCalendar.Root>
