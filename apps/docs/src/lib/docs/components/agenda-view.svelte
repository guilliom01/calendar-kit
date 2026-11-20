<script lang="ts">
  import PropsTable from "#lib/docs/props-table.svelte";
  import { classOnly, eventContentRow, dayHeaderRow } from "./rows.js";
</script>

<h2>API reference</h2>
<PropsTable
  caption="AgendaView props"
  rows={[
    ...classOnly,
    { name: "resources", type: "Resource[]", description: "Names shown next to each event." },
    eventContentRow,
    {
      name: "event",
      type: "Snippet<[{ event, props, when, resources }]>",
      description: "Replaces a whole event row; when and resources are the formatted texts.",
    },
    dayHeaderRow,
  ]}
/>
