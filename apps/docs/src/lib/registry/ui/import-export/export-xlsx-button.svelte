<script lang="ts">
  import FileSpreadsheetIcon from "@lucide/svelte/icons/file-spreadsheet";
  import { toXLSX, type CalendarEvent } from "@guilli/calendar-core";
  import { Button, type ButtonProps } from "#lib/registry/ui/button/index.js";
  import { getCalendar } from "#lib/registry/lib/calendar-state.svelte.js";
  import { cn } from "#lib/utils.js";
  import { download } from "./download.js";

  interface Props extends ButtonProps {
    filename?: string;
    /** Name of the sheet. Default "Events". */
    sheetName?: string;
    /** What to export. Default: what the user sees (the visible range, series expanded). */
    events?: readonly CalendarEvent[];
  }

  let {
    filename = "calendar.xlsx",
    sheetName,
    events,
    class: className,
    ...rest
  }: Props = $props();

  const calendar = getCalendar();

  function exportXlsx() {
    const workbook = toXLSX(events ?? calendar.visibleEvents, {
      timeZone: calendar.timeZone,
      ...(sheetName && { sheetName }),
    });
    download(
      filename,
      workbook,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  }
</script>

<Button
  variant="outline"
  size="sm"
  class={cn("print:hidden", className)}
  onclick={exportXlsx}
  {...rest}
>
  <FileSpreadsheetIcon />
  {calendar.labels.exportXlsx}
</Button>
