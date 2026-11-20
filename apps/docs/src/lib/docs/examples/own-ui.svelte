<script lang="ts">
  import { today } from "@internationalized/date";
  import type { CalendarEvent } from "@guilli/calendar-core";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState } from "#lib/registry/ui/full-calendar/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { TimeGrid } from "#lib/registry/ui/time-grid/index.js";
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

  // A question shown in our own bar; `ask` resolves with the answer the user clicks.
  type Question = { text: string; choices: [label: string, value: unknown][] };
  let question: (Question & { answer(value: unknown): void }) | null = $state(null);

  function ask<V>(text: string, choices: [label: string, value: V][]) {
    return new Promise<V>((resolve) => {
      question = {
        text,
        choices,
        answer: (value) => {
          question = null;
          resolve(value as V);
        },
      };
    });
  }

  // No EventDialog, ChangeConfirmDialog, RecurrenceScopeDialog, NewEvent or ViewSwitcher: the
  // hooks hand clicks, selections and questions to our UI, and we call the state ourselves.
  const calendar: CalendarState<CalendarEvent> = new CalendarState({
    editable: true,
    locale: "en-US",
    timeZone,
    // The standup repeats on the next five days, so changing one asks for the scope.
    events: sampleEvents(today(timeZone), timeZone).map((event) =>
      event.id === "standup" ? { ...event, rrule: "FREQ=DAILY;COUNT=5" } : event,
    ),
    onEventClick: (event) => {
      open(event, false);
      return false;
    },
    onSelect: ({ start, end }) => {
      open({ id: crypto.randomUUID(), title: "", start, end } as CalendarEvent, true);
      return false;
    },
    // Hooks may be async: a drag or resize waits for our answer before it is saved...
    onEventChange: ({ event }) =>
      ask(`Move "${event.title}" to ${calendar.describe(event)}?`, [
        ["Yes, change it", true],
        ["No", false],
      ]),
    // ...and so does a change to one occurrence of a repeating event.
    resolveScope: ({ occurrence }) =>
      ask(`"${occurrence.title}" repeats. What do you want to change?`, [
        ["Only this one", "this"],
        ["This and following", "following"],
        ["All", "all"],
        ["Cancel", null],
      ]),
  });

  function save(submit: SubmitEvent) {
    submit.preventDefault();
    if (!editing) return;
    const event = { ...editing, title: title.trim() || "Untitled" };
    void (isNew ? calendar.create(event) : calendar.update(event));
    editing = null;
  }

  function remove() {
    if (editing) void calendar.remove(editing.id);
    editing = null;
  }

  const views = [
    { name: "month", label: "Month" },
    { name: "week", label: "Week" },
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
      Go to today
    </button>
    <button
      type="button"
      class="rounded-md border px-3 py-1 text-sm"
      onclick={() => {
        const start = calendar.date;
        open({ id: crypto.randomUUID(), title: "", start, end: start.add({ days: 1 }) }, true);
      }}
    >
      New appointment
    </button>
    <FullCalendar.Title class="ms-2" />
  </div>

  <!-- Our own questions, asked by the async hooks above. -->
  {#if question}
    {@const current = question}
    <div
      role="alertdialog"
      aria-label="Question"
      class="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm"
    >
      <span>{current.text}</span>
      {#each current.choices as [label, value] (label)}
        <button
          type="button"
          class="rounded-md border px-3 py-1"
          onclick={() => current.answer(value)}
        >
          {label}
        </button>
      {/each}
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
        <p class="font-medium">{isNew ? "New appointment" : "Edit appointment"}</p>
        <label class="grid gap-1">
          Title
          <input class="rounded-md border bg-transparent px-2 py-1" bind:value={title} />
        </label>
        <p class="text-muted-foreground">{calendar.describe(editing)}</p>
        <div class="flex flex-wrap gap-2">
          <button
            type="submit"
            class="rounded-md border bg-primary px-3 py-1 text-primary-foreground">Save</button
          >
          <button type="button" class="rounded-md border px-3 py-1" onclick={() => (editing = null)}
            >Cancel</button
          >
          {#if !isNew}
            <button type="button" class="rounded-md border px-3 py-1" onclick={remove}
              >Delete</button
            >
          {/if}
        </div>
      </form>
    {/if}
  </div>
</FullCalendar.Root>
