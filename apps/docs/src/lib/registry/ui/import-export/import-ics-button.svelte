<script lang="ts">
	import UploadIcon from '@lucide/svelte/icons/upload';
	import { parseICS, type IcsImportResult } from '@calendar-kit/core';
	import { Button, type ButtonProps } from '#lib/registry/ui/button/index.js';
	import { getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	interface Props extends ButtonProps {
		/** Called after importing, with the events and any warnings (unsupported rules, time zones…). */
		onImport?: (result: IcsImportResult) => void;
	}

	let { onImport, class: className, ...rest }: Props = $props();

	const calendar = getCalendar();
	let input: HTMLInputElement | undefined = $state();

	async function importFile(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = '';
		if (!file) return;
		const result = parseICS(await file.text(), { timeZone: calendar.timeZone });
		await calendar.importEvents(result.events);
		onImport?.(result);
	}
</script>

{#if calendar.editable}
	<Button
		variant="outline"
		size="sm"
		class={cn('print:hidden', className)}
		onclick={() => input?.click()}
		{...rest}
	>
		<UploadIcon />
		{calendar.labels.importIcs}
	</Button>
	<input
		bind:this={input}
		type="file"
		accept=".ics,text/calendar"
		class="hidden"
		aria-label={calendar.labels.importIcs}
		onchange={importFile}
	/>
{/if}
