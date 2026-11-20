<script lang="ts">
  import Code from "#lib/docs/code.svelte";
  import ComponentPreview from "#lib/docs/component-preview.svelte";
  import { componentContent } from "#lib/docs/components/index.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  const Content = $derived(componentContent(data.component.name));
</script>

<svelte:head><title>{data.component.name} · Components · calendar-kit docs</title></svelte:head>

<h1>{data.component.name}</h1>
<p>{data.component.summary}</p>

<ComponentPreview example={data.component.example} />

<h2>Installation</h2>
<Code
  code={`npx shadcn-svelte@latest add https://calendar-kit.calendar-kit-docs.workers.dev/r/${data.component.name}.json`}
/>
<p>
  Its dependencies, other items and npm packages, come along. <code>calendar-state</code> is installed
  with every block.
</p>

{#key data.component.name}<Content />{/key}
