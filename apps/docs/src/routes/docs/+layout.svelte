<script lang="ts">
  import { page } from "$app/state";
  import { navGroups, neighbours } from "#lib/docs/nav.js";
  import OnThisPage from "#lib/docs/on-this-page.svelte";
  import type { LayoutProps } from "./$types";

  let { children }: LayoutProps = $props();

  let article: HTMLElement | undefined = $state();
  const around = $derived(neighbours(page.url.pathname));
  const currentLabel = $derived(
    navGroups.flatMap((group) => group.links).find((link) => link.href === page.url.pathname)
      ?.label,
  );
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- nav.ts resolves every href -->
{#snippet sidebar()}
  <div class="grid gap-6 text-sm">
    {#each navGroups as group (group.title)}
      <div>
        <p class="mb-1 px-2 text-xs font-medium text-muted-foreground">{group.title}</p>
        <ul class="grid gap-0.5">
          {#each group.links as link (link.href)}
            <li>
              <a
                href={link.href}
                aria-current={page.url.pathname === link.href ? "page" : undefined}
                class="block rounded-md px-2 py-1 text-foreground/80 hover:bg-muted hover:text-foreground aria-[current=page]:bg-muted aria-[current=page]:font-medium aria-[current=page]:text-foreground"
              >
                {link.label}
              </a>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>
{/snippet}

<div class="mx-auto flex h-full max-w-screen-2xl flex-col md:flex-row">
  <nav aria-label="Documentation" class="shrink-0 border-b md:w-60 md:border-e md:border-b-0">
    <!-- A collapsible menu on phones, a scrollable sidebar from md up. -->
    <details class="md:hidden">
      <summary class="cursor-pointer px-4 py-2 text-sm font-medium">
        Menu{#if currentLabel}<span class="text-muted-foreground"> · {currentLabel}</span>{/if}
      </summary>
      <div class="max-h-[60dvh] overflow-y-auto px-2 pb-4">{@render sidebar()}</div>
    </details>
    <div class="hidden h-full overflow-y-auto px-3 py-6 md:block">{@render sidebar()}</div>
  </nav>
  <!-- Focusable so keyboard users can scroll it even when a page has no links. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <article
    bind:this={article}
    lang="en"
    tabindex="0"
    aria-label="Documentation"
    class="min-w-0 flex-1 overflow-y-auto outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
  >
    <div class="mx-auto flex max-w-6xl gap-12 px-4 py-8 pb-24 md:px-10">
      <div class="docs min-w-0 flex-1">
        {@render children()}
        {#if around.previous || around.next}
          <nav
            aria-label="Previous and next"
            class="mt-16 flex justify-between gap-4 border-t pt-6 text-sm"
          >
            {#if around.previous}
              <a
                href={around.previous.href}
                class="docs-pager rounded-md border px-4 py-2 hover:bg-muted"
                >← {around.previous.label}</a
              >
            {:else}<span></span>{/if}
            {#if around.next}
              <a
                href={around.next.href}
                class="docs-pager rounded-md border px-4 py-2 hover:bg-muted"
                >{around.next.label} →</a
              >
            {/if}
          </nav>
        {/if}
      </div>
      <OnThisPage container={article} />
    </div>
  </article>
</div>

<!-- eslint-enable svelte/no-navigation-without-resolve -->

<style>
  .docs :global(h1) {
    font-size: 2.25rem;
    font-weight: 700;
    letter-spacing: -0.025em;
    margin-bottom: 0.5rem;
  }
  .docs :global(h1 + p) {
    font-size: 1.125rem;
    color: var(--muted-foreground);
  }
  .docs :global(h1 + p code) {
    color: var(--foreground);
  }
  .docs :global(h2:not(.docs-example *)) {
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    margin-top: 3rem;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border);
    scroll-margin-top: 1.5rem;
  }
  .docs :global(h3:not(.docs-example *)) {
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
  }
  .docs :global(p:not(.docs-example *)),
  .docs :global(ul:not(.docs-example *)) {
    margin-block: 0.75rem;
    line-height: 1.7;
    max-width: 72ch;
  }
  .docs :global(ul:not(.docs-example *)) {
    list-style: disc;
    padding-inline-start: 1.25rem;
  }
  .docs :global(:not(pre) > code:not(.docs-example *)) {
    font-size: 0.875em;
    background: var(--muted);
    border-radius: 0.25rem;
    padding: 0.1rem 0.3rem;
  }
  .docs :global(a:not([aria-current]):not(.docs-pager):not(.docs-example *)) {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
</style>
