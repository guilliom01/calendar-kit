<script lang="ts">
	interface Row {
		name: string;
		type: string;
		description: string;
	}

	let { rows, caption }: { rows: Row[]; caption: string } = $props();
</script>

<div class="my-4 overflow-x-auto rounded-lg border">
	<table class="w-full text-start text-sm">
		<caption class="sr-only">{caption}</caption>
		<thead class="bg-muted/50 text-start">
			<tr>
				<th scope="col" class="px-3 py-2 text-start font-medium">Name</th>
				<th scope="col" class="px-3 py-2 text-start font-medium">Type</th>
				<th scope="col" class="px-3 py-2 text-start font-medium">Description</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.name)}
				<tr class="border-t align-top">
					<td class="px-3 py-2 font-mono text-xs whitespace-nowrap">{row.name}</td>
					<td class="px-3 py-2 font-mono text-xs">{row.type}</td>
					<td class="px-3 py-2">{row.description}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
