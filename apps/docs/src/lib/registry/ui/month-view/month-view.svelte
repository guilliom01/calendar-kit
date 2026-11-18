<script lang="ts">
  import { DateFormatter, isSameMonth, isToday, type CalendarDate } from "@internationalized/date";
  import { isAllDay, layoutWeekRow, monthGrid, type CalendarEvent } from "@guilli/calendar-core";
  import { tick, type Snippet } from "svelte";
  import {
    dragAcrossDays,
    touchOf,
    withPreview,
    barResizeHandles,
  } from "#lib/registry/lib/calendar-drag.js";
  import * as Popover from "#lib/registry/ui/popover/index.js";
  import {
    dayGridKey,
    dayStepper,
    contextMenuKey,
    keyboardMove,
  } from "#lib/registry/lib/calendar-keyboard.js";
  import {
    getCalendar,
    pluralLabel,
    type DaySnippetArgs,
    type EventSnippetArgs,
    type PartProps,
  } from "#lib/registry/lib/calendar-state.svelte.js";
  import { cn } from "#lib/utils.js";

  interface Props {
    class?: string;
    /** Event lanes shown per week before collapsing the rest into "+N". */
    maxLanes?: number;
    /**
     * Compact layout for phones: colored dots per day, and the tapped day's events listed below.
     * `auto` (default) uses it while the view is narrower than 40rem.
     */
    compact?: boolean | "auto";
    /** Custom content inside each event chip (the chip itself stays). */
    eventContent?: Snippet<[CalendarEvent]>;
    /** Replaces the whole event chip. Spread `props` on your element to keep dragging, clicks and ARIA. */
    event?: Snippet<[EventSnippetArgs]>;
    /** Replaces the day number button. Spread `props` to keep opening the day. */
    dayNumber?: Snippet<[DaySnippetArgs & { inMonth: boolean }]>;
    /** Extra content inside each day cell, under the day number (e.g. an icon or a count). */
    dayCell?: Snippet<
      [{ day: CalendarDate; isToday: boolean; inMonth: boolean; events: CalendarEvent[] }]
    >;
    /** Replaces the "+N" button. Spread `props` to keep opening the day's list. */
    more?: Snippet<
      [{ day: CalendarDate; count: number; events: CalendarEvent[]; props: PartProps }]
    >;
  }

  let {
    class: className,
    maxLanes = 3,
    compact = "auto",
    eventContent,
    event: eventSnippet,
    dayNumber,
    dayCell,
    more,
  }: Props = $props();

  const calendar = getCalendar();

  // Event being dragged, at its preview position.
  let preview: CalendarEvent | null = $state.raw(null);

  const events = $derived(withPreview(calendar.visibleEvents, preview));
  const weeks = $derived(
    monthGrid(calendar.date, calendar.weekOptions).map((days) => ({
      days,
      items: layoutWeekRow(events, days, calendar.timeZone),
    })),
  );

  const formatter = (options: Intl.DateTimeFormatOptions) =>
    new DateFormatter(calendar.locale, { ...options, timeZone: calendar.timeZone });
  const weekday = $derived(formatter({ weekday: "short" }));
  const time = $derived(formatter({ hour: "numeric", minute: "2-digit" }));
  const fullDate = $derived(formatter({ dateStyle: "full" }));

  let width = $state(0);
  const isCompact = $derived(compact === "auto" ? width > 0 && width < 640 : compact);
  /** Day whose events the compact layout lists; by default the calendar's date. */
  let pickedDay: CalendarDate | null = $state(null);
  const listedDay = $derived(
    pickedDay && isSameMonth(pickedDay, calendar.date) ? pickedDay : calendar.date,
  );

  /** Events shown on `day`, in lane order. */
  function eventsOf(day: CalendarDate) {
    for (const week of weeks) {
      const index = week.days.findIndex((candidate) => candidate.compare(day) === 0);
      if (index !== -1) return eventsOnDay(week.items, index);
    }
    return [];
  }

  /** Day whose "+N" list is open. */
  let openDay: string | null = $state(null);

  function setOpen(key: string, open: boolean, day: CalendarDate, events: CalendarEvent[]) {
    if (!open) {
      if (openDay === key) openDay = null;
    } else if (calendar.clickMore(day, events)) openDay = key;
  }

  /** Every event shown on a day of the week row, hidden or not, in lane order. */
  function eventsOnDay(items: (typeof weeks)[number]["items"], dayIndex: number) {
    return items
      .filter((item) => item.startIndex <= dayIndex && dayIndex < item.startIndex + item.span)
      .sort((a, b) => a.lane - b.lane)
      .map((item) => item.event);
  }

  function hiddenCount(items: (typeof weeks)[number]["items"], dayIndex: number) {
    return items.filter(
      (item) =>
        item.lane >= maxLanes &&
        item.startIndex <= dayIndex &&
        dayIndex < item.startIndex + item.span,
    ).length;
  }

  function startDrag(down: PointerEvent, event: CalendarEvent) {
    if (!calendar.canEdit(event, "move")) return;
    dragAcrossDays(
      down,
      event,
      {
        onPreview: (moved) => (preview = moved),
        onDrop: (moved) => {
          if (moved) void calendar.changeEvent({ event: moved, previous: event, kind: "move" });
        },
      },
      touchOf(calendar),
    );
  }

  /** Delete removes the event; `moveKey` (without modifiers) starts keyboard move mode. */
  function onEventKey(key: KeyboardEvent, event: CalendarEvent) {
    if (contextMenuKey(key)) return;
    if ((key.key === "Delete" || key.key === "Backspace") && calendar.canEdit(event, "delete")) {
      key.preventDefault();
      void calendar.remove(event.id);
    } else if (
      calendar.canEdit(event, "move") &&
      key.key.toLowerCase() === calendar.moveKey &&
      !key.ctrlKey &&
      !key.metaKey &&
      !key.altKey
    ) {
      key.preventDefault();
      keyboardMove(
        calendar,
        event,
        key.currentTarget as HTMLElement,
        dayStepper(7),
        (moved) => (preview = moved),
      );
    }
  }

  // Day numbers in the locale's digits (e.g. Arabic-Indic), like every other date.

  const dayDigits = $derived(formatter({ day: "numeric" }));

  const toDate = (day: CalendarDate) => day.toDate(calendar.timeZone);

  type Item = (typeof weeks)[number]["items"][number];

  /** Everything an event chip needs to behave as one; used by the default chip and `event`. */
  function eventProps(item: Item): PartProps {
    const event = item.event;
    const bar = isAllDay(event) || item.span > 1;
    return {
      type: "button",
      class: cn(
        "pointer-events-auto relative mx-0.5 flex min-w-0 items-center gap-1 rounded px-1.5 text-start text-xs [-webkit-touch-callout:none]",
        bar
          ? "bg-(--event-color)/15 font-medium text-foreground hover:bg-(--event-color)/25"
          : "text-foreground hover:bg-muted",
        item.continuesBefore && "ms-0 rounded-s-none",
        item.continuesAfter && "me-0 rounded-e-none",
        preview?.id === event.id && "opacity-70 shadow-md",
        calendar.eventClass(event),
      ),
      style: `grid-column: ${item.startIndex + 1} / span ${item.span}; grid-row: ${item.lane + 1}; --event-color: ${calendar.colorOf(event)}`,
      // The preview block shows richer details; two tooltips would overlap.
      title: calendar.hasPreview ? undefined : event.title || calendar.labels.untitled,
      "data-event-id": event.id,
      "aria-keyshortcuts": calendar.canEdit(event, "move")
        ? calendar.moveKey.toUpperCase()
        : undefined,
      onpointerdown: (down: PointerEvent) => startDrag(down, event),
      onclick: (click: MouseEvent) => calendar.clickEvent(event, click),
      oncontextmenu: (menu: MouseEvent) => onEventMenu(event, menu),
      onkeydown: (key: KeyboardEvent) => onEventKey(key, event),
    };
  }

  let root: HTMLElement | undefined = $state();
  // Day buttons are one tab stop (roving tabindex): arrows move between them.
  // Follows the calendar's date; the arrow keys reassign it.
  let focusedDay = $derived(calendar.date);
  const gridDays = $derived(weeks.flatMap((week) => week.days));
  const inGrid = (day: CalendarDate) => gridDays.some((candidate) => candidate.compare(day) === 0);
  const tabbable = $derived(inGrid(focusedDay) ? focusedDay : calendar.date);

  /** Moves the focus to another day; beyond this grid, the calendar shows that day's month. */
  async function onDayKey(key: KeyboardEvent, day: CalendarDate) {
    const next = dayGridKey(key, day, calendar.weekOptions);
    if (!next) return;
    key.preventDefault();
    if (!inGrid(next)) calendar.date = next;
    focusedDay = next;
    await tick();
    root?.querySelector<HTMLElement>(`[data-grid-date="${next.toString()}"]`)?.focus();
  }

  function dayNumberProps(day: CalendarDate): PartProps {
    return {
      type: "button",
      tabindex: day.compare(tabbable) === 0 ? 0 : -1,
      "data-grid-date": day.toString(),
      onkeydown: (key: KeyboardEvent) => onDayKey(key, day),
      class: cn(
        "inline-flex size-7 items-center justify-center rounded-full text-xs hover:bg-muted",
        isToday(day, calendar.timeZone) && "bg-primary text-primary-foreground hover:bg-primary/90",
      ),
      "aria-label": fullDate.format(toDate(day)),
      onclick: (click: MouseEvent) => calendar.clickDate(day, click),
    };
  }

  /** Edge handles of multi-day bars; single-day timed chips are not resized here. */
  function resizeHandles(item: Item) {
    const bar = isAllDay(item.event) || item.span > 1;
    return bar
      ? barResizeHandles(calendar, item.event, item, (resized) => (preview = resized))
      : {};
  }

  /** `onEventContextMenu` decides first; returning false keeps menus around the view from opening. */
  function onEventMenu(event: CalendarEvent, menu: MouseEvent) {
    if (!calendar.contextMenu(event, menu)) menu.stopPropagation();
  }
</script>

<div
  class={cn(
    "flex flex-col overflow-y-auto rounded-lg border select-none print:overflow-visible",
    className,
  )}
  bind:clientWidth={width}
  bind:this={root}
>
  <div class="grid grid-cols-7 border-b bg-muted/40">
    {#each weeks[0]?.days ?? [] as day (day.toString())}
      <div class="px-2 py-1.5 text-center text-xs font-medium text-muted-foreground capitalize">
        {weekday.format(toDate(day))}
      </div>
    {/each}
  </div>

  {#if isCompact}
    <div class="grid grid-cols-7 border-b">
      {#each weeks.flatMap((week) => week.days) as day (day.toString())}
        {@const dayEvents = eventsOf(day)}
        {@const date = fullDate.format(toDate(day))}
        <button
          type="button"
          data-date={day.toString()}
          class={cn(
            "flex flex-col items-center gap-1 py-1.5 text-xs hover:bg-muted",
            !isSameMonth(day, calendar.date) && "text-muted-foreground",
            day.compare(listedDay) === 0 && "bg-muted font-semibold",
          )}
          aria-label={dayEvents.length
            ? `${date}, ${pluralLabel(calendar.labels.eventCount, dayEvents.length, calendar.locale)}`
            : date}
          aria-pressed={day.compare(listedDay) === 0}
          onclick={() => (pickedDay = day)}
        >
          <span
            class={cn(
              "inline-flex size-6 items-center justify-center rounded-full",
              isToday(day, calendar.timeZone) && "bg-primary text-primary-foreground",
            )}
          >
            {dayDigits.format(toDate(day))}
          </span>
          <span class="flex h-1.5 gap-0.5" aria-hidden="true">
            {#each dayEvents.slice(0, 3) as event (event.id)}
              <span
                class="size-1.5 rounded-full bg-(--event-color)"
                style:--event-color={calendar.colorOf(event)}
              ></span>
            {/each}
          </span>
        </button>
      {/each}
    </div>

    <div class="grid gap-1 p-2">
      <!-- Opening the day goes through onDateClick, like the day numbers. -->
      <button
        type="button"
        class="w-fit rounded px-2 py-1 text-start text-sm font-semibold first-letter:uppercase hover:bg-muted"
        onclick={(click) => calendar.clickDate(listedDay, click)}
      >
        {fullDate.format(toDate(listedDay))}
      </button>
      {#if eventsOf(listedDay).length}
        <ul class="grid gap-0.5" aria-label={fullDate.format(toDate(listedDay))}>
          {#each eventsOf(listedDay) as event (event.id)}
            <li>
              <button
                type="button"
                class={cn(
                  "flex w-full min-w-0 items-center gap-2 rounded px-2 py-2 text-start text-sm hover:bg-muted",
                  calendar.eventClass(event),
                )}
                style:--event-color={calendar.colorOf(event)}
                data-event-id={event.id}
                onclick={(click) => calendar.clickEvent(event, click)}
                oncontextmenu={(menu) => onEventMenu(event, menu)}
                onkeydown={(key) => onEventKey(key, event)}
              >
                <span class="size-2.5 shrink-0 rounded-full bg-(--event-color)"></span>
                {#if eventContent}
                  {@render eventContent(event)}
                {:else}
                  <span class="truncate">{event.title || calendar.labels.untitled}</span>
                  {#if !isAllDay(event)}
                    <span class="ms-auto shrink-0 text-muted-foreground">
                      {time.format(event.start.toDate())}
                    </span>
                  {/if}
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="px-2 py-1 text-sm text-muted-foreground">{calendar.labels.noEvents}</p>
      {/if}
    </div>
  {:else}
    {#each weeks as week (week.days[0]?.toString())}
      <!-- Tall enough for the day number, `maxLanes` lanes and the "+N" row. -->
      <div
        class="relative grid flex-1 grid-cols-7 border-b last:border-b-0"
        style:min-height="calc(2.5rem + {maxLanes + 1} * 1.5rem)"
      >
        {#each week.days as day (day.toString())}
          <!-- Clicking an empty spot creates an all-day event; keyboard users use the toolbar. -->
          <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
          <div
            data-date={day.toString()}
            class={cn(
              "border-e p-1 last:border-e-0",
              !isSameMonth(day, calendar.date) && "bg-muted/30 text-muted-foreground",
            )}
            onclick={(click) => {
              if (click.target === click.currentTarget)
                calendar.select({
                  start: day,
                  end: day.add({ days: 1 }),
                  allDay: true,
                  fields: {},
                });
            }}
          >
            {#if dayNumber}
              {@render dayNumber({
                day,
                isToday: isToday(day, calendar.timeZone),
                inMonth: isSameMonth(day, calendar.date),
                props: dayNumberProps(day),
              })}
            {:else}
              <button {...dayNumberProps(day)}>{dayDigits.format(toDate(day))}</button>
            {/if}
            {@render dayCell?.({
              day,
              isToday: isToday(day, calendar.timeZone),
              inMonth: isSameMonth(day, calendar.date),
              events: eventsOnDay(week.items, week.days.indexOf(day)),
            })}
          </div>
        {/each}

        <div
          class="pointer-events-none absolute inset-x-0 top-9 grid auto-rows-[1.375rem] grid-cols-7 gap-y-0.5 px-0.5"
        >
          {#each week.items.filter((item) => item.lane < maxLanes) as item (item.event.id)}
            {@const event = item.event}
            {#if eventSnippet}
              {@render eventSnippet({
                event,
                resizeProps: resizeHandles(item),
                props: eventProps(item),
                dragging: preview?.id === event.id,
              })}
            {:else}
              {@const bar = isAllDay(event) || item.span > 1}
              {@const resize = resizeHandles(item)}
              <button {...eventProps(item)}>
                {#if eventContent}
                  {@render eventContent(event)}
                {:else}
                  {#if !bar}
                    <span class="size-2 shrink-0 rounded-full bg-(--event-color)"></span>
                    {#if !isAllDay(event)}
                      <span class="shrink-0 text-muted-foreground"
                        >{time.format(event.start.toDate())}</span
                      >
                    {/if}
                  {/if}
                  <span class="truncate">{event.title || calendar.labels.untitled}</span>
                {/if}
                {#if resize.start}<span {...resize.start}></span>{/if}
                {#if resize.end}<span {...resize.end}></span>{/if}
              </button>
            {/if}
          {/each}

          {#each week.days as day, dayIndex (day.toString())}
            {@const hidden = hiddenCount(week.items, dayIndex)}
            {#if hidden > 0}
              {@const key = day.toString()}
              {@const dayEvents = eventsOnDay(week.items, dayIndex)}
              <!-- Opening goes through onMoreClick, which may keep it closed and do something else. -->
              <Popover.Root
                bind:open={() => openDay === key, (open) => setOpen(key, open, day, dayEvents)}
              >
                <Popover.Trigger
                  class="pointer-events-auto mx-0.5 rounded px-1.5 text-start text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground data-[state=open]:text-foreground"
                  style="grid-column: {dayIndex + 1}; grid-row: {maxLanes + 1}"
                >
                  {#snippet child({ props })}
                    {#if more}
                      {@render more({ day, count: hidden, events: dayEvents, props })}
                    {:else}
                      <button {...props}>
                        <span aria-hidden="true">+{hidden}</span>
                        <span class="sr-only">
                          {pluralLabel(calendar.labels.moreEvents, hidden, calendar.locale)},
                          {fullDate.format(toDate(day))}
                        </span>
                      </button>
                    {/if}
                  {/snippet}
                </Popover.Trigger>
                <Popover.Content
                  class="w-64 gap-2 p-2"
                  align="start"
                  role="dialog"
                  aria-label={fullDate.format(toDate(day))}
                >
                  <button
                    type="button"
                    class="rounded px-2 py-1 text-start text-sm font-semibold first-letter:uppercase hover:bg-muted"
                    onclick={(click) => {
                      openDay = null;
                      calendar.clickDate(day, click);
                    }}
                  >
                    {fullDate.format(toDate(day))}
                  </button>
                  <ul class="grid gap-0.5">
                    {#each dayEvents as event (event.id)}
                      <li>
                        <button
                          type="button"
                          class="flex w-full min-w-0 items-center gap-1.5 rounded px-2 py-1 text-start text-xs hover:bg-muted"
                          style:--event-color={calendar.colorOf(event)}
                          onclick={(click) => {
                            openDay = null;
                            calendar.clickEvent(event, click);
                          }}
                        >
                          {#if eventContent}
                            {@render eventContent(event)}
                          {:else}
                            <span class="size-2 shrink-0 rounded-full bg-(--event-color)"></span>
                            {#if !isAllDay(event)}
                              <span class="shrink-0 text-muted-foreground"
                                >{time.format(event.start.toDate())}</span
                              >
                            {/if}
                            <span class="truncate">{event.title || calendar.labels.untitled}</span>
                          {/if}
                        </button>
                      </li>
                    {/each}
                  </ul>
                </Popover.Content>
              </Popover.Root>
            {/if}
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>
