<script lang="ts">
  import { today } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { TimeGrid } from "#lib/registry/ui/time-grid/index.js";
  import { TimelineView } from "#lib/registry/ui/timeline-view/index.js";
  import * as ContextMenu from "#lib/registry/ui/context-menu/index.js";
  import { EventContextMenu } from "#lib/registry/ui/event-context-menu/index.js";
  import { EventPreview } from "#lib/registry/ui/event-preview/index.js";
  import * as Exchange from "#lib/registry/ui/import-export/index.js";
  import { cn } from "#lib/utils.js";
  import { demoEvents, demoResources } from "../demo-events.js";
  import { spanishLabels } from "../demo-labels.js";

  const timeZone = "America/Lima";
  let message = $state("Los eventos son elementos propios; siguen arrastrándose y abriéndose.");

  const calendar = new CalendarState({
    locale: "es-PE",
    timeZone,
    labels: spanishLabels,
    events: demoEvents(today(timeZone), "es-PE", timeZone).filter(
      (event) => event.progress === undefined,
    ),
    onEventClick: (event) => {
      message = `Abriste: ${event.title}`;
      return false;
    },
  });

  const initials = (title: string) =>
    title
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2);
</script>

<svelte:head><title>Personalizar · calendar-kit</title></svelte:head>

<main class="mx-auto flex h-full max-w-6xl flex-col gap-4 p-4">
  <h1 class="text-2xl font-semibold">Personalizar con snippets</h1>
  <p class="rounded-lg border p-3 text-sm" aria-live="polite" data-testid="opened">
    {message}
  </p>

  <FullCalendar.Root state={calendar} class="flex-1">
    <FullCalendar.Toolbar>
      <FullCalendar.Nav />
      <FullCalendar.Title />
      <!-- A plain UTF-8 CSV, without the byte order mark Excel needs. -->
      <Exchange.ExportCsv class="ms-auto" bom={false} filename="eventos.csv" />
      <FullCalendar.ViewSwitcher />
    </FullCalendar.Toolbar>

    <EventContextMenu>
      <!-- Our own item next to the built-in ones. -->
      {#snippet extra({ event })}
        <ContextMenu.Item onSelect={() => (message = `Detalles: ${event.title}`)}>
          Ver detalles
        </ContextMenu.Item>
      {/snippet}
      <EventPreview>
        {#snippet content({ event })}
          Vista previa propia: {event.title}
        {/snippet}
        <FullCalendar.View name="month">
          <MonthView class="flex-1">
            <!-- Our own chip: a pill with a dot. `props` keeps drag, click, keyboard and ARIA; keep it a button so it stays focusable. -->
            {#snippet event({ event, props, dragging })}
              <button
                {...props}
                data-testid="custom-event"
                class={cn(
                  props.class,
                  "rounded-full border border-(--event-color)/40",
                  dragging && "ring-2",
                )}
              >
                <span class="size-1.5 shrink-0 rounded-full bg-(--event-color)"></span>
                <span class="truncate">{event.title}</span>
              </button>
            {/snippet}
            {#snippet dayCell({ events })}
              {#if events.some((event) => event.title === "Feriado")}
                <span
                  class="ms-1 text-xs"
                  role="img"
                  aria-label="Feriado"
                  data-testid="holiday-mark">🎉</span
                >
              {/if}
            {/snippet}
            {#snippet more({ count, props })}
              <button {...props} data-testid="custom-more">Ver {count} más</button>
            {/snippet}
          </MonthView>
        </FullCalendar.View>

        <FullCalendar.View name="week">
          <TimeGrid class="flex-1">
            {#snippet event({ event, props, resizeProps })}
              <button
                {...props}
                data-testid="custom-timed"
                class={cn(props.class, "rounded-lg border-s-0")}
              >
                <strong class="truncate">{event.title}</strong>
                {#if resizeProps.start}<span {...resizeProps.start}></span>{/if}
                {#if resizeProps.end}<span {...resizeProps.end} data-testid="custom-resize"
                  ></span>{/if}
              </button>
            {/snippet}
            {#snippet hourLabel({ hour })}
              {String(hour).padStart(2, "0")}:00
            {/snippet}
            {#snippet nowIndicator()}
              <div class="h-0.5 bg-primary" data-testid="custom-now"></div>
            {/snippet}
          </TimeGrid>
        </FullCalendar.View>

        <FullCalendar.View name="timeline">
          <TimelineView class="flex-1" resources={demoResources}>
            {#snippet resourceLabel({ title, hasChildren, collapsed, toggle })}
              <span class="flex items-center gap-2">
                <span
                  class="inline-flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold"
                  aria-hidden="true">{initials(title)}</span
                >
                {#if hasChildren}
                  <button
                    type="button"
                    class="underline"
                    aria-expanded={!collapsed}
                    onclick={toggle}>{title}</button
                  >
                {:else}
                  {title}
                {/if}
              </span>
            {/snippet}
          </TimelineView>
        </FullCalendar.View>
      </EventPreview>
    </EventContextMenu>
  </FullCalendar.Root>
</main>
