<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setCalendar, type CalendarState } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	interface Props {
		/** Create it with `new CalendarState({ events, locale, timeZone, onMutate })`. */
		state: CalendarState;
		class?: string;
		/** Undo/redo with Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl+Y. */
		shortcuts?: boolean;
		children?: Snippet;
	}

	let { state, class: className, shortcuts = true, children }: Props = $props();

	// svelte-ignore state_referenced_locally
	setCalendar(state);

	// Loads the visible range when `loadEvents` is set (cached per month).
	$effect(() => {
		void state.ensureLoaded(state.range);
	});

	function onKeydown(event: KeyboardEvent) {
		const target = event.target as HTMLElement | null;
		const typing = target?.closest('input, textarea, select, [contenteditable]');
		if (!shortcuts || !state.editable || typing || state.draft) return;
		if (!(event.ctrlKey || event.metaKey)) return;

		const key = event.key.toLowerCase();
		if (key === 'z' && !event.shiftKey) {
			event.preventDefault();
			void state.undo();
		} else if ((key === 'z' && event.shiftKey) || key === 'y') {
			event.preventDefault();
			void state.redo();
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class={cn('flex h-full min-h-0 flex-col gap-3', className)}>
	{@render children?.()}
</div>
