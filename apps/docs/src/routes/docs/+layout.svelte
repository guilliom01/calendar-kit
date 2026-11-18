<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import type { LayoutProps } from "./$types";

  let { children }: LayoutProps = $props();

  const sections = [
    { href: resolve("/docs"), label: "Introduction" },
    { href: resolve("/docs/examples"), label: "Examples" },
    { href: resolve("/docs/blocks"), label: "Blocks" },
    { href: resolve("/docs/state"), label: "State and hooks" },
    { href: resolve("/docs/recurrence"), label: "Recurring events" },
    { href: resolve("/docs/import-export"), label: "Import and export" },
    { href: resolve("/docs/i18n-a11y"), label: "Languages and accessibility" },
  ];
</script>

<div class="mx-auto flex h-full max-w-6xl flex-col gap-x-8 px-4 md:flex-row">
  <nav aria-label="Documentation" class="shrink-0 py-3 md:w-52 md:py-6">
    <ul class="flex gap-1 overflow-x-auto text-sm whitespace-nowrap md:sticky md:top-6 md:grid">
      {#each sections as section (section.href)}
        {@const current = page.url.pathname === section.href}
        <li>
          <a
            href={section.href}
            aria-current={current ? "page" : undefined}
            class="block rounded-md px-3 py-1.5 hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-medium"
          >
            {section.label}
          </a>
        </li>
      {/each}
    </ul>
  </nav>
  <!-- Focusable so keyboard users can scroll it even when a page has no links. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <article
    lang="en"
    tabindex="0"
    aria-label="Documentation"
    class="docs min-w-0 flex-1 overflow-y-auto py-6 pb-24 outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    {@render children()}
  </article>
</div>

<style>
  .docs :global(h1) {
    font-size: 1.875rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }
  .docs :global(h2:not(.docs-example *)) {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 2.5rem;
    margin-bottom: 0.75rem;
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
  .docs :global(a:not([aria-current]):not(.docs-example *)) {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
</style>
