<script lang="ts">
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import { Button } from "#lib/registry/ui/button/index.js";
  import { getCalendar } from "#lib/registry/lib/calendar-state.svelte.js";
  import { cn } from "#lib/utils.js";

  let { class: className, today = true }: { class?: string; today?: boolean } = $props();

  const calendar = getCalendar();
  const relative = $derived(new Intl.RelativeTimeFormat(calendar.locale, { numeric: "auto" }));

  // "last month", "next week"... in the unit the current view moves by.
  const unit = $derived.by(() => {
    const custom = calendar.views.get(calendar.view)?.unit;
    const builtIn: Record<string, Intl.RelativeTimeFormatUnit> = {
      month: "month",
      agenda: "month",
      gantt: "month",
      week: "week",
      timeline: "week",
      year: "year",
    };
    return custom
      ? (custom.slice(0, -1) as Intl.RelativeTimeFormatUnit)
      : (builtIn[calendar.view] ?? "day");
  });
</script>

<div class={cn("flex items-center gap-1 print:hidden", className)}>
  {#if today}
    <Button variant="outline" onclick={() => calendar.goToday()}>
      <!-- first-letter needs a block box; the button itself is inline-flex -->
      <span class="inline-block first-letter:uppercase">{relative.format(0, "day")}</span>
    </Button>
  {/if}
  <Button
    variant="ghost"
    size="icon"
    aria-label={relative.format(-1, unit)}
    onclick={() => calendar.previous()}
  >
    <ChevronLeftIcon class="rtl:rotate-180" />
  </Button>
  <Button
    variant="ghost"
    size="icon"
    aria-label={relative.format(1, unit)}
    onclick={() => calendar.next()}
  >
    <ChevronRightIcon class="rtl:rotate-180" />
  </Button>
</div>
