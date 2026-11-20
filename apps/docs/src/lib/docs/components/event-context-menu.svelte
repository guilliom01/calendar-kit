<script lang="ts">
  import Code from "#lib/docs/code.svelte";
  import PropsTable from "#lib/docs/props-table.svelte";
  import { classOnly } from "./rows.js";

  const contextMenu = `<EventContextMenu>
	<!-- Our own item next to Open, Duplicate, Move to calendar and Delete. -->
	{#snippet extra({ event, actions })}
		<ContextMenu.Item onSelect={() => share(event)}>Share</ContextMenu.Item>
	{/snippet}
	<FullCalendar.View name="month"><MonthView /></FullCalendar.View>
</EventContextMenu>`;
</script>

<h2>Usage</h2>
<p>
  Wrap the views to get a menu on events with a right-click, Shift+F10 or the menu key: Open,
  Duplicate, Move to calendar (with <code>calendars</code>) and Delete. Actions the user may not do
  (<code>isEditable(event, action)</code>) are left out. Your <code>onEventContextMenu</code> hook
  runs first; returning <code>false</code> keeps this menu closed.
</p>
<Code code={contextMenu} />
<h2>API reference</h2>
<PropsTable
  caption="EventContextMenu props"
  rows={[
    ...classOnly,
    { name: "children", type: "Snippet", description: "The views." },
    {
      name: "menu",
      type: "Snippet<[{ event, actions }]>",
      description:
        "Replaces the whole menu content. actions has open, and duplicate, remove and moveTo(calendarId) when allowed.",
    },
    {
      name: "extra",
      type: "Snippet<[{ event, actions }]>",
      description: "Items added after the built-in ones, before Delete.",
    },
  ]}
/>
