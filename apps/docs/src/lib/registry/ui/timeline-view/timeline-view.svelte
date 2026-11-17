<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { DateFormatter, isToday, type CalendarDate } from '@internationalized/date';
	import {
		eventsForResource,
		flattenResources,
		isAllDay,
		layoutWeekRow,
		type CalendarEvent
	} from '@calendar-kit/core';
	import type { Snippet } from 'svelte';
	import { dragAcrossDays, withPreview } from '#lib/registry/lib/calendar-drag.js';
	import { getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	interface Props {
		class?: string;
		/** Custom content inside each event bar. */
		eventContent?: Snippet<[CalendarEvent]>;
	}

	let { class: className, eventContent }: Props = $props();

	const calendar = getCalendar();

	let preview: CalendarEvent | null = $state.raw(null);

	const days = $derived(calendar.days);
	const events = $derived(withPreview(calendar.visibleEvents, preview));
	const rows = $derived.by(() => {
		const resourceRows = flattenResources(calendar.resources, calendar.collapsed).map((row) => ({
			...row,
			id: row.resource.id,
			title: row.resource.title,
			items: layoutWeekRow(eventsForResource(events, row.resource.id), days, calendar.timeZone)
		}));
		const unassigned = events.filter((event) => !event.resourceIds?.length);
		if (unassigned.length === 0) return resourceRows;
		return [
			...resourceRows,
			{
				id: '',
				title: calendar.labels.unassigned,
				depth: 0,
				hasChildren: false,
				items: layoutWeekRow(unassigned, days, calendar.timeZone)
			}
		];
	});

	const formatter = (options: Intl.DateTimeFormatOptions) =>
		new DateFormatter(calendar.locale, { ...options, timeZone: calendar.timeZone });
	const weekday = $derived(formatter({ weekday: 'short' }));
	const fullDate = $derived(formatter({ dateStyle: 'full' }));
	const time = $derived(formatter({ hour: 'numeric', minute: '2-digit' }));
	const toDate = (day: CalendarDate) => day.toDate(calendar.timeZone);
	const dayColumns = $derived(`repeat(${days.length}, minmax(0, 1fr))`);

	function toggle(id: string) {
		if (calendar.collapsed.has(id)) calendar.collapsed.delete(id);
		else calendar.collapsed.add(id);
	}

	function startDrag(down: PointerEvent, event: CalendarEvent) {
		if (!calendar.editable) return;
		dragAcrossDays(down, event, {
			onPreview: (moved) => (preview = moved),
			onDrop: (moved) => {
				if (moved) void calendar.update(moved);
			}
		});
	}

	function openEvent(event: CalendarEvent) {
		calendar.edit(event);
	}

	function onEventKey(key: KeyboardEvent, event: CalendarEvent) {
		if ((key.key === 'Delete' || key.key === 'Backspace') && calendar.editable) {
			key.preventDefault();
			void calendar.remove(event.id);
		}
	}
</script>

<div class={cn('min-h-0 overflow-auto rounded-lg border select-none', className)}>
	<div class="grid min-w-3xl grid-cols-[minmax(9rem,14rem)_1fr]">
		<div class="sticky top-0 left-0 z-20 border-e border-b bg-muted"></div>
		<div class="sticky top-0 z-10 grid border-b bg-muted" style:grid-template-columns={dayColumns}>
			{#each days as day (day.toString())}
				<button
					type="button"
					class="flex items-center justify-center gap-1.5 py-2 text-sm hover:bg-background/60"
					aria-label={fullDate.format(toDate(day))}
					onclick={() => calendar.openDay(day)}
				>
					<span class="text-xs text-muted-foreground capitalize">{weekday.format(toDate(day))}</span
					>
					<span
						class={cn(
							'inline-flex size-7 items-center justify-center rounded-full',
							isToday(day, calendar.timeZone) && 'bg-primary text-primary-foreground'
						)}
					>
						{day.day}
					</span>
				</button>
			{/each}
		</div>

		{#each rows as row (row.id)}
			{@const lanes = Math.max(1, ...row.items.map((item) => item.lane + 1))}
			<div
				class="sticky left-0 z-10 flex items-start border-e border-b bg-background px-2 py-1.5 text-sm"
				style:padding-inline-start="{0.5 + row.depth * 1.25}rem"
			>
				{#if row.hasChildren}
					<button
						type="button"
						class="flex items-center gap-1 rounded font-medium hover:bg-muted"
						aria-expanded={!calendar.collapsed.has(row.id)}
						onclick={() => toggle(row.id)}
					>
						{#if calendar.collapsed.has(row.id)}<ChevronRightIcon
								class="size-4"
							/>{:else}<ChevronDownIcon class="size-4" />{/if}
						{row.title}
					</button>
				{:else}
					<span class={cn('truncate', !row.id && 'text-muted-foreground italic')}>{row.title}</span>
				{/if}
			</div>

			<div class="relative border-b" style:min-height="calc({lanes} * 1.625rem + 0.5rem)">
				<div class="absolute inset-0 grid" style:grid-template-columns={dayColumns}>
					{#each days as day (day.toString())}
						<!-- Clicking an empty cell creates an all-day event for this resource. -->
						<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
						<div
							data-date={day.toString()}
							data-resource={row.id}
							class={cn(
								'border-e last:border-e-0',
								isToday(day, calendar.timeZone) && 'bg-primary/5'
							)}
							onclick={() =>
								calendar.compose(
									day,
									day.add({ days: 1 }),
									row.id ? { resourceIds: [row.id] } : {}
								)}
						></div>
					{/each}
				</div>

				<div
					class="pointer-events-none relative grid auto-rows-[1.5rem] gap-y-0.5 py-1"
					style:grid-template-columns={dayColumns}
				>
					{#each row.items as item (item.event.id)}
						{@const event = item.event}
						<button
							type="button"
							class={cn(
								'pointer-events-auto mx-0.5 flex min-w-0 touch-none items-center gap-1 rounded bg-(--event-color)/20 px-1.5 text-start text-xs font-medium hover:bg-(--event-color)/30',
								item.continuesBefore && 'ms-0 rounded-s-none',
								item.continuesAfter && 'me-0 rounded-e-none',
								preview?.id === event.id && 'opacity-70 shadow-md'
							)}
							style:grid-column="{item.startIndex + 1} / span {item.span}"
							style:grid-row={item.lane + 1}
							style:--event-color={event.color ?? 'var(--primary)'}
							title={event.title || calendar.labels.untitled}
							onpointerdown={(down) => startDrag(down, event)}
							onclick={() => openEvent(event)}
							onkeydown={(key) => onEventKey(key, event)}
						>
							{#if eventContent}
								{@render eventContent(event)}
							{:else}
								{#if !isAllDay(event)}
									<span class="shrink-0 text-muted-foreground"
										>{time.format(event.start.toDate())}</span
									>
								{/if}
								<span class="truncate">{event.title || calendar.labels.untitled}</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
