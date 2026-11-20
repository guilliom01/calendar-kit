<script lang="ts">
  import Code from "#lib/docs/code.svelte";

  const external = `<script lang="ts">
	import { draggable } from '#lib/calendar-drag.js';
${"</" + "script>"}

<ul>
	{#each tasks as task (task.id)}
		<li {@attach draggable(calendar, { title: task.title, duration: 30, data: task })}>
			{task.title}
		</li>
	{/each}
</ul>`;
</script>

<svelte:head><title>Dragging your own items in · calendar-kit docs</title></svelte:head>

<h1>Dragging your own items in</h1>
<p>
  <code>draggable(calendar, item)</code> (from <code>calendar-drag</code>, installed with the state)
  makes any element draggable onto the views. Dropped on the hours it becomes a timed event lasting
  <code>item.duration</code> minutes (or <code>defaultDuration</code>); on a day, an all-day event;
  on a resource row or column, it gets that resource. <code>onExternalDrop</code> decides what is created.
  Dragging has no keyboard path, so offer another way too (a "Schedule" button).
</p>
<Code code={external} />
