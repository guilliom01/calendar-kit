<script lang="ts">
  import PropsTable from "#lib/docs/props-table.svelte";
  import { classOnly, eventContentRow, eventRow, dayHeaderRow } from "./rows.js";
</script>

<h2>Usage</h2>
<p>One row per task across the month, with a progress bar and arrows for dependencies.</p>
<h2>API reference</h2>
<PropsTable
  caption="GanttView props"
  rows={[
    ...classOnly,
    {
      name: "filter",
      type: "(event) => boolean",
      description: "Which events are tasks. Default: events with progress or dependsOn.",
    },
    eventContentRow,
    eventRow(""),
    dayHeaderRow,
    {
      name: "taskLabel",
      type: "Snippet<[{ event, progress }]>",
      description: "Content of a task label; progress is the formatted percentage.",
    },
  ]}
/>
