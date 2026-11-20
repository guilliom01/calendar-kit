<script lang="ts">
  import PropsTable from "#lib/docs/props-table.svelte";
  import { classOnly } from "./rows.js";
</script>

<h2>Usage</h2>
<p>
  Pick participants (resources) and a length to list the next times when all of them are free,
  inside working hours, from now on. A suggestion goes through <code>select()</code>, so it opens
  the new-event dialog with the participants assigned (or runs your <code>onSelect</code>). The
  search is <code>findFreeSlots(events, options)</code> from the core, for your own UI.
</p>
<h2>API reference</h2>
<PropsTable
  caption="SchedulingAssistant props"
  rows={[
    ...classOnly,
    { name: "resources", type: "Resource[]", description: "Required. Who can take part." },
    {
      name: "durations",
      type: "number[] = [30, 60, 90, 120]",
      description: "Lengths offered, in minutes.",
    },
    { name: "days", type: "number = 14", description: "Days searched, from today." },
    {
      name: "workingHours",
      type: "{ days, start, end } | null",
      description:
        "Weekdays (0 is Sunday) and minutes after midnight. Default Monday to Friday, 9 to 18; null searches whole days.",
    },
    { name: "limit", type: "number = 5", description: "Most suggestions shown." },
    {
      name: "suggestion",
      type: "Snippet<[{ slot, label, select }]>",
      description: "Replaces each suggestion.",
    },
  ]}
/>
