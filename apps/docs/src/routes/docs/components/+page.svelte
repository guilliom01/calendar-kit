<script lang="ts">
  import { resolve } from "$app/paths";
  import { components } from "#lib/docs/components/index.js";
</script>

<svelte:head><title>Components · calendar-kit docs</title></svelte:head>

<h1>Components</h1>
<p>
  Every block is an item of the registry. Add the ones you need and leave out the rest; each page
  shows it working, how to install it and its props.
</p>

<ul class="mt-6 grid gap-3 sm:grid-cols-2">
  {#each components as component (component.name)}
    <li>
      <a
        href={resolve("/docs/components/[name]", { name: component.name })}
        class="block h-full rounded-lg border p-4 hover:bg-muted"
      >
        <span class="font-medium">{component.name}</span>
        <span class="mt-1 block text-sm text-muted-foreground">{component.summary}</span>
      </a>
    </li>
  {/each}
</ul>
