<script lang="ts">
  import {
    DateFormatter,
    isSameDay,
    isSameMonth,
    isToday,
    startOfMonth,
    type CalendarDate,
  } from "@internationalized/date";
  import { countByDay, monthGrid } from "@guilli/calendar-core";
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import { tick } from "svelte";
  import { getCalendar, pluralLabel } from "#lib/registry/lib/calendar-state.svelte.js";
  import { cn } from "#lib/utils.js";

  let { class: className }: { class?: string } = $props();

  const calendar = getCalendar();

  // Month shown here. Arrows browse it freely; it follows the calendar when its date changes.
  let month = $state(startOfMonth(calendar.date));
  // The day that gets Tab focus (roving tabindex), moved by the arrow keys.
  let focused = $state(calendar.date);
  $effect.pre(() => {
    month = startOfMonth(calendar.date);
    focused = calendar.date;
  });

  let grid: HTMLTableElement | undefined = $state();

  const weeks = $derived(monthGrid(month, calendar.weekOptions));
  const shownRange = $derived({
    start: weeks[0]![0]!,
    end: weeks.at(-1)!.at(-1)!.add({ days: 1 }),
  });
  // Same filters as the views: hidden calendars, `filter` and `query`.
  const counts = $derived(countByDay(calendar.eventsIn(shownRange), shownRange, calendar.timeZone));
  const tabbable = $derived(isSameMonth(focused, month) ? focused : month);

  const formatter = (options: Intl.DateTimeFormatOptions) =>
    new DateFormatter(calendar.locale, { ...options, timeZone: calendar.timeZone });
  const monthTitle = $derived(formatter({ month: "long", year: "numeric" }));
  const weekday = $derived(formatter({ weekday: "narrow" }));
  const weekdayLong = $derived(formatter({ weekday: "long" }));
  const fullDate = $derived(formatter({ dateStyle: "full" }));
  // Day numbers in the locale's digits (e.g. Arabic-Indic), like every other date.
  const dayDigits = $derived(formatter({ day: "numeric" }));
  const toDate = (day: CalendarDate) => day.toDate(calendar.timeZone);

  const inRange = (day: CalendarDate) =>
    day.compare(calendar.range.start) >= 0 && day.compare(calendar.range.end) < 0;

  function label(day: CalendarDate) {
    const count = counts.get(day.toString()) ?? 0;
    const date = fullDate.format(toDate(day));
    return count
      ? `${date}, ${pluralLabel(calendar.labels.eventCount, count, calendar.locale)}`
      : date;
  }

  async function moveFocus(day: CalendarDate) {
    focused = day;
    if (!isSameMonth(day, month)) month = startOfMonth(day);
    await tick();
    grid?.querySelector<HTMLElement>(`[data-mini-date="${day.toString()}"]`)?.focus();
  }

  /** Arrows move a day or a week (mirrored right-to-left), Page Up/Down a month. */
  function onkeydown(key: KeyboardEvent) {
    const rtl = !!grid && getComputedStyle(grid).direction === "rtl";
    const days: Record<string, number> = {
      ArrowLeft: rtl ? 1 : -1,
      ArrowRight: rtl ? -1 : 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    let next: CalendarDate;
    if (key.key in days) next = focused.add({ days: days[key.key]! });
    else if (key.key === "PageUp") next = focused.subtract({ months: 1 });
    else if (key.key === "PageDown") next = focused.add({ months: 1 });
    else return;
    key.preventDefault();
    void moveFocus(next);
  }
</script>

<!-- A small month to jump to any date. Days with events get a dot; the visible range is shaded. -->
<div class={cn("grid gap-2 text-sm", className)}>
  <div class="flex items-center justify-between gap-1">
    <span class="ps-1 font-medium first-letter:uppercase">{monthTitle.format(toDate(month))}</span>
    <div class="flex">
      {#each [-1, 1] as step (step)}
        {@const target = month.add({ months: step })}
        <button
          type="button"
          class="inline-flex size-7 items-center justify-center rounded-md hover:bg-muted"
          aria-label={monthTitle.format(toDate(target))}
          onclick={() => (month = target)}
        >
          {#if step < 0}
            <ChevronLeftIcon class="size-4 rtl:rotate-180" />
          {:else}
            <ChevronRightIcon class="size-4 rtl:rotate-180" />
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <table
    bind:this={grid}
    role="grid"
    aria-label={monthTitle.format(toDate(month))}
    class="w-full border-collapse text-center text-xs"
    {onkeydown}
  >
    <thead>
      <tr>
        {#each weeks[0] ?? [] as day (day.toString())}
          <th scope="col" class="pb-1 font-normal text-muted-foreground uppercase">
            <abbr title={weekdayLong.format(toDate(day))} class="no-underline">
              {weekday.format(toDate(day))}
            </abbr>
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each weeks as week (week[0]?.toString())}
        <tr>
          {#each week as day (day.toString())}
            {@const selected = isSameDay(day, calendar.date)}
            {@const count = counts.get(day.toString()) ?? 0}
            <td role="gridcell" aria-selected={selected} class={cn(inRange(day) && "bg-muted")}>
              <button
                type="button"
                data-mini-date={day.toString()}
                tabindex={isSameDay(day, tabbable) ? 0 : -1}
                class={cn(
                  "relative mx-auto inline-flex size-8 items-center justify-center rounded-full hover:bg-accent",
                  !isSameMonth(day, month) && "text-muted-foreground",
                  isToday(day, calendar.timeZone) && "font-semibold text-primary",
                  selected && "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
                aria-label={label(day)}
                aria-current={isToday(day, calendar.timeZone) ? "date" : undefined}
                onclick={() => (calendar.date = day)}
              >
                {dayDigits.format(toDate(day))}
                {#if count}
                  <span
                    aria-hidden="true"
                    class={cn(
                      "absolute bottom-1 size-1 rounded-full",
                      selected ? "bg-primary-foreground" : "bg-primary",
                    )}
                  ></span>
                {/if}
              </button>
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
