<script lang="ts">
	import { DateFormatter, isToday, type CalendarDate } from '@internationalized/date';
	import { groupByDay, isAllDay, type CalendarEvent, type Resource } from '@calendar-kit/core';
	import type { Snippet } from 'svelte';
	import {
		getCalendar,
		type DaySnippetArgs,
		type EventSnippetArgs,
		type PartProps
	} from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	interface Props {
		class?: string;
		/** Resources to name next to each event. */
		resources?: Resource[];
		/** Custom content for each event row (the row button stays). */
		eventContent?: Snippet<[CalendarEvent]>;
		/** Replaces a whole event row. Spread `props` to keep opening the event. */
		event?: Snippet<[Omit<EventSnippetArgs, 'dragging'> & { when: string; resources: string }]>;
		/** Replaces the day heading button. Spread `props` to keep opening the day. */
		dayHeader?: Snippet<[DaySnippetArgs]>;
	}

	let {
		class: className,
		resources = [],
		eventContent,
		event: eventSnippet,
		dayHeader
	}: Props = $props();

	const calendar = getCalendar();

	const groups = $derived(groupByDay(calendar.visibleEvents, calendar.range, calendar.timeZone));
	const resourceNames = $derived(
		new Map(resources.map((resource) => [resource.id, resource.title]))
	);

	const formatter = (options: Intl.DateTimeFormatOptions) =>
		new DateFormatter(calendar.locale, { ...options, timeZone: calendar.timeZone });
	const weekday = $derived(formatter({ weekday: 'short' }));
	const monthDay = $derived(formatter({ month: 'short' }));
	const fullDate = $derived(formatter({ dateStyle: 'full' }));
	const time = $derived(formatter({ hour: 'numeric', minute: '2-digit' }));
	const list = $derived(new Intl.ListFormat(calendar.locale, { type: 'conjunction' }));
	const toDate = (day: CalendarDate) => day.toDate(calendar.timeZone);

	function when(event: CalendarEvent) {
		return isAllDay(event)
			? calendar.labels.allDay
			: time.formatRange(event.start.toDate(), event.end.toDate());
	}

	function resourcesOf(event: CalendarEvent) {
		const names = (event.resourceIds ?? []).flatMap((id) => resourceNames.get(id) ?? []);
		return names.length ? list.format(names) : '';
	}

	function eventProps(event: CalendarEvent): PartProps {
		return {
			type: 'button',
			class: cn(
				'grid w-full grid-cols-[auto_1fr] items-center gap-x-3 rounded-md px-3 py-1.5 text-start text-sm hover:bg-muted sm:grid-cols-[auto_11rem_1fr]',
				calendar.eventClass(event)
			),
			style: `--event-color: ${event.color ?? 'var(--primary)'}`,
			onclick: (click: MouseEvent) => calendar.clickEvent(event, click)
		};
	}

	function dayHeaderProps(day: CalendarDate): PartProps {
		return {
			type: 'button',
			class: 'flex items-center gap-2 rounded text-start hover:bg-muted',
			onclick: (click: MouseEvent) => calendar.clickDate(day, click)
		};
	}
</script>

<div class={cn('min-h-0 overflow-y-auto rounded-lg border print:overflow-visible', className)}>
	{#if groups.length === 0}
		<p class="p-10 text-center text-muted-foreground">{calendar.labels.noEvents}</p>
	{/if}
	{#each groups as { day, events } (day.toString())}
		<section class="grid grid-cols-[5.5rem_1fr] border-b last:border-b-0 sm:grid-cols-[8rem_1fr]">
			<h3 class="p-3">
				{#if dayHeader}
					{@render dayHeader({
						day,
						isToday: isToday(day, calendar.timeZone),
						props: dayHeaderProps(day)
					})}
				{:else}
					<button {...dayHeaderProps(day)}>
						<span
							aria-hidden="true"
							class={cn(
								'inline-flex size-9 items-center justify-center rounded-full text-lg',
								isToday(day, calendar.timeZone) && 'bg-primary text-primary-foreground'
							)}
						>
							{day.day}
						</span>
						<span aria-hidden="true" class="text-xs leading-tight text-muted-foreground uppercase">
							{monthDay.format(toDate(day))}<br />{weekday.format(toDate(day))}
						</span>
						<span class="sr-only">{fullDate.format(toDate(day))}</span>
					</button>
				{/if}
			</h3>
			<ul class="py-1.5">
				{#each events as event (event.id)}
					<li>
						{#if eventSnippet}
							{@render eventSnippet({
								event,
								props: eventProps(event),
								when: when(event),
								resources: resourcesOf(event)
							})}
						{:else}
							<button {...eventProps(event)}>
								<span class="size-2.5 rounded-full bg-(--event-color)"></span>
								<span class="text-muted-foreground first-letter:uppercase max-sm:col-start-2">
									{when(event)}
								</span>
								<span class="min-w-0 max-sm:col-start-2">
									{#if eventContent}
										{@render eventContent(event)}
									{:else}
										<span class="font-medium">{event.title || calendar.labels.untitled}</span>
										{#if resourcesOf(event)}
											<span class="text-muted-foreground"> · {resourcesOf(event)}</span>
										{/if}
									{/if}
								</span>
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>
