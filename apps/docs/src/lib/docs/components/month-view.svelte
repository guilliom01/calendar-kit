<script lang="ts">
  import Code from "#lib/docs/code.svelte";
  import PropsTable from "#lib/docs/props-table.svelte";
  import { classOnly, eventContentRow, eventRow } from "./rows.js";

  const eventContent = `<MonthView>
	{#snippet eventContent(event)}
		<strong>{event.title}</strong> · {event.data.room}
	{/snippet}
</MonthView>`;
</script>

<h2>Usage</h2>
<p>
  A month grid. Multi-day events are bars. When a day is full, the rest collapse into "+N", which
  opens a popover listing every event of that day (or runs your <code>onMoreClick</code> hook instead).
</p>
<Code code={eventContent} label="Custom event content (every view accepts it)" />
<h2>API reference</h2>
<PropsTable
  caption="MonthView props"
  rows={[
    ...classOnly,
    { name: "maxLanes", type: "number = 3", description: 'Event rows per week before "+N".' },
    {
      name: "compact",
      type: "boolean | 'auto' = 'auto'",
      description:
        "Phone layout: dots per day and the tapped day's events below. 'auto' uses it while the view is narrower than 40rem.",
    },
    eventContentRow,
    eventRow(""),
    {
      name: "dayNumber",
      type: "Snippet<[{ day, isToday, inMonth, props }]>",
      description: "Replaces the day number button.",
    },
    {
      name: "dayCell",
      type: "Snippet<[{ day, isToday, inMonth, events }]>",
      description: "Extra content in each day cell, under the day number.",
    },
    {
      name: "more",
      type: "Snippet<[{ day, count, events, props }]>",
      description: 'Replaces the "+N" button. Spread props to keep opening the list.',
    },
  ]}
/>
