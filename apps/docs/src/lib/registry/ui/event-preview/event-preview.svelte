<script lang="ts">
	import type { CalendarEvent } from '@calendar-kit/core';
	import type { Snippet } from 'svelte';
	import { getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	interface Props {
		class?: string;
		/** The views. Hovering or focusing an event inside them shows its preview. */
		children: Snippet;
		/** Replaces the card's content. */
		content?: Snippet<[{ event: CalendarEvent }]>;
		/** Milliseconds the pointer rests on an event before the card shows. */
		delay?: number;
	}

	let { class: className, children, content, delay = 500 }: Props = $props();

	const calendar = getCalendar();
	const id = $props.id();

	// While mounted, views drop their native `title` tooltips.
	$effect(() => calendar.registerPreview());

	let shown: { event: CalendarEvent; anchor: HTMLElement } | null = $state.raw(null);
	let card: HTMLElement | undefined = $state();
	let position = $state({ top: 0, left: 0 });
	let timer: ReturnType<typeof setTimeout> | undefined;

	function eventElement(target: EventTarget | null) {
		return (target as Element | null)?.closest<HTMLElement>('[data-event-id]') ?? null;
	}

	function show(anchor: HTMLElement) {
		clearTimeout(timer);
		const event = calendar.visibleEvents.find(
			(candidate) => candidate.id === anchor.dataset.eventId
		);
		if (!event || shown?.anchor === anchor) return;
		hide();
		anchor.setAttribute('aria-describedby', id);
		shown = { event, anchor };
	}

	function hide() {
		clearTimeout(timer);
		shown?.anchor.removeAttribute('aria-describedby');
		shown = null;
	}

	/** Hides after a short grace period, so the pointer can travel onto the card. */
	const hideSoon = () => {
		clearTimeout(timer);
		timer = setTimeout(hide, 150);
	};

	function onpointerover(over: PointerEvent) {
		if (over.pointerType === 'touch') return;
		const anchor = eventElement(over.target);
		clearTimeout(timer);
		if (!anchor)
			hideSoon(); // grace period to cross empty space onto the card
		else if (anchor !== shown?.anchor) {
			// Another event: the old card would cover the way, so it goes at once.
			hide();
			timer = setTimeout(() => show(anchor), delay);
		}
	}

	// Below the event, or above it when there is no room; always inside the viewport.
	$effect(() => {
		if (!shown || !card) return;
		const rect = shown.anchor.getBoundingClientRect();
		const { width, height } = card.getBoundingClientRect();
		const below = rect.bottom + 6 + height <= window.innerHeight;
		position = {
			top: below ? rect.bottom + 6 : Math.max(6, rect.top - 6 - height),
			left: Math.min(Math.max(6, rect.left), window.innerWidth - width - 6)
		};
	});

	$effect(() => {
		if (!shown) return;
		const onKey = (key: KeyboardEvent) => {
			if (key.key === 'Escape') hide();
		};
		window.addEventListener('keydown', onKey);
		window.addEventListener('scroll', hide, { capture: true, once: true });
		return () => {
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('scroll', hide, { capture: true });
		};
	});
</script>

<!-- One card for every event in the views: shown on hover (after `delay`) or focus, closed by
     Escape, scrolling, pressing or leaving. The pointer can move onto it (WCAG 1.4.13). -->
<div
	class={cn('flex min-h-0 flex-1 flex-col', className)}
	role="presentation"
	{onpointerover}
	onpointerleave={hideSoon}
	onpointerdown={hide}
	onfocusin={(focus) => {
		// Keyboard focus only: focus restored after a mouse action (e.g. closing a dialog) must
		// not pop a card over the calendar.
		const anchor = eventElement(focus.target);
		if (anchor?.matches(':focus-visible')) show(anchor);
		else hide();
	}}
	onfocusout={(focus) => {
		if (!eventElement(focus.relatedTarget)) hide();
	}}
>
	{@render children()}
</div>

{#if shown}
	{@const event = shown.event}
	<div
		bind:this={card}
		{id}
		role="tooltip"
		class="fixed z-50 w-64 rounded-md border bg-popover p-3 text-sm text-popover-foreground shadow-md print:hidden"
		style:top="{position.top}px"
		style:left="{position.left}px"
		onpointerenter={() => clearTimeout(timer)}
		onpointerleave={hideSoon}
	>
		{#if content}
			{@render content({ event })}
		{:else}
			{@const source = calendar.calendars.find((candidate) => candidate.id === event.calendarId)}
			<div class="flex items-start gap-2">
				<span
					class="mt-1.5 size-2.5 shrink-0 rounded-full bg-(--event-color)"
					style:--event-color={calendar.colorOf(event)}
				></span>
				<div class="grid gap-0.5">
					<p class="font-medium">{event.title || calendar.labels.untitled}</p>
					<p class="text-muted-foreground first-letter:uppercase">{calendar.describe(event)}</p>
					{#if source}<p class="text-muted-foreground">{source.title}</p>{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}
