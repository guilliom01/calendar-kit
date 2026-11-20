<script lang="ts">
  import { today, toZoned } from "@internationalized/date";
  import type { Resource } from "@guilli/calendar-core";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { EventDialog } from "#lib/registry/ui/event-dialog/index.js";
  import { EventPreview } from "#lib/registry/ui/event-preview/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { TimeGrid } from "#lib/registry/ui/time-grid/index.js";
  import { TimelineView } from "#lib/registry/ui/timeline-view/index.js";
  import { cn } from "#lib/utils.js";
  import { sampleEvents } from "./sample-events.js";

  const timeZone = "America/Lima";
  const resources: Resource[] = [
    { id: "team", title: "Team" },
    { id: "ana", title: "Ana", parentId: "team" },
    { id: "luis", title: "Luis", parentId: "team" },
  ];
  // Four short meetings on the first day of the trip, so that day shows "+N" in the month.
  const busyDay = toZoned(today(timeZone).add({ days: 3 }), timeZone);
  const meetings = ["Planning", "Retro", "One on one", "Coffee"].map((title, index) => ({
    id: `meeting-${index}`,
    title,
    start: busyDay.set({ hour: 14 + index }),
    end: busyDay.set({ hour: 14 + index, minute: 45 }),
    resourceIds: [index % 2 ? "luis" : "ana"],
  }));

  const calendar = new CalendarState({
    editable: true,
    locale: "en-US",
    timeZone,
    events: [...sampleEvents(today(timeZone), timeZone), ...meetings],
  });

  const initials = (title: string) =>
    title
      .split(" ")
      .map((word) => word[0])
      .join("");
</script>

<FullCalendar.Root state={calendar}>
  <FullCalendar.Toolbar>
    <FullCalendar.Nav />
    <FullCalendar.Title />
    <FullCalendar.ViewSwitcher class="ms-auto" />
  </FullCalendar.Toolbar>
  <!-- `content` replaces what the preview card shows. -->
  <EventPreview>
    {#snippet content({ event })}
      Our own preview: {event.title}
    {/snippet}
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
            <span class="ms-1 text-xs text-muted-foreground">weekend</span>
          {/if}
        {/snippet}
        <!-- The "+N" button of a full day; `props` keeps the built-in list. -->
        {#snippet more({ count, props })}
          <button {...props}>See {count} more</button>
        {/snippet}
      </MonthView>
    </FullCalendar.View>

    <FullCalendar.View name="week">
      <TimeGrid class="flex-1" scrollToHour={8}>
        {#snippet event({ event, props, resizeProps })}
          <button {...props} class={cn(props.class, "rounded-lg border-s-0")}>
            <strong class="truncate">{event.title}</strong>
            {#if resizeProps.start}<span {...resizeProps.start}></span>{/if}
            {#if resizeProps.end}<span {...resizeProps.end} data-testid="resize-end"></span>{/if}
          </button>
        {/snippet}
        {#snippet hourLabel({ hour })}
          {String(hour).padStart(2, "0")}:00
        {/snippet}
        {#snippet nowIndicator()}
          <div class="h-0.5 bg-primary" data-testid="now"></div>
        {/snippet}
      </TimeGrid>
    </FullCalendar.View>

    <FullCalendar.View name="timeline">
      <TimelineView class="flex-1" {resources}>
        <!-- Your own row labels; call `toggle` to collapse a group. -->
        {#snippet resourceLabel({ title, hasChildren, collapsed, toggle })}
          <span class="flex items-center gap-2">
            <span
              class="inline-flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold"
              aria-hidden="true">{initials(title)}</span
            >
            {#if hasChildren}
              <button type="button" class="underline" aria-expanded={!collapsed} onclick={toggle}
                >{title}</button
              >
            {:else}
              {title}
            {/if}
          </span>
        {/snippet}
      </TimelineView>
    </FullCalendar.View>
  </EventPreview>
  <EventDialog />
</FullCalendar.Root>
