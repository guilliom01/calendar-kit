# calendar-kit

A free, open-source (MIT) full calendar for Svelte, built the shadcn way: you copy the components into your project, own the code, and style it with Tailwind CSS.

- **`@calendar-kit/core`**: framework-agnostic logic (dates, recurrence, layout, interaction, state), installed from npm so fixes reach you.
- **Registry items**: Svelte 5 components you copy and edit freely.

> Status: early development (phase 0). Not published yet.

## Layout

```
packages/core   # @calendar-kit/core, pure TypeScript
apps/docs       # SvelteKit docs site; also builds and serves the registry (static/r)
```

## Development

Requires [Bun](https://bun.sh).

```sh
bun install
bun run test     # core unit tests (Vitest) + docs e2e (Playwright)
bun run check    # type checks
bun run lint     # Prettier + ESLint
bun run build    # builds core, the registry and the docs site
```

Run the docs site with `bun run --filter @calendar-kit/docs dev`.

## Philosophy

Building blocks, not a black box. You install only the pieces you use, compose them in your markup, and own the code. Nobody who only needs a month grid has to think about Gantt charts or resources.

## Getting started

Add the calendar parts and the views you want:

```sh
npx shadcn-svelte@latest add <registry-url>/r/calendar.json <registry-url>/r/month-view.json
```

```svelte
<script lang="ts">
	import * as Calendar from '$lib/components/ui/calendar/index.js';
	import { CalendarState } from '$lib/components/ui/calendar/index.js';
	import { MonthView } from '$lib/components/ui/month-view/index.js';

	const calendar = new CalendarState({ locale: 'es-PE', timeZone: 'America/Lima', events });
</script>

<Calendar.Root state={calendar}>
	<Calendar.Toolbar>
		<Calendar.Nav />
		<Calendar.Title />
	</Calendar.Toolbar>
	<Calendar.View name="month"><MonthView /></Calendar.View>
</Calendar.Root>
```

Events are all-day (`CalendarDate` start/end) or timed (`ZonedDateTime` start/end). `end` is exclusive, as in iCalendar. Dates and calendar words come from `Intl`, so they follow `locale`; the few texts Intl cannot provide are in `labels` (see `defaultLabels`).

## Blocks

| Item                | Add it when you want…                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `calendar`          | Always. `Root`, `View`, `Toolbar` and parts: `Nav`, `Title`, `ViewSwitcher`, `NewEvent`, `UndoRedo`, `TimeZoneSelect`, `Loading` |
| `month-view`        | A month grid with multi-day bars and "+N" overflow                                                                               |
| `time-grid`         | Week or day views; with `resources`, one column per resource                                                                     |
| `agenda-view`       | The month's events listed day by day                                                                                             |
| `year-view`         | Twelve small months with busier days tinted                                                                                      |
| `timeline-view`     | Resources as rows (nested, collapsible) across the week                                                                          |
| `gantt-view`        | Tasks (`progress`, `dependsOn`) across the month with dependency arrows                                                          |
| `event-dialog`      | A ready-made dialog to create, edit and delete events, and to pick the scope of changes to recurring events                      |
| `recurrence-editor` | A full repeat-rule editor; plug it into `event-dialog` (snippet `recurrence`) or your own form                                   |
| `calendar-state`    | Installed automatically: the runes state, event store and drag helpers                                                           |

Each view is shown by a `<Calendar.View name="…">`. Registering a view also lists it in `<Calendar.ViewSwitcher>`. Built-in names (`month`, `week`, `day`, `agenda`, `year`, `timeline`, `resources`, `gantt`) know their date range; for your own view, pass `range` and `unit`:

```svelte
<Calendar.View
	name="3days"
	label="3 días"
	unit="days"
	range={(date) => ({ start: date, end: date.add({ days: 3 }) })}
>
	<MyThreeDayView />
</Calendar.View>
```

Resources are props of the views that use them: `<TimeGrid resources={…} />`, `<TimelineView resources={…} />`, `<AgendaView resources={…} />`, `<EventDialog resources={…} />`. A resource is `{ id, title, color?, parentId? }`; assign events with `resourceIds`.

### Customizing what views draw

Views take snippets for their parts. Interactive parts (`event`, `dayNumber`, `dayHeader`, `more`) receive `props` with the handlers, ARIA attributes, class and style of the default element: spread them on your own element and clicks, dragging, keyboard moves and screen reader labels keep working. Display parts (`dayCell`, `resourceLabel`, `hourLabel`, `nowIndicator`, `taskLabel`) receive data only. `eventContent` changes only the inside of an event.

```svelte
<MonthView>
	{#snippet event({ event, props, dragging })}
		<button {...props} class={cn(props.class, 'rounded-full', dragging && 'ring-2')}>
			{event.title}
		</button>
	{/snippet}
</MonthView>
```

The demo page `/personalizar` uses them in the month, week and timeline views.

## Interaction hooks

Every interaction runs your hook first; return `false` to skip the built-in behavior.

| Option          | When                                                      | Built-in behavior                              |
| --------------- | --------------------------------------------------------- | ---------------------------------------------- |
| `onEventClick`  | An event is clicked or activated                          | Open the event dialog (if you added one)       |
| `onMoreClick`   | "+N" is clicked in the month view                         | A popover listing every event of that day      |
| `onDateClick`   | A day number or day header is clicked                     | Show the day view (if you registered one)      |
| `onSelect`      | An empty day or time range is picked                      | Open the dialog for a new event                |
| `onEventChange` | An event is dragged or resized                            | Save it. Return an event to save that instead  |
| `resolveScope`  | A recurring event is changed                              | Ask "this / following / all" in the dialog     |
| `isEditable`    | Per event and action (`move`, `resize`, `delete`, `edit`) | Everything is editable when `editable` is true |

`eventClass(event)` returns extra classes for an event in every view, for example `border-dashed` for tentative events.

Without `event-dialog`, nothing opens: react to `onEventClick` and `onSelect` with your own UI. Everything else is yours to edit too, since the components live in your project.

## Saving changes

Changes show right away and are sent to `onMutate(mutation)` (create, update or delete). Return the saved event to replace the local one (for example with a server id); throw to roll the change back (`onError` is called). Changes to the same event are saved in order, and undo/redo (`Calendar.UndoRedo`, Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z) reach `onMutate` as inverse changes.

Users can drag events across days, hours and resources, resize them from the bottom edge, draw new ones over empty time, and press Delete to remove the focused one. Escape cancels a drag. Resting the pointer near the edge of a scrolling area scrolls it, so events can reach hours or days that are not visible.

### Recurring events

Give an event an RFC 5545 `rrule` (for example `FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH` or `FREQ=MONTHLY;BYDAY=-1FR;COUNT=6`) and optional `exdates`. Supported parts: `FREQ` (daily to yearly), `INTERVAL`, `COUNT`, `UNTIL`, `BYMONTH`, `BYMONTHDAY`, `BYDAY` (with ordinals), `BYSETPOS` and `WKST`; others throw a `RangeError` instead of being ignored. Occurrences are expanded only for the visible range and keep their wall-clock time across DST changes (checked against `rrule-temporal` in the tests). Changing an occurrence applies to this event, the following ones or all of them, as one undo step; `seriesChanges()` in `@calendar-kit/core` gives you the same changes for your own UI.

### Loading events on demand

Pass `loadEvents(range)` instead of (or as well as) `events`. The calendar asks for whole months as the user navigates, caches them, shares in-flight requests, preloads `preload` months on each side (default 1) and exposes `loading` (shown by `Calendar.Loading`). Loaded events skip the undo history. A month that fails (`onLoadError`) is requested again next time.

### Time zones

`timeZone` decides where events are shown; `Calendar.TimeZoneSelect` lets users change it. Timed events move to the new local time, and all-day events stay on their dates.

## Adding a registry item

1. Put the files in `apps/docs/src/lib/registry/<item>/`.
2. Add the item to `apps/docs/registry.json` with type `registry:ui` (one folder per item) and its npm `dependencies`.
3. Put logic in `packages/core`, not in the component.
4. Run `bun run build`.
