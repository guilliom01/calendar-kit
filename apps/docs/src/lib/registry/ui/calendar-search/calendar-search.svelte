<script lang="ts">
	import SearchIcon from '@lucide/svelte/icons/search';
	import { Input } from '#lib/registry/ui/input/index.js';
	import { getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	interface Props {
		class?: string;
		/** Placeholder and accessible name. Default: `labels.search`. */
		placeholder?: string;
	}

	let { class: className, placeholder }: Props = $props();

	const calendar = getCalendar();
</script>

<!-- Sets the state's query: every view shows only the events whose title matches. -->
<div class={cn('relative', className)}>
	<SearchIcon
		class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
		aria-hidden="true"
	/>
	<Input
		type="search"
		class="ps-8"
		placeholder={placeholder ?? calendar.labels.search}
		aria-label={placeholder ?? calendar.labels.search}
		bind:value={calendar.query}
	/>
</div>
