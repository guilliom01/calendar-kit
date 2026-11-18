<script lang="ts">
  import PrinterIcon from "@lucide/svelte/icons/printer";
  import { Button, type ButtonProps } from "#lib/registry/ui/button/index.js";
  import { getCalendar } from "#lib/registry/lib/calendar-state.svelte.js";
  import { cn } from "#lib/utils.js";

  let { class: className, ...rest }: ButtonProps = $props();

  const calendar = getCalendar();
</script>

<!-- The browser's print dialog also saves as PDF. Calendar controls hide themselves in print. -->
<Button
  variant="outline"
  size="sm"
  class={cn("print:hidden", className)}
  onclick={() => window.print()}
  {...rest}
>
  <PrinterIcon />
  {calendar.labels.print}
</Button>
