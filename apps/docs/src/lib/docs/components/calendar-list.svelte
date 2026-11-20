<script lang="ts">
  import PropsTable from "#lib/docs/props-table.svelte";
  import { classOnly } from "./rows.js";
</script>

<h2>Usage</h2>
<p>
  One checkbox per calendar in the state's <code>calendars</code>, in its color, to show or hide its
  events. Events belong to a calendar through <code>calendarId</code> and take its color when they
  have none. The event dialog shows a calendar select when <code>calendars</code> is set.
</p>
<h2>API reference</h2>
<PropsTable
  caption="CalendarList props"
  rows={[
    ...classOnly,
    { name: "title", type: "string", description: "Heading. Default: labels.calendars." },
  ]}
/>
