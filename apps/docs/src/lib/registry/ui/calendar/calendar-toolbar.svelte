<script lang="ts">
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import type { CalendarView } from '@calendar-kit/core';
	import { Button } from '#lib/registry/ui/button/index.js';
	import { getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';
	import { cn } from '#lib/utils.js';

	let { class: className }: { class?: string } = $props();

	const calendar = getCalendar();
	const views: CalendarView[] = ['month', 'week', 'day'];
	const viewFields = { month: 'month', week: 'weekOfYear', day: 'day' } as const;

	// Labels come from Intl, so the toolbar is translated for any locale.
	const relative = $derived(new Intl.RelativeTimeFormat(calendar.locale, { numeric: 'auto' }));
	const fields = $derived(new Intl.DisplayNames(calendar.locale, { type: 'dateTimeField' }));
</script>

<div class={cn('flex flex-wrap items-center gap-2', className)}>
	<Button variant="outline" class="capitalize" onclick={() => calendar.goToday()}>
		{relative.format(0, 'day')}
	</Button>
	<div class="flex">
		<Button
			variant="ghost"
			size="icon"
			aria-label={relative.format(-1, calendar.view)}
			onclick={() => calendar.previous()}
		>
			<ChevronLeftIcon />
		</Button>
		<Button
			variant="ghost"
			size="icon"
			aria-label={relative.format(1, calendar.view)}
			onclick={() => calendar.next()}
		>
			<ChevronRightIcon />
		</Button>
	</div>
	<h2 class="text-lg font-semibold first-letter:uppercase" aria-live="polite">{calendar.title}</h2>

	<div class="ms-auto flex gap-0.5 rounded-lg border p-0.5" role="group">
		{#each views as view (view)}
			<Button
				size="sm"
				variant={calendar.view === view ? 'secondary' : 'ghost'}
				class="capitalize"
				aria-pressed={calendar.view === view}
				onclick={() => (calendar.view = view)}
			>
				{fields.of(viewFields[view])}
			</Button>
		{/each}
	</div>
</div>
