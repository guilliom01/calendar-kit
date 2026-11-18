<script lang="ts">
	import { Button } from '#lib/registry/ui/button/index.js';
	import { getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	interface Props {
		class?: string;
		/**
		 * `buttons`, a `select`, or `auto`: buttons when the calendar is at least 42rem wide and a
		 * select below that (a container query on `FullCalendar.Root`).
		 */
		variant?: 'buttons' | 'select' | 'auto';
	}

	let { class: className, variant = 'auto' }: Props = $props();

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

	// Options cannot be styled with ::first-letter, so the select gets it in the text.
	const capitalized = (text: string) =>
		text.charAt(0).toLocaleUpperCase(calendar.locale) + text.slice(1);
</script>

{#if calendar.views.size > 1}
	{#if variant !== 'buttons'}
		<select
			class={cn(
				'h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs dark:bg-input/30 print:hidden',
				variant === 'auto' && '@2xl/calendar:hidden',
				className
			)}
			aria-label={calendar.labels.views}
			bind:value={calendar.view}
		>
			{#each calendar.views.values() as view (view.name)}
				<option value={view.name}>{capitalized(labelOf(view.name, view.label))}</option>
			{/each}
		</select>
	{/if}
	{#if variant !== 'select'}
		<div
			class={cn(
				'flex flex-wrap gap-0.5 rounded-lg border p-0.5 print:hidden',
				variant === 'auto' && 'hidden @2xl/calendar:flex',
				className
			)}
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
{/if}
