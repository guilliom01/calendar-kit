<script lang="ts">
	import { Button } from '#lib/registry/ui/button/index.js';
	import { getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	let { class: className }: { class?: string } = $props();

	const calendar = getCalendar();
	const fields = $derived(new Intl.DisplayNames(calendar.locale, { type: 'dateTimeField' }));

	/** The view's own label, then Intl for calendar units, then `labels`, then its name. */
	function labelOf(name: string, label?: string) {
		if (label) return label;
		const intl: Record<string, string> = {
			month: 'month',
			week: 'weekOfYear',
			day: 'day',
			year: 'year'
		};
		if (intl[name]) return fields.of(intl[name]) ?? name;
		return ((calendar.labels as Record<string, unknown>)[name] as string | undefined) ?? name;
	}
</script>

{#if calendar.views.size > 1}
	<div
		class={cn('flex flex-wrap gap-0.5 rounded-lg border p-0.5 print:hidden', className)}
		role="group"
		aria-label={calendar.labels.views}
	>
		{#each calendar.views.values() as view (view.name)}
			<Button
				size="sm"
				variant={calendar.view === view.name ? 'secondary' : 'ghost'}
				aria-pressed={calendar.view === view.name}
				onclick={() => (calendar.view = view.name)}
			>
				<span class="inline-block first-letter:uppercase">{labelOf(view.name, view.label)}</span>
			</Button>
		{/each}
	</div>
{/if}
