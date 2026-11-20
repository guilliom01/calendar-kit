<script lang="ts">
  import { afterNavigate } from "$app/navigation";

  let { container }: { container: HTMLElement | undefined } = $props();

  let headings: { id: string; text: string }[] = $state([]);

  const slug = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  // The page's own h2s (not the live examples'), each given an id so it can be linked.
  afterNavigate(() => {
    const found = [...(container?.querySelectorAll("h2") ?? [])].filter(
      (heading) => !heading.closest(".docs-example"),
    );
    headings = found.map((heading) => {
      heading.id ||= slug(heading.textContent ?? "");
      return { id: heading.id, text: heading.textContent ?? "" };
    });
  });
</script>

{#if headings.length > 1}
  <aside class="hidden w-52 shrink-0 xl:block">
    <nav aria-label="On this page" class="sticky top-0 text-sm">
      <p class="mb-2 font-medium">On this page</p>
      <ul class="grid gap-1.5">
        {#each headings as heading (heading.id)}
          <li>
            <a href="#{heading.id}" class="text-muted-foreground hover:text-foreground"
              >{heading.text}</a
            >
          </li>
        {/each}
      </ul>
    </nav>
  </aside>
{/if}
