<script lang="ts">
  import "./layout.css";
  import favicon from "#lib/assets/favicon.svg";
  import { onMount } from "svelte";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import CalendarIcon from "@lucide/svelte/icons/calendar-days";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import SunIcon from "@lucide/svelte/icons/sun";
  import { Button } from "#lib/registry/ui/button/index.js";
  import type { LayoutProps } from "./$types";

  let { children }: LayoutProps = $props();

  // app.html already applied the system theme; the button switches the shadcn `.dark` class.
  let dark = $state(false);
  onMount(() => {
    dark = document.documentElement.classList.contains("dark");
  });

  function toggleDark() {
    dark = !dark;
    document.documentElement.classList.toggle("dark", dark);
  }

  const links = [
    { href: resolve("/docs"), label: "Docs", current: (path: string) => path === resolve("/docs") },
    {
      href: resolve("/docs/blocks"),
      label: "Components",
      current: (path: string) => path.startsWith(resolve("/docs/blocks")),
    },
    {
      href: resolve("/docs/examples"),
      label: "Examples",
      current: (path: string) => path.startsWith(resolve("/docs/examples")),
    },
  ];
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="flex h-dvh flex-col print:h-auto">
  <header
    class="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 print:hidden"
  >
    <div class="mx-auto flex h-14 max-w-screen-2xl items-center gap-4 px-4 md:px-6">
      <a href={resolve("/")} class="flex items-center gap-2 font-semibold">
        <CalendarIcon class="size-5" aria-hidden="true" />
        calendar-kit
      </a>
      <nav aria-label="Main" class="flex items-center gap-1 text-sm">
        {#each links as link (link.href)}
          {@const current = link.current(page.url.pathname)}
          <a
            href={link.href}
            aria-current={current ? "page" : undefined}
            class="rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-foreground"
          >
            {link.label}
          </a>
        {/each}
      </nav>
      <div class="ms-auto flex items-center gap-1">
        <Button
          href="https://github.com/guilliom01/calendar-kit"
          variant="ghost"
          size="icon"
          aria-label="GitHub"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" class="size-4" fill="currentColor">
            <path
              d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8 0 3.2.9.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.3v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3"
            />
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Dark mode"
          aria-pressed={dark}
          onclick={toggleDark}
        >
          {#if dark}<SunIcon />{:else}<MoonIcon />{/if}
        </Button>
      </div>
    </div>
  </header>
  <div class="min-h-0 flex-1">
    {@render children()}
  </div>
</div>
