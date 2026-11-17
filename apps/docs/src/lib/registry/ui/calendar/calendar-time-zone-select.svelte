<script lang="ts">
	import { getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	interface Props {
		class?: string;
		/** Zones to offer. Defaults to every IANA zone the browser knows. */
		zones?: string[];
	}

	let { class: className, zones }: Props = $props();

	const calendar = getCalendar();

	/** Each zone with its current offset, e.g. "America/Lima (GMT-5)". */
	const options = $derived.by(() => {
		const list = new Set([...(zones ?? Intl.supportedValuesOf('timeZone')), calendar.timeZone]);
		const at = calendar.date.toDate(calendar.timeZone);
		return [...list].map((zone) => {
			const offset = new Intl.DateTimeFormat(calendar.locale, {
				timeZone: zone,
				timeZoneName: 'shortOffset'
			})
				.formatToParts(at)
				.find((part) => part.type === 'timeZoneName')?.value;
			return { zone, label: `${zone.replaceAll('_', ' ')} (${offset})` };
		});
	});
</script>

<select
	aria-label={calendar.labels.timeZone}
	title={calendar.labels.timeZone}
	class={cn(
		'h-9 max-w-48 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30',
		className
	)}
	bind:value={calendar.timeZone}
>
	{#each options as { zone, label } (zone)}
		<option value={zone}>{label}</option>
	{/each}
</select>
