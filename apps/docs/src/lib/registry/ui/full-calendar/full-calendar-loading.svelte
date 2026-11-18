<script lang="ts">
  import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
  import { getCalendar } from "#lib/registry/lib/calendar-state.svelte.js";
  import { cn } from "#lib/utils.js";

  let { class: className }: { class?: string } = $props();

  const calendar = getCalendar();
</script>

{#if calendar.loading}
  <span
    role="status"
    class={cn("text-muted-foreground print:hidden", className)}
    title={calendar.labels.loading}
  >
    <LoaderCircleIcon class="size-4 animate-spin" aria-hidden="true" />
    <span class="sr-only">{calendar.labels.loading}</span>
  </span>
{/if}
