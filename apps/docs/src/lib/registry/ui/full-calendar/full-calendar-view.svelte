<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getCalendar, type ViewDefinition } from '#lib/registry/lib/calendar-state.svelte.js';

	interface Props extends ViewDefinition {
		/** The view's content, shown while this view is selected. */
		children?: Snippet;
	}

	let { children, ...definition }: Props = $props();

	const calendar = getCalendar();

	// Registering makes the view selectable (and listed by <FullCalendar.ViewSwitcher>).
	$effect.pre(() => calendar.registerView({ ...definition }));
</script>

{#if calendar.view === definition.name}
	{@render children?.()}
{/if}
