<script lang="ts">
	let { code, label }: { code: string; label?: string } = $props();
</script>

<figure class="my-4">
	{#if label}<figcaption class="mb-1 text-xs text-muted-foreground">{label}</figcaption>{/if}
	<!-- Focusable so long lines can be scrolled with the keyboard. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<pre
		tabindex="0"
		class="overflow-x-auto rounded-lg border bg-muted/50 p-4 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"><code
			>{code.trim()}</code
		></pre>
</figure>
