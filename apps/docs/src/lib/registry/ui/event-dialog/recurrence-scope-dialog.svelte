<script lang="ts">
	import type { SeriesScope } from '@calendar-kit/core';
	import { Button } from '#lib/registry/ui/button/index.js';
	import * as Dialog from '#lib/registry/ui/dialog/index.js';
	import { getCalendar } from '#lib/registry/lib/calendar-state.svelte.js';

	const calendar = getCalendar();
	const labels = $derived(calendar.labels);
	const request = $derived(calendar.scopeRequest);

	// While mounted, changes to recurring events ask for their scope here.
	$effect(() => calendar.registerScopeDialog());

	let scope: SeriesScope = $state('this');

	// Start on the narrowest scope allowed each time the dialog opens.
	$effect.pre(() => {
		if (request) scope = request.allowThis ? 'this' : 'following';
	});

	const options = $derived(
		(
			[
				['this', labels.thisEvent],
				['following', labels.followingEvents],
				['all', labels.allEvents]
			] as const
		).filter(([value]) => value !== 'this' || request?.allowThis)
	);

	function submit(event: SubmitEvent) {
		event.preventDefault();
		void calendar.applyScope(scope);
	}
</script>

<Dialog.Root
	open={request !== null}
	onOpenChange={(open) => {
		if (!open) void calendar.applyScope(null);
	}}
>
	<Dialog.Content class="sm:max-w-sm">
		<form class="grid gap-4" onsubmit={submit}>
			<Dialog.Header>
				<Dialog.Title>
					{request?.action === 'delete' ? labels.deleteRecurring : labels.editRecurring}
				</Dialog.Title>
			</Dialog.Header>

			<fieldset class="grid gap-3">
				<legend class="sr-only">
					{request?.action === 'delete' ? labels.deleteRecurring : labels.editRecurring}
				</legend>
				{#each options as [value, label] (value)}
					<label class="flex items-center gap-2 text-sm">
						<input type="radio" name="series-scope" {value} bind:group={scope} class="size-4" />
						{label}
					</label>
				{/each}
			</fieldset>

			<Dialog.Footer class="gap-2">
				<Button variant="outline" onclick={() => calendar.applyScope(null)}>{labels.cancel}</Button>
				<Button type="submit">{labels.ok}</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
