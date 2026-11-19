<script lang="ts">
  import { today } from "@internationalized/date";
  import type { CalendarEvent } from "@guilli/calendar-core";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { TimeGrid } from "#lib/registry/ui/time-grid/index.js";
  import { labels } from "./labels.js";
  import { sampleEvents } from "./sample-events.js";

  const timeZone = "America/Lima";

  // What our own panel is editing, and whether it is a new event.
  let editing: CalendarEvent | null = $state(null);
  let isNew = $state(false);
  let title = $state("");

  function open(event: CalendarEvent, created: boolean) {
    editing = event;
    isNew = created;
    title = event.title;
  }

  // No EventDialog, ChangeConfirmDialog, NewEvent or ViewSwitcher: the hooks hand
  // clicks and selections to our UI, and we call the state ourselves.
  const calendar = new CalendarState({
    locale: "es-PE",
    timeZone,
    labels,
    events: sampleEvents(today(timeZone), timeZone),
    onEventClick: (event) => {
      open(event, false);
      return false;
    },
    onSelect: ({ start, end }) => {
      open({ id: crypto.randomUUID(), title: "", start, end } as CalendarEvent, true);
      return false;
    },
  });

  // While this runs, drags and resizes wait in `changeRequest` for our answer.
  $effect(() => calendar.registerConfirmDialog());

  function save(submit: SubmitEvent) {
    submit.preventDefault();
    if (!editing) return;
    const event = { ...editing, title: title.trim() || "Sin título" };
    void (isNew ? calendar.create(event) : calendar.update(event));
    editing = null;
  }

  function remove() {
    if (editing) void calendar.remove(editing.id);
    editing = null;
  }

  const views = [
    { name: "month", label: "Mes" },
    { name: "week", label: "Semana" },
  ];
</script>

<FullCalendar.Root state={calendar}>
  <div class="flex flex-wrap items-center gap-2">
    <!-- Our own buttons: the view and the date are plain fields of the state. -->
    {#each views as view (view.name)}
      <button
        type="button"
        class="rounded-md border px-3 py-1 text-sm aria-pressed:bg-muted"
        aria-pressed={calendar.view === view.name}
        onclick={() => (calendar.view = view.name)}
      >
        {view.label}
      </button>
    {/each}
    <button
      type="button"
      class="rounded-md border px-3 py-1 text-sm"
      onclick={() => calendar.goToday()}
    >
      Ir a hoy
    </button>
    <button
      type="button"
      class="rounded-md border px-3 py-1 text-sm"
      onclick={() => {
        const start = calendar.date;
        open({ id: crypto.randomUUID(), title: "", start, end: start.add({ days: 1 }) }, true);
      }}
    >
      Nueva cita
    </button>
    <FullCalendar.Title class="ms-2" />
  </div>

  <!-- Our own confirmation for a drag or resize. -->
  {#if calendar.changeRequest}
    {@const change = calendar.changeRequest}
    <div
      role="alertdialog"
      aria-label="Confirmar cambio"
      class="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm"
    >
      <span>¿Pasar «{change.event.title}» a {calendar.describe(change.event)}?</span>
      <button
        type="button"
        class="rounded-md border px-3 py-1"
        onclick={() => calendar.confirmChange(true)}
      >
        Sí, cambiar
      </button>
      <button
        type="button"
        class="rounded-md border px-3 py-1"
        onclick={() => calendar.confirmChange(false)}
      >
        No
      </button>
    </div>
  {/if}

  <div class="flex min-h-0 flex-1 gap-4">
    <div class="flex min-w-0 flex-1 flex-col">
      <FullCalendar.View name="month"><MonthView class="flex-1" /></FullCalendar.View>
      <FullCalendar.View name="week"><TimeGrid class="flex-1" scrollToHour={8} /></FullCalendar.View
      >
    </div>

    <!-- Our own editor: any markup and any fields you need. -->
    {#if editing}
      <form
        class="grid w-60 shrink-0 content-start gap-3 rounded-md border p-3 text-sm"
        onsubmit={save}
      >
        <p class="font-medium">{isNew ? "Nueva cita" : "Editar cita"}</p>
        <label class="grid gap-1">
          Título
          <input class="rounded-md border bg-transparent px-2 py-1" bind:value={title} />
        </label>
        <p class="text-muted-foreground">{calendar.describe(editing)}</p>
        <div class="flex flex-wrap gap-2">
          <button
            type="submit"
            class="rounded-md border bg-primary px-3 py-1 text-primary-foreground">Guardar</button
          >
          <button type="button" class="rounded-md border px-3 py-1" onclick={() => (editing = null)}
            >Cancelar</button
          >
          {#if !isNew}
            <button type="button" class="rounded-md border px-3 py-1" onclick={remove}
              >Eliminar</button
            >
          {/if}
        </div>
      </form>
    {/if}
  </div>
</FullCalendar.Root>
