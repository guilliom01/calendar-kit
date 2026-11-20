<script lang="ts">
  import { today } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { cn } from "#lib/utils.js";
  import { labels } from "./labels.js";
  import { sampleEvents } from "./sample-events.js";

  const timeZone = "America/Lima";

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
    <FullCalendar.Nav />
    <FullCalendar.Title />
  </FullCalendar.Toolbar>
  <FullCalendar.View name="month">
    <MonthView class="flex-1">
      <!-- Your own element for each event. Spreading `props` keeps clicks, dragging,
           the keyboard and ARIA; keep it a button so it stays focusable. -->
      {#snippet event({ event, props, resizeProps, dragging })}
        <button
          {...props}
          class={cn(
            props.class,
            "rounded-full border border-(--event-color)/40",
            dragging && "ring-2",
          )}
        >
          <span class="size-1.5 shrink-0 rounded-full bg-(--event-color)"></span>
          <span class="truncate">{event.title}</span>
          {#if resizeProps.end}<span {...resizeProps.end}></span>{/if}
        </button>
      {/snippet}
      <!-- Extra content in each day: here, a mark on weekends. -->
      {#snippet dayCell({ day })}
        {#if day.toDate(timeZone).getDay() % 6 === 0}
          <span class="ms-1 text-xs text-muted-foreground">fin de semana</span>
        {/if}
      {/snippet}
    </MonthView>
  </FullCalendar.View>
</FullCalendar.Root>
