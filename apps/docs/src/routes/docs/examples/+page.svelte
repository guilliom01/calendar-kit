<script lang="ts">
  import { resolve } from "$app/paths";
  import { examples } from "#lib/docs/examples/index.js";
</script>

<svelte:head><title>Examples · calendar-kit docs</title></svelte:head>

<h1>Examples</h1>
<p>
  One working example per feature, from the simplest calendar to the advanced blocks. Each page
  shows the calendar running and its complete code, taken from the very file that runs.
</p>

<ol class="mt-6 grid gap-3 sm:grid-cols-2">
  {#each examples as example (example.slug)}
    <li>
      <a
        href={resolve("/docs/examples/[slug]", { slug: example.slug })}
        class="block h-full rounded-lg border p-4 hover:bg-muted"
      >
        <span class="font-medium">{example.title}</span>
        <span class="mt-1 block text-sm text-muted-foreground">{example.description}</span>
      </a>
    </li>
  {/each}
</ol>
