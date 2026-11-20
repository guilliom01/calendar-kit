<script lang="ts">
  import PropsTable from "#lib/docs/props-table.svelte";
  import { classOnly } from "./rows.js";
</script>

<h2>Usage</h2>
<p>
  A search box bound to the state's <code>query</code>: every view shows only the events whose title
  has every word typed, ignoring accents and case ("cafe" finds "Café"). It searches what is loaded
  in the visible range.
</p>
<h2>API reference</h2>
<PropsTable
  caption="CalendarSearch props"
  rows={[
    ...classOnly,
    { name: "placeholder", type: "string", description: "Default: labels.search." },
  ]}
/>
