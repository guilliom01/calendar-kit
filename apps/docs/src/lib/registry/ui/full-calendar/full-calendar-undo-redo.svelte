<script lang="ts">
  import Redo2Icon from "@lucide/svelte/icons/redo-2";
  import Undo2Icon from "@lucide/svelte/icons/undo-2";
  import { Button } from "#lib/registry/ui/button/index.js";
  import { getCalendar } from "#lib/registry/lib/calendar-state.svelte.js";
  import { cn } from "#lib/utils.js";

  let { class: className }: { class?: string } = $props();

  const calendar = getCalendar();
</script>

{#if calendar.editable}
  <div class={cn("flex print:hidden", className)}>
    <Button
      variant="ghost"
      size="icon"
      aria-label={calendar.labels.undo}
      title={calendar.labels.undo}
      disabled={!calendar.canUndo}
      onclick={() => calendar.undo()}
    >
      <Undo2Icon />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      aria-label={calendar.labels.redo}
      title={calendar.labels.redo}
      disabled={!calendar.canRedo}
      onclick={() => calendar.redo()}
    >
      <Redo2Icon />
    </Button>
  </div>
{/if}
