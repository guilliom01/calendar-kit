<script lang="ts">
	import * as Dialog from '#lib/registry/ui/dialog/index.js';
	import { getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';
	import EventForm from './event-form.svelte';

	interface Props {
		/** Colors offered in the picker (any CSS color); `undefined` means the theme color. */
		colors?: (string | undefined)[];
	}

	let {
		colors = [
			undefined,
			'oklch(0.6 0.15 250)',
			'oklch(0.65 0.15 150)',
			'oklch(0.7 0.15 70)',
			'oklch(0.6 0.2 25)',
			'oklch(0.6 0.2 300)'
		]
	}: Props = $props();

	const calendar = getCalendar();
</script>

<Dialog.Root
	open={calendar.draft !== null}
	onOpenChange={(open) => {
		if (!open) calendar.closeDraft();
	}}
>
	<Dialog.Content class="sm:max-w-md">
		{#if calendar.draft}
			{#key calendar.draft}
				<EventForm draft={calendar.draft} {colors} />
			{/key}
		{/if}
	</Dialog.Content>
</Dialog.Root>
