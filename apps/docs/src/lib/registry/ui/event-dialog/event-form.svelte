<script lang="ts">
	import type { Snippet } from 'svelte';
	import {
		DateFormatter,
		endOfMonth,
		getDayOfWeek,
		parseDate,
		parseZonedDateTime,
		toCalendarDate,
		toTimeZone,
		toZoned,
		type CalendarDate,
		type ZonedDateTime
	} from '@internationalized/date';
	import {
		flattenResources,
		formatRRule,
		isAllDay,
		parseRRule,
		WEEKDAYS,
		type CalendarEvent,
		type RecurrenceRule,
		type Resource
	} from '@calendar-kit/core';
	import { Button } from '#lib/registry/ui/button/index.js';
	import { Checkbox } from '#lib/registry/ui/checkbox/index.js';
	import * as Dialog from '#lib/registry/ui/dialog/index.js';
	import { Input } from '#lib/registry/ui/input/index.js';
	import { Label } from '#lib/registry/ui/label/index.js';
	import {
		fillLabel,
		getCalendar,
		type EventDraft
	} from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	interface Props {
		draft: EventDraft<CalendarEvent>;
		/** Colors offered in the picker; `undefined` means the theme color. */
		colors: (string | undefined)[];
		resources: Resource[];
		recurrence?:
			| Snippet<[{ value: string; setValue: (value: string) => void; start: CalendarDate }]>
			| undefined;
	}

	let { draft, colors, resources, recurrence }: Props = $props();

	/** Resources without children: the ones events are assigned to. */
	const assignable = $derived(
		flattenResources(resources)
			.filter((row) => !row.hasChildren)
			.map((row) => row.resource)
	);

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
	let location = $state(original.location ?? '');
	let description = $state(original.description ?? '');
	let color = $state(original.color);
	let allDay = $state(isAllDay(original));
	let startDate = $state(isAllDay(original) ? original.start.toString() : dateOf(original.start));
	let endDate = $state(
		isAllDay(original) ? original.end.subtract({ days: 1 }).toString() : dateOf(original.end)
	);
	let resourceIds = $state([...(original.resourceIds ?? [])]);
	// With calendars, every event belongs to one; new events start in the first.
	let calendarId = $state(original.calendarId ?? calendar.calendars[0]?.id);
	let progress = $state(Math.round((original.progress ?? 0) * 100));
	let startTime = $state(isAllDay(original) ? '09:00' : timeOf(original.start));
	let endTime = $state(isAllDay(original) ? '10:00' : timeOf(original.end));

	const hourLabel = new Intl.DisplayNames(calendar.locale, { type: 'dateTimeField' }).of('hour');

	const zoned = (date: string, time: string) => parseZonedDateTime(`${date}T${time}[${timeZone}]`);

	// Recurrence: a repeat pattern (the rule without its end) plus how the series ends.
	const originalRule = original.rrule ? parseRRule(original.rrule) : undefined;
	const withoutEnd = (rule: RecurrenceRule) =>
		formatRRule({ ...rule, count: undefined, until: undefined });
	let repeat = $state(originalRule ? withoutEnd(originalRule) : '');
	let ends: 'never' | 'on' | 'after' = $state(
		originalRule?.count !== undefined ? 'after' : originalRule?.until ? 'on' : 'never'
	);
	let endsAfter = $state(originalRule?.count ?? 10);
	let endsOn = $state(
		originalRule?.until
			? ('hour' in originalRule.until
					? toCalendarDate(toTimeZone(originalRule.until, timeZone))
					: originalRule.until
				).toString()
			: ''
	);

	function safeDate(value: string): CalendarDate | undefined {
		try {
			return parseDate(value);
		} catch {
			return undefined;
		}
	}

	/**
	 * Label for a rule that is not one of the presets. Weekly rules on several days read as
	 * "Every week on Monday and Wednesday"; anything else shows the rule itself.
	 */
	function describeRule(value: string) {
		const rule = parseRRule(value);
		const simpleWeekly =
			rule.freq === 'WEEKLY' &&
			(rule.interval ?? 1) === 1 &&
			!rule.byMonth &&
			!rule.bySetPos &&
			rule.byDay?.every((day) => day.n === undefined);
		if (!simpleWeekly || !rule.byDay) return fillLabel(labels.custom, { rule: value });

		const monday = parseDate('2026-11-16'); // any Monday, to name weekdays with Intl
		const name = new DateFormatter(calendar.locale, { weekday: 'long', timeZone: 'UTC' });
		const names = rule.byDay.map(({ weekday }) =>
			name.format(monday.add({ days: WEEKDAYS.indexOf(weekday) }).toDate('UTC'))
		);
		const list = new Intl.ListFormat(calendar.locale, { type: 'conjunction' }).format(names);
		return fillLabel(labels.weekly, { weekday: list });
	}

	/** The chosen start date (or the original one while the field is being typed). */
	const startDay = $derived(
		safeDate(startDate) ??
			(isAllDay(original) ? original.start : toCalendarDate(toTimeZone(original.start, timeZone)))
	);

	/** Repeat choices for the chosen start date, like "Every month on the last Friday". */
	const repeatOptions = $derived.by(() => {
		const day = startDay;
		const asDate = day.toDate(timeZone);
		const weekdayName = new DateFormatter(calendar.locale, { weekday: 'long', timeZone }).format(
			asDate
		);
		const weekday = WEEKDAYS[getDayOfWeek(day, 'en-US', 'mon')]!;
		const week = Math.ceil(day.day / 7);
		const isLast = day.day + 7 > endOfMonth(day).day;
		const options = [
			{ value: '', label: labels.doesNotRepeat },
			{ value: 'FREQ=DAILY', label: labels.daily },
			{
				value: `FREQ=WEEKLY;BYDAY=${weekday}`,
				label: fillLabel(labels.weekly, { weekday: weekdayName })
			},
			{ value: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', label: labels.weekdays },
			{
				value: `FREQ=MONTHLY;BYMONTHDAY=${day.day}`,
				label: fillLabel(labels.monthlyOnDay, { day: day.day })
			},
			{
				value: `FREQ=MONTHLY;BYDAY=${isLast ? -1 : week}${weekday}`,
				label: fillLabel(labels.monthlyOnWeekday, {
					ordinal: isLast ? labels.last : (labels.ordinals[week - 1] ?? String(week)),
					weekday: weekdayName
				})
			},
			{
				value: 'FREQ=YEARLY',
				label: fillLabel(labels.yearly, {
					date: new DateFormatter(calendar.locale, {
						day: 'numeric',
						month: 'long',
						timeZone
					}).format(asDate)
				})
			}
		];
		if (repeat && !options.some((option) => option.value === repeat)) {
			options.push({ value: repeat, label: describeRule(repeat) });
		}
		return options;
	});

	function buildRule(): string | undefined {
		if (!repeat) return undefined;
		const rule = parseRRule(repeat);
		if (ends === 'after') rule.count = Math.max(1, endsAfter);
		const lastDay = ends === 'on' ? safeDate(endsOn) : undefined;
		if (lastDay) {
			// UNTIL is inclusive: the whole last day, as a UTC time for timed events.
			rule.until = allDay
				? lastDay
				: toTimeZone(toZoned(lastDay.add({ days: 1 }), timeZone).subtract({ seconds: 1 }), 'UTC');
		}
		const formatted = formatRRule(rule);
		// Keep the original text when nothing changed, so "this event" stays available.
		return originalRule && formatted === formatRRule(originalRule) ? original.rrule : formatted;
	}

	function buildEvent(): CalendarEvent {
		const base = {
			...original,
			title: title.trim(),
			location: location.trim() || undefined,
			description: description.trim() || undefined,
			color,
			rrule: buildRule(),
			calendarId,
			resourceIds: resourceIds.length ? resourceIds : undefined,
			progress:
				original.progress === undefined ? undefined : Math.min(100, Math.max(0, progress)) / 100
		};
		// A series of extra dates only (RDATE) still needs its exclusions.
		if (!base.rrule && !base.rdates?.length) delete base.exdates;
		if (allDay) {
			const start = parseDate(startDate);
			const lastDay = parseDate(endDate);
			return { ...base, start, end: lastDay.add({ days: 1 }) };
		}
		return { ...base, start: zoned(startDate, startTime), end: zoned(endDate, endTime) };
	}

	/** Field ids, so a message can sit next to (and point to) its field. */
	const fieldIds: Record<string, string> = {
		title: 'calendar-event-title',
		location: 'calendar-event-location',
		start: 'calendar-event-start-date',
		end: 'calendar-event-end-date',
		description: 'calendar-event-description'
	};

	/** Messages by field (`title`, `end`…); other keys show above the buttons. */
	let errors: Record<string, string> = $state({});
	const otherErrors = $derived(
		Object.entries(errors)
			.filter(([field]) => !(field in fieldIds))
			.map(([, message]) => message)
	);
	const clear = (field: string) => delete errors[field];
	const invalid = (field: string) => ({
		'aria-invalid': errors[field] ? ('true' as const) : undefined,
		'aria-describedby': errors[field] ? `${fieldIds[field]}-error` : undefined
	});

	/** The built-in rule (the end after the start), then the state's `validate`. */
	function check(event: CalendarEvent) {
		const found: Record<string, string> = {};
		if ((event.end as typeof event.start).compare(event.start as never) <= 0) {
			found.end = labels.endBeforeStart;
		}
		return { ...found, ...calendar.validate(event) };
	}

	// Native select styled like the shadcn input, for accessibility and mobile pickers.
	const selectClass =
		'h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';

	function submit(submitEvent: SubmitEvent) {
		submitEvent.preventDefault();
		const event = buildEvent();
		errors = check(event);
		const first = Object.keys(errors)[0];
		if (first) {
			// Nothing is saved or corrected: the user sees why and fixes it.
			document.getElementById(fieldIds[first] ?? '')?.focus();
			return;
		}
		calendar.saveDraft(event);
	}

	function remove() {
		calendar.closeDraft();
		void calendar.remove(original.id);
	}
</script>

{#snippet message(field: string)}
	{#if errors[field]}
		<p id="{fieldIds[field]}-error" class="text-sm text-destructive">{errors[field]}</p>
	{/if}
{/snippet}

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
			oninput={() => clear('title')}
			{...invalid('title')}
		/>
		{@render message('title')}
	</div>

	<div class="grid gap-2">
		<Label for="calendar-event-location">{labels.location}</Label>
		<Input
			id="calendar-event-location"
			bind:value={location}
			autocomplete="off"
			oninput={() => clear('location')}
			{...invalid('location')}
		/>
		{@render message('location')}
	</div>

	<div class="flex items-center gap-2">
		<Checkbox id="calendar-event-all-day" bind:checked={allDay} />
		<Label for="calendar-event-all-day">{labels.allDay}</Label>
	</div>

	<div class="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2">
		<Label for="calendar-event-start-date">{labels.start}</Label>
		<Input
			id="calendar-event-start-date"
			type="date"
			bind:value={startDate}
			required
			oninput={() => clear('end')}
			{...invalid('start')}
		/>
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
		<Input
			id="calendar-event-end-date"
			type="date"
			bind:value={endDate}
			required
			oninput={() => clear('end')}
			{...invalid('end')}
		/>
		{#if allDay}<span></span>{:else}
			<Input
				aria-label="{labels.end}, {hourLabel}"
				type="time"
				step={calendar.snapStep * 60}
				bind:value={endTime}
				required
				class="w-32"
				oninput={() => clear('end')}
				aria-invalid={errors.end ? 'true' : undefined}
			/>
		{/if}
		<div class="col-span-full empty:hidden">{@render message('start')}{@render message('end')}</div>
	</div>

	{#if recurrence}
		{@render recurrence({ value: repeat, setValue: (value) => (repeat = value), start: startDay })}
	{:else}
		<div class="grid gap-2">
			<Label for="calendar-event-repeat">{labels.repeat}</Label>
			<select id="calendar-event-repeat" class={selectClass} bind:value={repeat}>
				{#each repeatOptions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>
	{/if}

	{#if repeat}
		<fieldset class="grid gap-2">
			<legend class="mb-2 text-sm font-medium">{labels.ends}</legend>
			<div class="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
				<label class="flex items-center gap-2">
					<input type="radio" name="calendar-event-ends" value="never" bind:group={ends} />
					{labels.never}
				</label>
				<span></span>

				<label class="flex items-center gap-2">
					<input type="radio" name="calendar-event-ends" value="on" bind:group={ends} />
					{labels.endsOn}
				</label>
				<Input
					type="date"
					aria-label={labels.endsOn}
					class="w-44"
					bind:value={endsOn}
					disabled={ends !== 'on'}
					required={ends === 'on'}
				/>

				<label class="flex items-center gap-2">
					<input type="radio" name="calendar-event-ends" value="after" bind:group={ends} />
					{labels.endsAfter}
				</label>
				<div class="flex items-center gap-2">
					<Input
						type="number"
						min="1"
						aria-label={labels.endsAfter}
						class="w-20"
						bind:value={endsAfter}
						disabled={ends !== 'after'}
					/>
				</div>
			</div>
		</fieldset>
	{/if}

	<div class="grid gap-2">
		<Label for="calendar-event-description">{labels.description}</Label>
		<textarea
			id="calendar-event-description"
			rows="3"
			class="min-h-16 w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
			bind:value={description}
			oninput={() => clear('description')}
			{...invalid('description')}></textarea>
		{@render message('description')}
	</div>

	{#if calendar.calendars.length}
		<div class="grid gap-2">
			<Label for="calendar-event-calendar">{labels.calendar}</Label>
			<select
				id="calendar-event-calendar"
				class="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs dark:bg-input/30"
				bind:value={calendarId}
			>
				{#each calendar.calendars as source (source.id)}
					<option value={source.id}>{source.title}</option>
				{/each}
			</select>
		</div>
	{/if}

	{#if assignable.length}
		<fieldset class="grid gap-2">
			<legend class="mb-2 text-sm font-medium">{labels.resources}</legend>
			<div class="flex flex-wrap gap-x-4 gap-y-2 text-sm">
				{#each assignable as resource (resource.id)}
					<label class="flex items-center gap-2">
						<input type="checkbox" value={resource.id} bind:group={resourceIds} />
						{resource.title}
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}

	{#if original.progress !== undefined}
		<div class="grid gap-2">
			<Label for="calendar-event-progress">{labels.progress} (%)</Label>
			<Input
				id="calendar-event-progress"
				type="number"
				min="0"
				max="100"
				step="5"
				class="w-24"
				bind:value={progress}
			/>
		</div>
	{/if}

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

	{#if otherErrors.length}
		<ul role="alert" class="grid gap-1 text-sm text-destructive">
			{#each otherErrors as text (text)}<li>{text}</li>{/each}
		</ul>
	{/if}

	<Dialog.Footer class="gap-2 sm:justify-between">
		{#if !draft.isNew && calendar.canEdit(original, 'delete')}
			<!-- Outline keeps red text at 4.5:1 contrast; the soft destructive variant does not. -->
			<Button variant="outline" class="text-destructive hover:text-destructive" onclick={remove}>
				{labels.delete}
			</Button>
		{:else}
			<span></span>
		{/if}
		<div class="flex gap-2">
			<Button variant="outline" onclick={() => calendar.closeDraft()}>{labels.cancel}</Button>
			<Button type="submit">{labels.save}</Button>
		</div>
	</Dialog.Footer>
</form>
