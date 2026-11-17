<script lang="ts">
	import { getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	let { class: className }: { class?: string } = $props();

	const calendar = getCalendar();
</script>

<h2 class={cn('text-lg font-semibold first-letter:uppercase', className)} aria-live="polite">
	{calendar.title}
</h2>
