<script lang="ts">
  import PropsTable from "#lib/docs/props-table.svelte";
  import { classOnly, eventContentRow, eventRow, dayHeaderRow } from "./rows.js";
</script>

<h2>Usage</h2>
<p>
  Resources as rows and the week's days as columns. Use <code>parentId</code> to group resources; groups
  collapse. Dragging an event to another row moves it to that resource.
</p>
<h2>API reference</h2>
<PropsTable
  caption="TimelineView props"
  rows={[
    {
      name: "resources",
      type: "Resource[]",
      description: "Required. { id, title, color?, parentId? }",
    },
    ...classOnly,
    eventContentRow,
    eventRow(""),
    dayHeaderRow,
    {
      name: "resourceLabel",
      type: "Snippet<[{ resource, title, depth, hasChildren, collapsed, toggle }]>",
      description: "Content of a row label. resource is null for the unassigned row.",
    },
  ]}
/>
