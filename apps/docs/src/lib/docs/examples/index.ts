import type { Component } from "svelte";

export interface Example {
  slug: string;
  title: string;
  description: string;
}

/** Examples in reading order: simple first. Each one is ./<slug>.svelte. */
export const examples: Example[] = [
  {
    slug: "basic",
    title: "Basic",
    description: "The least you need: the calendar parts and a month view, without events.",
  },
  {
    slug: "events",
    title: "Events",
    description:
      "Showing events. The calendar is read-only (editable: false); the button adds random events through the state.",
  },
  {
    slug: "views",
    title: "Views",
    description:
      "Month, week, day, agenda and year. Each FullCalendar.View registers itself in the ViewSwitcher.",
  },
  {
    slug: "editing",
    title: "Editing",
    description:
      "Create, edit, drag and resize events. The dialogs are optional blocks; changes can be undone with Ctrl/Cmd+Z.",
  },
];

const components = import.meta.glob<{ default: Component }>("./*.svelte", { eager: true });
const sources = import.meta.glob<string>("./*.svelte", {
  eager: true,
  query: "?raw",
  import: "default",
});

export const exampleComponent = (slug: string) => components[`./${slug}.svelte`]?.default;

/**
 * The example's source as a user writes it after `shadcn-svelte add`: components live in
 * #lib/components/ui and the state helpers in #lib, not in this repository's registry folders.
 */
export const exampleSource = (slug: string) =>
  (sources[`./${slug}.svelte`] ?? "")
    .replaceAll("#lib/registry/ui/", "#lib/components/ui/")
    .replaceAll("#lib/registry/lib/", "#lib/");
