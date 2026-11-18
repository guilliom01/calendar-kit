<script lang="ts">
	import { DateFormatter, now, toCalendarDate, type ZonedDateTime } from '@internationalized/date';
	import {
		findFreeSlots,
		flattenResources,
		type Resource,
		type WorkingHours
	} from '@calendar-kit/core';
	import type { Snippet } from 'svelte';
	import { getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	interface Slot {
		start: ZonedDateTime;
		end: ZonedDateTime;
	}

	interface Props {
		class?: string;
		/** People, rooms… to pick from. Only resources without children are listed. */
		resources: Resource[];
		/** Meeting lengths offered, in minutes. */
		durations?: number[];
		/** Days searched, from today. */
		days?: number;
		/** Default Monday to Friday, 9:00 to 18:00; `null` searches whole days. */
		workingHours?: WorkingHours | null;
		/** Most suggestions shown. */
		limit?: number;
		/** Replaces each suggestion. Call `select` to open it as a new event. */
		suggestion?: Snippet<[{ slot: Slot; label: string; select: () => void }]>;
	}

	let {
		class: className,
		resources,
		durations = [30, 60, 90, 120],
		days = 14,
		workingHours,
		limit = 5,
		suggestion
	}: Props = $props();

	const calendar = getCalendar();
	const id = $props.id();

	let picked: string[] = $state([]);
	let duration = $state(60);

	const people = $derived(
		flattenResources(resources)
			.filter((row) => !row.hasChildren)
			.map((row) => row.resource)
	);

	// Every stored event counts, even of hidden calendars: hiding is not being free.
	const slots = $derived.by(() => {
		if (!picked.length) return [];
		const from = now(calendar.timeZone);
		const start = toCalendarDate(from);
		return findFreeSlots(calendar.events, {
			range: { start, end: start.add({ days }) },
			duration,
			timeZone: calendar.timeZone,
			resourceIds: picked,
			after: from,
			limit,
			...(workingHours !== undefined && { workingHours })
		});
	});

	const range = $derived(
		new DateFormatter(calendar.locale, {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			hour: 'numeric',
			minute: '2-digit',
			timeZone: calendar.timeZone
		})
	);
	const minutes = $derived(
		new Intl.NumberFormat(calendar.locale, { style: 'unit', unit: 'minute', unitDisplay: 'long' })
	);

	/** Opens the slot as a new event for the picked participants (through `onSelect`). */
	const selectSlot = (slot: Slot) =>
		calendar.select({
			start: slot.start,
			end: slot.end,
			allDay: false,
			fields: { resourceIds: [...picked] }
		});
</script>

<!-- Finds times when every picked participant is free; a suggestion opens as a new event. -->
<div class={cn('grid gap-4 text-sm', className)}>
	<fieldset class="grid gap-2">
		<legend class="mb-2 font-medium">{calendar.labels.participants}</legend>
		{#each people as person (person.id)}
			<label class="flex items-center gap-2">
				<input type="checkbox" value={person.id} bind:group={picked} />
				{person.title}
			</label>
		{/each}
	</fieldset>

	<div class="grid gap-2">
		<label for="{id}-duration" class="font-medium">{calendar.labels.duration}</label>
		<select
			id="{id}-duration"
			class="h-9 rounded-md border border-input bg-transparent px-3 shadow-xs dark:bg-input/30"
			bind:value={duration}
		>
			{#each durations as option (option)}
				<option value={option}>{minutes.format(option)}</option>
			{/each}
		</select>
	</div>

	{#if picked.length}
		{#if slots.length}
			<ul class="grid gap-1" aria-label={calendar.labels.suggestions}>
				{#each slots as slot (slot.start.toString())}
					{@const label = range.formatRange(slot.start.toDate(), slot.end.toDate())}
					<li>
						{#if suggestion}
							{@render suggestion({ slot, label, select: () => selectSlot(slot) })}
						{:else}
							<button
								type="button"
								class="w-full rounded-md border px-3 py-2 text-start first-letter:uppercase hover:bg-muted"
								onclick={() => selectSlot(slot)}
							>
								{label}
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-muted-foreground">{calendar.labels.noFreeTime}</p>
		{/if}
	{/if}
</div>
