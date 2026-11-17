<script lang="ts">
	import {
		DateFormatter,
		endOfMonth,
		getDayOfWeek,
		type CalendarDate
	} from '@internationalized/date';
	import {
		formatRRule,
		parseRRule,
		WEEKDAYS,
		type Frequency,
		type RecurrenceRule,
		type Weekday
	} from '@calendar-kit/core';
	import { Input } from '#lib/registry/ui/input/index.js';
	import { fillLabel, getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	interface Props {
		/** RRULE without COUNT/UNTIL, e.g. `FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE`; '' means no repeat. */
		value: string;
		onchange: (value: string) => void;
		/** First date of the event: the defaults (weekday, day of month) come from it. */
		start: CalendarDate;
		class?: string;
	}

	let { value, onchange, start, class: className }: Props = $props();

	const calendar = getCalendar();
	const labels = $derived(calendar.labels);
	const timeZone = 'UTC';

	const weekdayOf = (date: CalendarDate): Weekday => WEEKDAYS[getDayOfWeek(date, 'en-US', 'mon')]!;
	const startWeekday = $derived(weekdayOf(start));
	const week = $derived(Math.ceil(start.day / 7));
	const isLastWeek = $derived(start.day + 7 > endOfMonth(start).day);

	// Editor fields, read once from `value` (the editor is re-created per event).
	// svelte-ignore state_referenced_locally
	const initial: RecurrenceRule | undefined = value ? parseRRule(value) : undefined;
	let frequency: Frequency | '' = $state(initial?.freq ?? '');
	let interval = $state(initial?.interval ?? 1);
	// svelte-ignore state_referenced_locally
	let days: Weekday[] = $state(initial?.byDay?.map((day) => day.weekday) ?? [weekdayOf(start)]);
	let monthly: 'day' | 'weekday' = $state(initial?.byDay?.length ? 'weekday' : 'day');

	function emit() {
		if (!frequency) return onchange('');
		const rule: RecurrenceRule = { freq: frequency, interval: Math.max(1, interval || 1) };
		if (frequency === 'WEEKLY') {
			rule.byDay = WEEKDAYS.filter((day) => days.includes(day)).map((weekday) => ({ weekday }));
		} else if (frequency === 'MONTHLY') {
			if (monthly === 'day') rule.byMonthDay = [start.day];
			else rule.byDay = [{ weekday: startWeekday, n: isLastWeek ? -1 : week }];
		}
		onchange(formatRRule(rule));
	}

	function toggleDay(day: Weekday) {
		// Keep at least one day selected.
		if (days.includes(day) && days.length > 1) days = days.filter((other) => other !== day);
		else if (!days.includes(day)) days = [...days, day];
		emit();
	}

	// Names from Intl, anchored on a known Monday.
	const monday = $derived(start.subtract({ days: getDayOfWeek(start, 'en-US', 'mon') }));
	const dayName = (day: Weekday, style: 'long' | 'narrow') =>
		new DateFormatter(calendar.locale, { weekday: style, timeZone }).format(
			monday.add({ days: WEEKDAYS.indexOf(day) }).toDate(timeZone)
		);
	const units = $derived(new Intl.DisplayNames(calendar.locale, { type: 'dateTimeField' }));
	const frequencies: [Frequency, string][] = [
		['DAILY', 'day'],
		['WEEKLY', 'weekOfYear'],
		['MONTHLY', 'month'],
		['YEARLY', 'year']
	];

	const fieldClass =
		'h-9 rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';
</script>

<div class={cn('grid gap-3 text-sm', className)}>
	<div class="flex flex-wrap items-center gap-2">
		<span id="recurrence-every">{frequency ? labels.repeatEvery : labels.repeat}</span>
		{#if frequency}
			<Input
				type="number"
				min="1"
				class="w-16"
				aria-labelledby="recurrence-every"
				bind:value={interval}
				oninput={emit}
			/>
		{/if}
		<select
			class={fieldClass}
			aria-labelledby="recurrence-every"
			bind:value={frequency}
			onchange={emit}
		>
			<option value="">{labels.doesNotRepeat}</option>
			{#each frequencies as [freq, unit] (freq)}
				<option value={freq}>{units.of(unit)}</option>
			{/each}
		</select>
	</div>

	{#if frequency === 'WEEKLY'}
		<div class="flex flex-wrap items-center gap-1.5" role="group" aria-label={labels.repeatOn}>
			{#each WEEKDAYS as day (day)}
				<button
					type="button"
					class={cn(
						'inline-flex size-8 items-center justify-center rounded-full border text-xs font-medium uppercase',
						days.includes(day)
							? 'border-primary bg-primary text-primary-foreground'
							: 'hover:bg-muted'
					)}
					aria-pressed={days.includes(day)}
					aria-label={dayName(day, 'long')}
					onclick={() => toggleDay(day)}
				>
					{dayName(day, 'narrow')}
				</button>
			{/each}
		</div>
	{:else if frequency === 'MONTHLY'}
		<div class="grid gap-2">
			<label class="flex items-center gap-2">
				<input
					type="radio"
					name="recurrence-monthly"
					value="day"
					bind:group={monthly}
					onchange={emit}
				/>
				{fillLabel(labels.onDay, { day: start.day })}
			</label>
			<label class="flex items-center gap-2">
				<input
					type="radio"
					name="recurrence-monthly"
					value="weekday"
					bind:group={monthly}
					onchange={emit}
				/>
				{fillLabel(labels.onWeekday, {
					ordinal: isLastWeek ? labels.last : (labels.ordinals[week - 1] ?? String(week)),
					weekday: dayName(startWeekday, 'long')
				})}
			</label>
		</div>
	{/if}
</div>
