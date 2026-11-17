<script lang="ts">
	import SheetIcon from '@lucide/svelte/icons/sheet';
	import { toCSV } from '@calendar-kit/core';
	import { Button, type ButtonProps } from '#lib/registry/ui/button/index.js';
	import { getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';
	import { download } from './download.js';

	let {
		filename = 'calendar.csv',
		class: className,
		...rest
	}: ButtonProps & { filename?: string } = $props();

	const calendar = getCalendar();

	// What the user sees: the visible range, with recurring events expanded.
	function exportVisible() {
		const csv = toCSV(calendar.visibleEvents, { timeZone: calendar.timeZone });
		// The BOM makes Excel read the file as UTF-8 (accents, ñ).
		download(filename, '﻿' + csv, 'text/csv;charset=utf-8');
	}
</script>

<Button
	variant="outline"
	size="sm"
	class={cn('print:hidden', className)}
	onclick={exportVisible}
	{...rest}
>
	<SheetIcon />
	{calendar.labels.exportCsv}
</Button>
