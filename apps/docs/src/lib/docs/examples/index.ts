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
  {
    slug: "recurring",
    title: "Recurring events",
    description:
      "Series with RFC 5545 rules, a full repeat-rule editor in the dialog, and the this / following / all question when one occurrence changes.",
  },
  {
    slug: "time-zones",
    title: "Time zones",
    description:
      "Events keep the zone they were planned in and show in the calendar's zone. Change it with TimeZoneSelect.",
  },
  {
    slug: "resources",
    title: "Resources",
    description:
      "Rooms and people as columns of a day (TimeGrid with resources) or rows across the week (TimelineView).",
  },
  {
    slug: "gantt",
    title: "Gantt",
    description:
      "Tasks with progress and dependencies. Drag a bar to move it, its ends to resize it.",
  },
  {
    slug: "calendars",
    title: "Calendars",
    description:
      "Work, personal, holidays: events take their calendar's color, and a checkbox list hides or shows each calendar.",
  },
  {
    slug: "search",
    title: "Search and filters",
    description:
      "A search box that ignores accents and case, and a filter of your own, both applied to every view.",
  },
  {
    slug: "context-menu",
    title: "Context menu",
    description:
      "Right-click or Shift+F10 on an event: Open, Duplicate and Delete built in, plus items of your own.",
  },
  {
    slug: "event-preview",
    title: "Event preview",
    description: "A card with an event's details on hover or keyboard focus.",
  },
  {
    slug: "mini-calendar",
    title: "Mini calendar",
    description: "A small month next to the views to jump to any date, with dots on busy days.",
  },
  {
    slug: "external-drag",
    title: "External drag",
    description:
      "Make any element of yours draggable onto the calendar, like a list of unscheduled tasks, and decide what a drop creates.",
  },
  {
    slug: "scheduling-assistant",
    title: "Scheduling assistant",
    description: "Pick participants and a length to get the next times when all of them are free.",
  },
  {
    slug: "loading",
    title: "Loading on demand",
    description:
      "Load events month by month from your backend as the user navigates, with a loading indicator.",
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
