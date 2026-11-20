<script lang="ts">
  import CheckIcon from "@lucide/svelte/icons/check";
  import CopyIcon from "@lucide/svelte/icons/copy";
  import { highlight, type CodeLang } from "./highlight.js";

  let { code, label, lang }: { code: string; label?: string; lang?: CodeLang } = $props();

  const text = $derived(code.trim());
  const language = $derived(
    lang ??
      (/^(npx|npm|bun|pnpm) /.test(text)
        ? "bash"
        : /<[A-Za-z]/.test(text)
          ? "svelte"
          : "typescript"),
  );

  // Plain text first (and when prerendering); the colored version replaces it once Shiki loads.
  let html = $state("");
  $effect(() => {
    let current = true;
    highlight(text, language).then((result) => current && (html = result));
    return () => (current = false);
  });

  let copied = $state(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<figure class="docs-code group relative my-4 overflow-hidden rounded-lg border bg-background">
  {#if label}
    <figcaption class="border-b bg-muted/40 px-4 py-2 font-mono text-xs text-muted-foreground">
      {label}
    </figcaption>
  {/if}
  <button
    type="button"
    aria-label={copied ? "Copied" : "Copy code"}
    class="absolute end-2 z-10 inline-flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {label
      ? 'top-1'
      : 'top-2'}"
    onclick={copy}
  >
    {#if copied}<CheckIcon class="size-3.5" />{:else}<CopyIcon class="size-3.5" />{/if}
  </button>
  {#if html}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- Shiki output of our own docs code -->
    {@html html}
  {:else}
    <!-- Focusable so long lines can be scrolled with the keyboard (Shiki's <pre> is too). -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <pre tabindex="0"><code>{text}</code></pre>
  {/if}
</figure>

<style>
  .docs-code :global(pre) {
    overflow-x: auto;
    padding: 1rem;
    font-size: 0.8125rem;
    line-height: 1.7;
    background: transparent !important;
    outline: none;
  }
  .docs-code :global(pre:focus-visible) {
    box-shadow: inset 0 0 0 2px var(--ring);
  }
  .docs-code :global(.shiki span) {
    color: var(--shiki-light);
  }
  :global(.dark) .docs-code :global(.shiki span) {
    color: var(--shiki-dark);
  }
</style>
