<script lang="ts">
  import PropsTable from "#lib/docs/props-table.svelte";
  import { classOnly } from "./rows.js";
</script>

<h2>Usage</h2>
<p>
  Wrap the views to show a card with an event's title, dates and calendar when the pointer rests on
  it (<code>delay</code>, 500 ms) or it gets keyboard focus. The card is the event's description (<code
    >aria-describedby</code
  >), closes with Escape, scrolling or a press, and stays while the pointer is on it. While it is
  mounted, events drop the browser's <code>title</code> tooltip.
</p>
<h2>API reference</h2>
<PropsTable
  caption="EventPreview props"
  rows={[
    ...classOnly,
    { name: "children", type: "Snippet", description: "The views." },
    { name: "content", type: "Snippet<[{ event }]>", description: "Replaces the card's content." },
    { name: "delay", type: "number = 500", description: "Hover time before it shows." },
  ]}
/>
