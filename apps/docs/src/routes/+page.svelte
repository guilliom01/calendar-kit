<script lang="ts">
  import { resolve } from "$app/paths";
  import CalendarRangeIcon from "@lucide/svelte/icons/calendar-range";
  import ClockIcon from "@lucide/svelte/icons/clock";
  import FileDownIcon from "@lucide/svelte/icons/file-down";
  import GanttIcon from "@lucide/svelte/icons/chart-gantt";
  import LanguagesIcon from "@lucide/svelte/icons/languages";
  import MoveIcon from "@lucide/svelte/icons/move";
  import RepeatIcon from "@lucide/svelte/icons/repeat";
  import SaveIcon from "@lucide/svelte/icons/save";
  import { Button } from "#lib/registry/ui/button/index.js";
  import Code from "#lib/docs/code.svelte";
  import Showcase from "#lib/docs/showcase.svelte";

  const install = `npx shadcn-svelte@latest add https://calendar-kit.calendar-kit-docs.workers.dev/r/full-calendar.json`;

  const example = (slug: string) => resolve("/docs/examples/[slug]", { slug });
  const features = [
    {
      icon: CalendarRangeIcon,
      title: "Every view",
      text: "Month, week, day, agenda, year and timeline, switched from one toolbar.",
      href: example("views"),
    },
    {
      icon: MoveIcon,
      title: "Drag, resize and undo",
      text: "With a mouse, a finger or the keyboard. Ctrl+Z takes any change back.",
      href: example("editing"),
    },
    {
      icon: RepeatIcon,
      title: "Recurring events",
      text: "RFC 5545 rules, a rule editor, and edits to one, the following or all occurrences.",
      href: example("recurring"),
    },
    {
      icon: ClockIcon,
      title: "Time zones",
      text: "Events keep the zone they were planned in and show in the viewer's.",
      href: example("time-zones"),
    },
    {
      icon: GanttIcon,
      title: "Resources and Gantt",
      text: "Rooms and people as columns or rows, and tasks with progress and dependencies.",
      href: example("gantt"),
    },
    {
      icon: SaveIcon,
      title: "Saving to your backend",
      text: "Changes show at once, roll back when a save fails, and resolve conflicts.",
      href: example("saving"),
    },
    {
      icon: FileDownIcon,
      title: "Import and export",
      text: "Read and write .ics files, export CSV and Excel, and print.",
      href: example("import-export"),
    },
    {
      icon: LanguagesIcon,
      title: "Any language, any reader",
      text: "Every Intl locale, right-to-left layouts, and full keyboard and screen reader support.",
      href: example("languages"),
    },
  ];
</script>

<svelte:head>
  <title>calendar-kit · A full calendar for Svelte 5</title>
  <meta
    name="description"
    content="A free, MIT-licensed full calendar for Svelte 5, built as shadcn-svelte components you own."
  />
</svelte:head>

<main class="h-full overflow-y-auto">
  <section class="mx-auto max-w-screen-2xl px-4 pt-16 pb-12 md:px-6 md:pt-24">
    <div class="max-w-3xl">
      <h1 class="text-4xl font-bold tracking-tight text-balance md:text-6xl">
        A full calendar for Svelte 5 that you own
      </h1>
      <p class="mt-5 max-w-2xl text-lg text-pretty text-muted-foreground">
        Views, drag and drop, recurrence and time zones as shadcn-svelte components. Copy them into
        your project and style them with Tailwind; the date logic comes from a tested package, so
        fixes reach you without touching your markup.
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <Button href={resolve("/docs")} size="lg">Get started</Button>
        <Button href={resolve("/docs/examples")} size="lg" variant="outline">Browse examples</Button
        >
      </div>
      <div class="mt-8 max-w-2xl">
        <Code code={install} />
      </div>
    </div>
  </section>

  <section aria-label="Live demo" class="mx-auto max-w-screen-2xl px-4 pb-20 md:px-6">
    <div class="flex flex-col rounded-xl border bg-background p-4 shadow-sm md:h-[52rem]">
      <Showcase class="min-h-0 flex-1" />
    </div>
  </section>

  <section aria-labelledby="features-heading" class="border-t">
    <div class="mx-auto max-w-screen-2xl px-4 py-20 md:px-6">
      <h2 id="features-heading" class="text-3xl font-semibold tracking-tight">
        Everything a calendar needs
      </h2>
      <p class="mt-3 max-w-2xl text-muted-foreground">
        Each part is a block you can leave out or replace. Every one has a working example with its
        full code.
      </p>
      <ul
        class="mt-10 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4"
      >
        {#each features as feature (feature.title)}
          <li class="bg-background">
            <a href={feature.href} class="flex h-full flex-col gap-2 p-6 hover:bg-muted/50">
              <feature.icon class="size-5" aria-hidden="true" />
              <span class="mt-2 font-medium">{feature.title}</span>
              <span class="text-sm text-muted-foreground">{feature.text}</span>
            </a>
          </li>
        {/each}
      </ul>
    </div>
  </section>

  <footer class="border-t">
    <div
      class="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:px-6"
    >
      <p>MIT licensed. Free to use in any project.</p>
      <a href="https://github.com/guilliom01/calendar-kit" class="hover:text-foreground">
        Source on GitHub
      </a>
    </div>
  </footer>
</main>
