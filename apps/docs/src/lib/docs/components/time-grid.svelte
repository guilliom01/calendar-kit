<script lang="ts">
  import PropsTable from "#lib/docs/props-table.svelte";
  import { classOnly, eventContentRow, eventRow, dayHeaderRow } from "./rows.js";
</script>

<h2>Usage</h2>
<p>
  Week and day views with hours, an all-day row, overlapping events side by side and a "now" line.
  Drag to move, drag the top or bottom edge to resize, drag over empty time to create. Dragging an
  event between the all-day row and the hours converts it (all-day events get <code
    >defaultDuration</code
  >).
</p>
<h2>API reference</h2>
<PropsTable
  caption="TimeGrid props"
  rows={[
    {
      name: "resources",
      type: "Resource[]",
      description:
        "One column per resource (without children) for the shown day, instead of one per day.",
    },
    ...classOnly,
    { name: "hourHeight", type: "string = '3rem'", description: "Height of one hour." },
    {
      name: "scrollToHour",
      type: "number = 7",
      description: "Hour shown at the top when it opens.",
    },
    eventContentRow,
    {
      ...eventRow(", allDay"),
      description: "Replaces timed blocks and all-day bars; allDay tells which one it is.",
    },
    dayHeaderRow,
    {
      name: "resourceLabel",
      type: "Snippet<[{ resource }]>",
      description: "Content of a resource column header.",
    },
    {
      name: "hourLabel",
      type: "Snippet<[{ hour, label }]>",
      description: "Text next to each hour line.",
    },
    {
      name: "nowIndicator",
      type: "Snippet<[{ time }]>",
      description: 'Replaces the "now" line; it is already placed.',
    },
  ]}
/>
