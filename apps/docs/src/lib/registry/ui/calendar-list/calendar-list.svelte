<script lang="ts">
	import { Checkbox } from '#lib/registry/ui/checkbox/index.js';
	import { getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	interface Props {
		class?: string;
		/** Heading of the list. Default: `labels.calendars`. */
		title?: string;
	}

	let { class: className, title }: Props = $props();

	const calendar = getCalendar();
</script>

<!-- One checkbox per calendar of the state's `calendars`, in its color. Hidden when there are none. -->
{#if calendar.calendars.length}
	<fieldset class={cn('grid gap-2 text-sm', className)}>
		<legend class="mb-2 font-medium">{title ?? calendar.labels.calendars}</legend>
		{#each calendar.calendars as source (source.id)}
			<label class="flex items-center gap-2">
				<Checkbox
					checked={!calendar.hiddenCalendars.has(source.id)}
					onCheckedChange={(checked) => calendar.setCalendarVisible(source.id, checked)}
					style={source.color ? `--primary: ${source.color}` : undefined}
				/>
				{source.title}
			</label>
		{/each}
	</fieldset>
{/if}
