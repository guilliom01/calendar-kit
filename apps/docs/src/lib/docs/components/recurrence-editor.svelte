<script lang="ts">
  import Code from "#lib/docs/code.svelte";
  import PropsTable from "#lib/docs/props-table.svelte";
  import { classOnly } from "./rows.js";

  const recurrence = `<EventDialog>
	{#snippet recurrence({ value, setValue, start })}
		<RecurrenceEditor {value} onchange={setValue} {start} />
	{/snippet}
</EventDialog>`;
</script>

<h2>Usage</h2>
<p>
  A repeat-rule editor: every N days, weeks, months or years; several weekdays; the day of the month
  or the nth weekday. Use it in the dialog or in your own form.
</p>
<Code code={recurrence} />
<h2>API reference</h2>
<PropsTable
  caption="RecurrenceEditor props"
  rows={[
    {
      name: "value",
      type: "string",
      description: "RRULE without COUNT/UNTIL; '' means no repeat.",
    },
    { name: "onchange", type: "(value: string) => void", description: "Called with the new rule." },
    {
      name: "start",
      type: "CalendarDate",
      description: "First date; defaults (weekday, day of month) come from it.",
    },
    ...classOnly,
  ]}
/>
