<script lang="ts">
  import { getDayOfWeek, today } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { draggable } from "#lib/registry/lib/calendar-drag.js";
  import { EventDialog } from "#lib/registry/ui/event-dialog/index.js";
  import { demoEvents } from "#lib/docs/demo-events.js";
  import { spanishLabels } from "#lib/docs/demo-labels.js";

  const timeZone = "America/Lima";
  let message = $state("");

  // Our own rules on top of the built-in behavior.
  const calendar = new CalendarState({
    editable: true,
    locale: "es-PE",
    timeZone,
    labels: spanishLabels,
    events: demoEvents(today(timeZone), "es-PE", timeZone).filter(
      (event) => event.progress === undefined,
    ),
    // Holidays are fixed; the conference can be moved but not resized or deleted.
    isEditable: (event, action) =>
      event.id !== "holiday" && (event.id !== "conference" || action === "move"),
    // Fixed events are drawn dashed.
    eventClass: (event) => (event.id === "holiday" ? "border border-dashed" : undefined),
    // Nothing can be moved to a Sunday.
    onEventChange: ({ event }) => {
      const day = "hour" in event.start ? event.start : event.start;
      if (getDayOfWeek(day, "en-US", "sun") === 0) {
        message = "No se permiten eventos en domingo";
        return false;
      }
      message = `Movido: ${event.title}`;
    },
    // Our own reaction to "+N" instead of the built-in list.
    onMoreClick: (day, events) => {
      message = `Más eventos el ${day.toString()}: ${events.length}`;
      return false;
    },
    // Our own rule in the event dialog, next to the built-in ones.
    validate: (event) => (event.title.trim() ? undefined : { title: "El título es obligatorio." }),
    // Dropped items are only reported, never created. Hooks may be async.
    onExternalDrop: async ({ item, start }) => {
      message = `Soltaste «${item.title}» el ${start.toString()}`;
      return false;
    },
    // Our own reaction to a right-click instead of a menu.
    onEventContextMenu: (event, nativeEvent) => {
      nativeEvent.preventDefault();
      message = `Menú propio para: ${event.title}`;
      return false;
    },
    // Show the picked day instead of opening a dialog.
    onSelect: ({ start }) => {
      message = `Selección: ${start.toString()}`;
      return false;
    },
  });
</script>

<svelte:head><title>Ganchos de interacción · calendar-kit</title></svelte:head>

<main class="mx-auto flex h-full max-w-5xl flex-col gap-4 p-4">
  <h1 class="text-2xl font-semibold">Ganchos de interacción</h1>
  <!-- A filter of our own: `calendar.filter` applies to every view. -->
  <label class="flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      onchange={(change) =>
        (calendar.filter = change.currentTarget.checked
          ? (event) => !!event.resourceIds?.includes("ana")
          : null)}
    />
    Solo eventos de Ana
  </label>
  <p
    class="w-fit cursor-grab rounded-md border px-2 py-1.5 text-sm select-none"
    {@attach draggable(calendar, { title: "Tarea sin fecha" })}
  >
    Tarea sin fecha
  </p>
  <p class="rounded-lg border p-3 text-sm" aria-live="polite" data-testid="message">
    {message || "Arrastra un evento o haz clic en un día vacío."}
  </p>
  <FullCalendar.Root state={calendar} class="flex-1">
    <FullCalendar.Toolbar>
      <FullCalendar.Nav />
      <FullCalendar.Title />
    </FullCalendar.Toolbar>
    <FullCalendar.View name="month"><MonthView class="flex-1" /></FullCalendar.View>
    <EventDialog />
  </FullCalendar.Root>
</main>
