<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { isToday, now, toZoned } from '@internationalized/date';
	import { Button } from '#lib/registry/ui/button/index.js';
	import { getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';

	let { class: className }: { class?: string } = $props();

	const calendar = getCalendar();

	/** One-hour event at the next full hour today, or at 9:00 on the focused date. */
	function newEvent() {
		const { date, timeZone } = calendar;
		const start = isToday(date, timeZone)
			? now(timeZone).add({ hours: 1 }).set({ minute: 0, second: 0, millisecond: 0 })
			: toZoned(date, timeZone).set({ hour: 9 });
		calendar.select({ start, end: start.add({ hours: 1 }), allDay: false, fields: {} });
	}
</script>

{#if calendar.editable}
	<Button class={className} onclick={newEvent}>
		<PlusIcon />
		{calendar.labels.newEvent}
	</Button>
{/if}
