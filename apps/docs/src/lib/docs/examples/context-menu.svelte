<script lang="ts">
  import { today } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import * as ContextMenu from "#lib/registry/ui/context-menu/index.js";
  import { EventContextMenu } from "#lib/registry/ui/event-context-menu/index.js";
  import { EventDialog } from "#lib/registry/ui/event-dialog/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { labels } from "./labels.js";
  import { sampleEvents } from "./sample-events.js";

  const timeZone = "America/Lima";
  let message = $state("Haz clic derecho (o Shift+F10) sobre un evento.");

  const calendar = new CalendarState({
    editable: true,
    locale: "es-PE",
    timeZone,
    labels,
    events: sampleEvents(today(timeZone), timeZone),
  });
</script>

<p class="mb-2 text-sm" aria-live="polite">{message}</p>
<FullCalendar.Root state={calendar}>
  <FullCalendar.Toolbar>
    <FullCalendar.Nav />
    <FullCalendar.Title />
  </FullCalendar.Toolbar>
  <!-- Wrap the views: Open, Duplicate and Delete come built in. -->
  <EventContextMenu>
    <!-- `extra` adds your own items; `menu` would replace them all. -->
    {#snippet extra({ event })}
      <ContextMenu.Item onSelect={() => (message = `Compartiste «${event.title}».`)}>
        Compartir
      </ContextMenu.Item>
    {/snippet}
    <FullCalendar.View name="month"><MonthView class="flex-1" /></FullCalendar.View>
  </EventContextMenu>
  <EventDialog />
</FullCalendar.Root>
