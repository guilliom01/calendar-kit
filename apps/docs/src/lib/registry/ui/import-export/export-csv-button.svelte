<script lang="ts">
  import SheetIcon from "@lucide/svelte/icons/sheet";
  import { toCSV, type CalendarEvent } from "@calendar-kit/core";
  import { Button, type ButtonProps } from "#lib/registry/ui/button/index.js";
  import { getCalendar } from "#lib/registry/lib/calendar-state.svelte.js";
  import { cn } from "#lib/utils.js";
  import { download } from "./download.js";

  interface Props extends ButtonProps {
    filename?: string;
    /** Starts the file with a byte order mark, so Excel reads it as UTF-8 (accents, ñ). */
    bom?: boolean;
    /** What to export. Default: what the user sees (the visible range, series expanded). */
    events?: readonly CalendarEvent[];
  }

  let {
    filename = "calendar.csv",
    bom = true,
    events,
    class: className,
    ...rest
  }: Props = $props();

  const calendar = getCalendar();

  function exportCsv() {
    const csv = toCSV(events ?? calendar.visibleEvents, { timeZone: calendar.timeZone });
    download(filename, (bom ? "﻿" : "") + csv, "text/csv;charset=utf-8");
  }
</script>

<Button
  variant="outline"
  size="sm"
  class={cn("print:hidden", className)}
  onclick={exportCsv}
  {...rest}
>
  <SheetIcon />
  {calendar.labels.exportCsv}
</Button>
