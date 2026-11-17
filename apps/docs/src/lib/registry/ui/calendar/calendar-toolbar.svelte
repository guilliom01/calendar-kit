<script lang="ts">
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Redo2Icon from '@lucide/svelte/icons/redo-2';
	import Undo2Icon from '@lucide/svelte/icons/undo-2';
	import { isToday, now, toZoned } from '@internationalized/date';
	import type { CalendarView } from '@calendar-kit/core';
	import { Button } from '#lib/registry/ui/button/index.js';
	import { getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	let { class: className }: { class?: string } = $props();

	const calendar = getCalendar();
	const views: CalendarView[] = ['month', 'week', 'day'];
	const viewFields = { month: 'month', week: 'weekOfYear', day: 'day' } as const;

	// Labels come from Intl, so the toolbar is translated for any locale.
	const relative = $derived(new Intl.RelativeTimeFormat(calendar.locale, { numeric: 'auto' }));
	const fields = $derived(new Intl.DisplayNames(calendar.locale, { type: 'dateTimeField' }));

	/** Every IANA time zone with its current offset, e.g. "America/Lima (GMT-5)". */
	const timeZones = $derived.by(() => {
		const zones = new Set([...Intl.supportedValuesOf('timeZone'), calendar.timeZone]);
		const at = calendar.date.toDate(calendar.timeZone);
		return [...zones].map((zone) => {
			const offset = new Intl.DateTimeFormat(calendar.locale, {
				timeZone: zone,
				timeZoneName: 'shortOffset'
			})
				.formatToParts(at)
				.find((part) => part.type === 'timeZoneName')?.value;
			return { zone, label: `${zone.replaceAll('_', ' ')} (${offset})` };
		});
	});

	/** One-hour event at the next full hour today, or at 9:00 on the focused date. */
	function newEvent() {
		const { date, timeZone } = calendar;
		const start = isToday(date, timeZone)
			? now(timeZone).add({ hours: 1 }).set({ minute: 0, second: 0, millisecond: 0 })
			: toZoned(date, timeZone).set({ hour: 9 });
		calendar.compose(start, start.add({ hours: 1 }));
	}
</script>

<div class={cn('flex flex-wrap items-center gap-2', className)}>
	{#if calendar.editable}
		<Button onclick={newEvent}>
			<PlusIcon />
			{calendar.labels.newEvent}
		</Button>
	{/if}
	<Button variant="outline" class="capitalize" onclick={() => calendar.goToday()}>
		{relative.format(0, 'day')}
	</Button>
	<div class="flex">
		<Button
			variant="ghost"
			size="icon"
			aria-label={relative.format(-1, calendar.view)}
			onclick={() => calendar.previous()}
		>
			<ChevronLeftIcon />
		</Button>
		<Button
			variant="ghost"
			size="icon"
			aria-label={relative.format(1, calendar.view)}
			onclick={() => calendar.next()}
		>
			<ChevronRightIcon />
		</Button>
	</div>
	<h2 class="text-lg font-semibold first-letter:uppercase" aria-live="polite">{calendar.title}</h2>

	<div class="ms-auto flex flex-wrap items-center gap-2">
		<select
			aria-label={calendar.labels.timeZone}
			title={calendar.labels.timeZone}
			class="h-9 max-w-48 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
			bind:value={calendar.timeZone}
		>
			{#each timeZones as { zone, label } (zone)}
				<option value={zone}>{label}</option>
			{/each}
		</select>
		{#if calendar.editable}
			<div class="flex">
				<Button
					variant="ghost"
					size="icon"
					aria-label={calendar.labels.undo}
					title={calendar.labels.undo}
					disabled={!calendar.canUndo}
					onclick={() => calendar.undo()}
				>
					<Undo2Icon />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					aria-label={calendar.labels.redo}
					title={calendar.labels.redo}
					disabled={!calendar.canRedo}
					onclick={() => calendar.redo()}
				>
					<Redo2Icon />
				</Button>
			</div>
		{/if}
		<div class="flex gap-0.5 rounded-lg border p-0.5" role="group">
			{#each views as view (view)}
				<Button
					size="sm"
					variant={calendar.view === view ? 'secondary' : 'ghost'}
					class="capitalize"
					aria-pressed={calendar.view === view}
					onclick={() => (calendar.view = view)}
				>
					{fields.of(viewFields[view])}
				</Button>
			{/each}
		</div>
	</div>
</div>
