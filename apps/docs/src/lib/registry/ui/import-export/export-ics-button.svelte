<script lang="ts">
	import DownloadIcon from '@lucide/svelte/icons/download';
	import { toICS } from '@calendar-kit/core';
	import { Button, type ButtonProps } from '#lib/registry/ui/button/index.js';
	import { getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';
	import { download } from './download.js';

	interface Props extends ButtonProps {
		filename?: string;
		/** Calendar name stored in the file (X-WR-CALNAME). */
		name?: string;
	}

	let { filename = 'calendar.ics', name, class: className, ...rest }: Props = $props();

	const calendar = getCalendar();
</script>

<!-- Series are exported once, with their rule, so other apps repeat them too. -->
<Button
	variant="outline"
	size="sm"
	class={cn('print:hidden', className)}
	onclick={() => download(filename, toICS(calendar.events, { name }), 'text/calendar')}
	{...rest}
>
	<DownloadIcon />
	{calendar.labels.exportIcs}
</Button>
