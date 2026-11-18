<script lang="ts">
  import { DateFormatter, isSameMonth, isToday, type CalendarDate } from "@internationalized/date";
  import { countByDay, monthGrid } from "@guilli/calendar-core";
  import { tick, type Snippet } from "svelte";
  import { dayGridKey } from "#lib/registry/lib/calendar-keyboard.js";
  import {
    getCalendar,
    pluralLabel,
    type DaySnippetArgs,
    type PartProps,
  } from "#lib/registry/lib/calendar-state.svelte.js";
  import { cn } from "#lib/utils.js";

  interface Props {
    class?: string;
    /** Replaces each day button. `count` is the number of events; spread `props` to keep opening the day. */
    dayNumber?: Snippet<[DaySnippetArgs & { count: number }]>;
  }

  let { class: className, dayNumber }: Props = $props();

  const calendar = getCalendar();

  const months = $derived(
    Array.from({ length: 12 }, (_, index) => {
      const month = calendar.date.set({ month: index + 1, day: 1 });
      return { month, weeks: monthGrid(month, calendar.weekOptions) };
    }),
  );
  const counts = $derived(countByDay(calendar.visibleEvents, calendar.range, calendar.timeZone));

  const formatter = (options: Intl.DateTimeFormatOptions) =>
    new DateFormatter(calendar.locale, { ...options, timeZone: calendar.timeZone });
  const monthName = $derived(formatter({ month: "long" }));
  const weekday = $derived(formatter({ weekday: "narrow" }));
  const fullDate = $derived(formatter({ dateStyle: "full" }));
  const toDate = (day: CalendarDate) => day.toDate(calendar.timeZone);
  const eventCount = (count: number) =>
    pluralLabel(calendar.labels.eventCount, count, calendar.locale);

  function openMonth(month: CalendarDate) {
    calendar.date = month;
    calendar.view = "month";
  }

  /** Busier days get a stronger tint. */
  const tint = (count: number) =>
    count >= 4
      ? "bg-primary/40"
      : count >= 2
        ? "bg-primary/25"
        : count === 1
          ? "bg-primary/10"
          : "";

  let root: HTMLElement | undefined = $state();
  // Day buttons are one tab stop (roving tabindex): arrows move between them.
  // Follows the calendar's date; the arrow keys reassign it.
  let focusedDay = $derived(calendar.date);
  const tabbable = $derived(focusedDay.year === calendar.date.year ? focusedDay : calendar.date);

  /** Moves the focus to another day; beyond this year, the calendar shows that day's year. */
  async function onDayKey(key: KeyboardEvent, day: CalendarDate) {
    const next = dayGridKey(key, day, calendar.weekOptions);
    if (!next) return;
    key.preventDefault();
    if (next.year !== calendar.date.year) calendar.date = next;
    focusedDay = next;
    await tick();
    root?.querySelector<HTMLElement>(`[data-grid-date="${next.toString()}"]`)?.focus();
  }

  function dayProps(day: CalendarDate, count: number): PartProps {
    return {
      type: "button",
      tabindex: day.compare(tabbable) === 0 ? 0 : -1,
      "data-grid-date": day.toString(),
      onkeydown: (key: KeyboardEvent) => onDayKey(key, day),
      class: cn(
        "mx-auto inline-flex size-8 items-center justify-center rounded-full hover:ring-1 hover:ring-ring",
        tint(count),
        isToday(day, calendar.timeZone) && "bg-primary font-semibold text-primary-foreground",
      ),
      "aria-label": count
        ? `${fullDate.format(toDate(day))}, ${eventCount(count)}`
        : fullDate.format(toDate(day)),
      title: count ? eventCount(count) : undefined,
      onclick: (click: MouseEvent) => calendar.clickDate(day, click),
    };
  }
</script>

<div
  bind:this={root}
  class={cn(
    "grid min-h-0 grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] content-start gap-6 overflow-y-auto rounded-lg border p-4 print:overflow-visible",
    className,
  )}
>
  {#each months as { month, weeks } (month.toString())}
    <section aria-label={monthName.format(toDate(month))}>
      <h3>
        <button
          type="button"
          class="mb-2 rounded px-1 text-sm font-semibold capitalize hover:bg-muted"
          onclick={() => openMonth(month)}
        >
          {monthName.format(toDate(month))}
        </button>
      </h3>
      <div class="grid grid-cols-7 text-center text-xs">
        {#each weeks[0] ?? [] as day (day.toString())}
          <span class="py-1 text-muted-foreground uppercase" aria-hidden="true">
            {weekday.format(toDate(day))}
          </span>
        {/each}
        {#each weeks.flat() as day (day.toString())}
          {#if isSameMonth(day, month)}
            {@const count = counts.get(day.toString()) ?? 0}
            {#if dayNumber}
              {@render dayNumber({
                day,
                count,
                isToday: isToday(day, calendar.timeZone),
                props: dayProps(day, count),
              })}
            {:else}
              <button {...dayProps(day, count)}>{day.day}</button>
            {/if}
          {:else}
            <span></span>
          {/if}
        {/each}
      </div>
    </section>
  {/each}
</div>
