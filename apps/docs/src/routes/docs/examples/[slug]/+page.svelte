<script lang="ts">
  import { onMount } from "svelte";
  import Code from "#lib/docs/code.svelte";
  import { exampleComponent, exampleSource } from "#lib/docs/examples/index.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  // Rendered in the browser only: prerendering would freeze the build day's dates into the HTML,
  // and hydration would then reuse those nodes for other events (and show wrong dates meanwhile).
  let mounted = $state(false);
  onMount(() => (mounted = true));

  const Example = $derived(exampleComponent(data.example.slug));
</script>

<svelte:head><title>{data.example.title} · Examples · calendar-kit docs</title></svelte:head>

<h1>{data.example.title}</h1>
<p>{data.example.description}</p>

<!-- The live example. The docs typography stops at .docs-example. -->
<section aria-label="Live example" class="docs-example my-6 flex h-[50rem] flex-col">
  {#if Example && mounted}<Example />{/if}
</section>

<h2>Code</h2>
<Code code={exampleSource(data.example.slug)} label="+page.svelte" />
