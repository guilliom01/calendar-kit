<script lang="ts">
  import Code from "#lib/docs/code.svelte";

  const eventSnippet = `<MonthView>
	<!-- props carries the handlers, ARIA, data-event-id, class and style. Keep a focusable element. -->
	{#snippet event({ event, props, dragging })}
		<button {...props} class={cn(props.class, 'rounded-full', dragging && 'ring-2')}>
			{event.title}
		</button>
	{/snippet}
	{#snippet dayCell({ day, events })}
		{#if events.some((event) => event.data?.kind === 'holiday')}<HolidayIcon />{/if}
	{/snippet}
	{#snippet more({ count, props })}
		<button {...props}>See {count} more</button>
	{/snippet}
</MonthView>`;
</script>

<svelte:head><title>Customizing views · calendar-kit docs</title></svelte:head>

<h1>Customizing views</h1>
<p>
  Views take snippets for their parts, so you can change markup without editing the copied files.
  There are two kinds:
</p>
<ul>
  <li>
    <strong>Interactive parts</strong> (events, day buttons, "+N") receive <code>props</code>: the
    handlers, ARIA attributes, <code>data-event-id</code>, class and style the default element uses.
    Spread them on your own element (like bits-ui's <code>child</code>) and it keeps working: click
    hooks, dragging, keyboard move mode and screen reader labels. Keep it focusable, e.g. a
    <code>&lt;button&gt;</code>.
  </li>
  <li>
    <strong>Display parts</strong> (day cell, resource label, hour label, now line) receive data only.
  </li>
</ul>
<p>
  <code>eventContent</code> is the shortcut when only the inside of the event should change. For anything
  the snippets do not cover, edit the copied component: it is your code.
</p>
<Code code={eventSnippet} label="Our own event chip, day mark and '+N' button" />
