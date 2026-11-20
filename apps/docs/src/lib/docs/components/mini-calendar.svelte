<script lang="ts">
  import PropsTable from "#lib/docs/props-table.svelte";
  import { classOnly } from "./rows.js";
</script>

<h2>Usage</h2>
<p>
  A small month to jump to any date: its arrows browse months, a click moves the calendar to that
  day (keeping the view), days with events get a dot and the visible range is shaded. Arrow keys
  move between days, Page Up and Page Down between months, Enter opens the focused day.
</p>
<h2>API reference</h2>
<PropsTable caption="MiniCalendar props" rows={classOnly} />
