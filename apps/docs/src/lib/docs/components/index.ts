import type { Component } from "svelte";

export interface ComponentDoc {
  /** The registry item, also the page's URL. */
  name: string;
  summary: string;
  /** The example shown as its preview. */
  example: string;
}

/** Component pages in sidebar order. Each one's usage and API live in ./<name>.svelte. */
export const components: ComponentDoc[] = [
  {
    name: "full-calendar",
    summary: "The parts every calendar shares: the root, views and toolbar controls.",
    example: "views",
  },
  {
    name: "month-view",
    summary: 'A month grid with multi-day bars and a "+N" list for busy days.',
    example: "events",
  },
  {
    name: "time-grid",
    summary: "Week and day views with hours, an all-day row and a now line.",
    example: "time-zones",
  },
  { name: "agenda-view", summary: "A list of upcoming events grouped by day.", example: "search" },
  {
    name: "year-view",
    summary: "Twelve small months, tinted by how busy each day is.",
    example: "views",
  },
  {
    name: "timeline-view",
    summary: "Resources as rows across the days of the week.",
    example: "resources",
  },
  {
    name: "gantt-view",
    summary: "Tasks with progress bars and dependency arrows.",
    example: "gantt",
  },
  {
    name: "mini-calendar",
    summary: "A small month to jump to any date.",
    example: "mini-calendar",
  },
  { name: "calendar-search", summary: "A search box that filters every view.", example: "search" },
  {
    name: "calendar-list",
    summary: "A checkbox per calendar to show or hide its events.",
    example: "calendars",
  },
  {
    name: "event-context-menu",
    summary: "A right-click menu on events with Open, Duplicate and Delete.",
    example: "context-menu",
  },
  {
    name: "event-preview",
    summary: "A card with an event's details on hover or focus.",
    example: "event-preview",
  },
  {
    name: "scheduling-assistant",
    summary: "Suggests times when every participant is free.",
    example: "scheduling-assistant",
  },
  {
    name: "event-dialog",
    summary: "Dialogs to create, edit and delete events, and to confirm changes.",
    example: "editing",
  },
  {
    name: "recurrence-editor",
    summary: "An editor for repeat rules, in the dialog or your own form.",
    example: "recurring",
  },
  {
    name: "import-export",
    summary: "Buttons to import and export .ics, CSV and Excel, and to print.",
    example: "import-export",
  },
];

const pages = import.meta.glob<{ default: Component }>("./*.svelte", { eager: true });
export const componentContent = (name: string) => pages[`./${name}.svelte`]?.default;
