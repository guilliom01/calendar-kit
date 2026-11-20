# Docs redesign (shadcn style)

## Intent

The docs site (`apps/docs`) does not look professional or ordered. The user wants it in the
shadcn style, with a landing page that shows the best of calendar-kit. Everything that is code
must be in English.

## Goals

- A landing page at `/` that sells the library: hero, install command, the full calendar working,
  and a grid of the strongest features linking to their examples.
- A shadcn-like shell: sticky header (logo, Docs, Components, Examples, GitHub, theme toggle),
  grouped sidebar, "On this page" table of contents, previous/next links.
- One page per component at `/docs/components/<name>`: description, Preview/Code tabs, install
  command with a copy button, usage, API table.
- Every code block has a copy button and syntax highlighting.
- All code, demo data and UI copy in English (`en-US`); only the Languages example keeps Spanish
  and Arabic, because showing them is its point.

## Non-goals

- Search (⌘K): after this work.
- Markdown/mdsvex authoring: pages stay `.svelte`.
- New library features.

## Anti-goals

- Losing content: everything in today's Blocks, State, Recurrence, Import/Export and i18n pages
  survives, moved, not dropped.
- Breaking the 25 live examples or their raw-source display.

## Approaches

- **A. Reorganize in place, shadcn style** (chosen by the user): new shell, landing, one page
  per component, reuse `code.svelte`, `props-table.svelte`, the examples and the registry.
- B. Same with mdsvex: nicer authoring, but a new dependency and migrating every page; there is
  not enough prose yet to pay for it.
- C. Landing and visual polish only: cheap, but leaves the disorder the user complained about.

## Structure

Header: `calendar-kit` logo · Docs · Components · Examples · GitHub · theme toggle.

Sidebar groups:

- **Getting Started**: Introduction, Installation, Quick start.
- **Components**: full-calendar, month-view, time-grid, agenda-view, year-view, timeline-view,
  gantt-view, mini-calendar, calendar-search, calendar-list, event-context-menu, event-preview,
  scheduling-assistant, event-dialog, recurrence-editor, import-export (split from today's
  Blocks page, one page each).
- **Guides**: State and hooks, Recurring events, Import and export, Languages and accessibility,
  Custom views and rendering, Dragging your own items in (the last two from Blocks).
- **Examples**: the 25 existing examples, unchanged URLs.

Old routes `/minimo`, `/ganchos`, `/carga`, `/personalizar`, `/asistente` are deleted; the
examples already cover them (my call). Their e2e tests move to the matching example pages or go
away when an example test already covers the same behavior. `/docs/blocks` redirects to
`/docs/components/full-calendar`.

## Landing sketch

```
[header]
 Full calendar for Svelte 5, built the shadcn way
 Copy the components, own the code. Dates, time zones and recurrence handled for you.
 [Get started]  [Browse examples]      $ npx shadcn-svelte add …  [copy]

 ┌──────── live full calendar (today's "/" demo, in English) ────────┐
 └────────────────────────────────────────────────────────────────────┘

 Feature grid (6–8 cards → example pages): Views · Drag & drop · Recurrence ·
 Time zones · Resources & Gantt · Import/Export · i18n & RTL · Accessible
```

The full demo stays at `/`, so `calendar.e2e.ts` keeps its route.

## Component page sketch

```
month-view                                  On this page
One-line description.                        Installation
[Preview | Code]                             Usage
 ┌ live example ┐                            API
Installation  $ npx shadcn-svelte add …/month-view.json [copy]
Usage         code block
API           props table
                                 ← time-grid   agenda-view →
```

Previews reuse the existing example components where one fits.

## Constraints

- Svelte 5, Tailwind, the registry's own `button` and other shadcn-svelte parts; bits-ui is
  already installed (Tabs can come from it).
- Live examples render in the browser only (commit eb6689e).
- Docs prose in English; S3 of `odd/tasks/docs-examples.md` changes: examples move from es-PE
  and Spanish labels to `en-US` and English labels.
- Each page keeps passing the axe scan; Playwright e2e stays green.

## Calls left to the builder

- Syntax highlighting: my call is `shiki` as a docs-app devDependency, highlighting at build/SSR
  time so the browser ships no highlighter. The builder may pick another way with the same result.
- Exact card copy, icons and spacing, following shadcn-svelte's own docs.
- Table of contents built from the page's `h2` headings.
