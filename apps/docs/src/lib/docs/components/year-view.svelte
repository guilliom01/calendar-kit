<script lang="ts">
  import PropsTable from "#lib/docs/props-table.svelte";
  import { classOnly } from "./rows.js";
</script>

<h2>Usage</h2>
<p>Twelve small months. Busier days get a stronger tint; clicking a day calls onDateClick.</p>
<h2>API reference</h2>
<PropsTable
  caption="YearView props"
  rows={[
    ...classOnly,
    {
      name: "dayNumber",
      type: "Snippet<[{ day, count, isToday, props }]>",
      description: "Replaces each day button; count is its number of events.",
    },
  ]}
/>
