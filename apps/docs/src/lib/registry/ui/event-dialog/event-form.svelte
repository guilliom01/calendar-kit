<script lang="ts">
	import {
		parseDate,
		parseZonedDateTime,
		toCalendarDate,
		toTimeZone,
		type ZonedDateTime
	} from '@internationalized/date';
	import { isAllDay, resizeEvent, type CalendarEvent } from '@calendar-kit/core';
	import { Button } from '#lib/registry/ui/button/index.js';
	import { Checkbox } from '#lib/registry/ui/checkbox/index.js';
	import * as Dialog from '#lib/registry/ui/dialog/index.js';
	import { Input } from '#lib/registry/ui/input/index.js';
	import { Label } from '#lib/registry/ui/label/index.js';
	import { getCalendar, type EventDraft } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	interface Props {
		draft: EventDraft<CalendarEvent>;
		/** Colors offered in the picker; `undefined` means the theme color. */
		colors: (string | undefined)[];
	}

	let { draft, colors }: Props = $props();

	const calendar = getCalendar();
	const labels = calendar.labels;
	const timeZone = calendar.timeZone;
	// svelte-ignore state_referenced_locally
	const original = draft.event;

	const pad = (value: number) => String(value).padStart(2, '0');
	const timeOf = (value: ZonedDateTime) => {
		const local = toTimeZone(value, timeZone);
		return `${pad(local.hour)}:${pad(local.minute)}`;
	};
	const dateOf = (value: ZonedDateTime) => toCalendarDate(toTimeZone(value, timeZone)).toString();

	// Form fields. All-day end dates are shown inclusive ("ends on Friday"), stored exclusive.
	let title = $state(original.title);
	let color = $state(original.color);
	let allDay = $state(isAllDay(original));
	let startDate = $state(isAllDay(original) ? original.start.toString() : dateOf(original.start));
	let endDate = $state(
		isAllDay(original) ? original.end.subtract({ days: 1 }).toString() : dateOf(original.end)
	);
	let startTime = $state(isAllDay(original) ? '09:00' : timeOf(original.start));
	let endTime = $state(isAllDay(original) ? '10:00' : timeOf(original.end));

	const hourLabel = new Intl.DisplayNames(calendar.locale, { type: 'dateTimeField' }).of('hour');

	const zoned = (date: string, time: string) => parseZonedDateTime(`${date}T${time}[${timeZone}]`);

	function buildEvent(): CalendarEvent {
		const base = { ...original, title: title.trim(), color };
		if (allDay) {
			const start = parseDate(startDate);
			const lastDay = parseDate(endDate);
			const end = (lastDay.compare(start) < 0 ? start : lastDay).add({ days: 1 });
			return { ...base, start, end };
		}
		const start = zoned(startDate, startTime);
		return resizeEvent({ ...base, start, end: start }, zoned(endDate, endTime), {
			minDuration: calendar.snapStep
		});
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		calendar.saveDraft(buildEvent());
	}

	function remove() {
		calendar.closeDraft();
		void calendar.remove(original.id);
	}
</script>

<form class="grid gap-4" onsubmit={submit}>
	<Dialog.Header>
		<Dialog.Title>{draft.isNew ? labels.newEvent : labels.editEvent}</Dialog.Title>
	</Dialog.Header>

	<div class="grid gap-2">
		<Label for="calendar-event-title">{labels.title}</Label>
		<Input
			id="calendar-event-title"
			bind:value={title}
			placeholder={labels.untitled}
			autocomplete="off"
		/>
	</div>

	<div class="flex items-center gap-2">
		<Checkbox id="calendar-event-all-day" bind:checked={allDay} />
		<Label for="calendar-event-all-day">{labels.allDay}</Label>
	</div>

	<div class="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2">
		<Label for="calendar-event-start-date">{labels.start}</Label>
		<Input id="calendar-event-start-date" type="date" bind:value={startDate} required />
		{#if allDay}<span></span>{:else}
			<Input
				aria-label="{labels.start}, {hourLabel}"
				type="time"
				step={calendar.snapStep * 60}
				bind:value={startTime}
				required
				class="w-32"
			/>
		{/if}

		<Label for="calendar-event-end-date">{labels.end}</Label>
		<Input id="calendar-event-end-date" type="date" bind:value={endDate} required />
		{#if allDay}<span></span>{:else}
			<Input
				aria-label="{labels.end}, {hourLabel}"
				type="time"
				step={calendar.snapStep * 60}
				bind:value={endTime}
				required
				class="w-32"
			/>
		{/if}
	</div>

	<fieldset class="grid gap-2">
		<legend class="mb-2 text-sm font-medium">{labels.color}</legend>
		<div class="flex flex-wrap gap-2">
			{#each colors as option, index (option ?? 'default')}
				<label
					class={cn(
						'size-7 cursor-pointer rounded-full bg-(--swatch) ring-offset-2 ring-offset-background has-checked:ring-2 has-checked:ring-ring has-focus-visible:ring-2 has-focus-visible:ring-ring'
					)}
					style:--swatch={option ?? 'var(--primary)'}
				>
					<input
						type="radio"
						name="calendar-event-color"
						class="sr-only"
						aria-label="{labels.color} {index + 1}"
						checked={color === option}
						onchange={() => (color = option)}
					/>
				</label>
			{/each}
		</div>
	</fieldset>

	<Dialog.Footer class="gap-2 sm:justify-between">
		{#if !draft.isNew}
			<Button variant="destructive" onclick={remove}>{labels.delete}</Button>
		{:else}
			<span></span>
		{/if}
		<div class="flex gap-2">
			<Button variant="outline" onclick={() => calendar.closeDraft()}>{labels.cancel}</Button>
			<Button type="submit">{labels.save}</Button>
		</div>
	</Dialog.Footer>
</form>
