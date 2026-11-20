<script lang="ts">
  import { onMount } from "svelte";
  import { Tabs } from "bits-ui";
  import Code from "./code.svelte";
  import { exampleComponent, exampleSource } from "./examples/index.js";

  let { example }: { example: string } = $props();

  // Rendered in the browser only, like the example pages: prerendering would freeze dates.
  let mounted = $state(false);
  onMount(() => (mounted = true));

  const Example = $derived(exampleComponent(example));
  const trigger =
    "rounded-md px-3 py-1 text-sm text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
</script>

<Tabs.Root value="preview" class="my-6">
  <Tabs.List class="inline-flex gap-1 rounded-lg bg-muted p-1">
    <Tabs.Trigger value="preview" class={trigger}>Preview</Tabs.Trigger>
    <Tabs.Trigger value="code" class={trigger}>Code</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="preview" class="mt-3 rounded-lg border p-4">
    <!-- The docs typography stops at .docs-example. -->
    <section aria-label="Live example" class="docs-example flex h-[40rem] flex-col">
      {#if Example && mounted}<Example />{/if}
    </section>
  </Tabs.Content>
  <Tabs.Content value="code" class="mt-3 max-h-[40rem] overflow-y-auto">
    <Code code={exampleSource(example)} label="+page.svelte" />
  </Tabs.Content>
</Tabs.Root>
