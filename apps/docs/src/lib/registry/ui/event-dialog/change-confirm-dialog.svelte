<script lang="ts">
	import { DateFormatter } from '@internationalized/date';
	import { isAllDay, type CalendarEvent } from '@calendar-kit/core';
	import { Button } from '#lib/registry/ui/button/index.js';
	import * as Dialog from '#lib/registry/ui/dialog/index.js';
	import { fillLabel, getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';

	const calendar = getCalendar();
	const labels = $derived(calendar.labels);
	const request = $derived(calendar.changeRequest);

	// While mounted, drags and resizes wait for a confirmation here.
	$effect(() => calendar.registerConfirmDialog());

	/** "jueves, 19 de noviembre de 2026, 3:00 – 6:00 p. m." in the calendar's locale and zone. */
	function when(event: CalendarEvent) {
		const { locale, timeZone } = calendar;
		if (isAllDay(event)) {
			const format = new DateFormatter(locale, { dateStyle: 'full', timeZone });
			const last = event.end.subtract({ days: 1 });
			return event.start.compare(last) === 0
				? format.format(event.start.toDate(timeZone))
				: format.formatRange(event.start.toDate(timeZone), last.toDate(timeZone));
		}
		return new DateFormatter(locale, {
			dateStyle: 'full',
			timeStyle: 'short',
			timeZone
		}).formatRange(event.start.toDate(), event.end.toDate());
	}

	const isMove = $derived(request?.kind !== 'resize');
	const description = $derived(
		request
			? fillLabel(isMove ? labels.confirmMoveDescription : labels.confirmResizeDescription, {
					title: request.event.title || labels.untitled,
					when: when(request.event)
				})
			: ''
	);
</script>

<Dialog.Root
	open={request !== null}
	onOpenChange={(open) => {
		if (!open) void calendar.confirmChange(false);
	}}
>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{isMove ? labels.confirmMoveTitle : labels.confirmResizeTitle}</Dialog.Title>
			<Dialog.Description>{description}</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="gap-2">
			<Button variant="outline" onclick={() => calendar.confirmChange(false)}
				>{labels.cancel}</Button
			>
			<Button onclick={() => calendar.confirmChange(true)}>
				{isMove ? labels.move : labels.change}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
