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

## Installing the calendar

```sh
npx shadcn-svelte@latest add <registry-url>/r/calendar.json
```

This copies the calendar items into your `ui` alias, `calendar-state.svelte.ts` and `calendar-drag.ts` into your `lib` alias, the shadcn components they use (`button`, `dialog`, `input`, `label`, `checkbox`), and adds `@calendar-kit/core`. The dialog animations need `tw-animate-css`, which a shadcn-svelte project already has.

```svelte
<script lang="ts">
	import { today, toZoned } from '@internationalized/date';
	import { Calendar, CalendarState } from '$lib/components/ui/calendar/index.js';

	const timeZone = 'America/Lima';
	const day = today(timeZone);
	const calendar = new CalendarState({
		locale: 'es-PE',
		timeZone,
		events: [
			{
				id: '1',
				title: 'Reunión',
				start: toZoned(day, timeZone).set({ hour: 10 }),
				end: toZoned(day, timeZone).set({ hour: 11 })
			}
		],
		// Save to your backend. Return the saved event to replace the local one (e.g. a server id).
		// Throw to roll the change back.
		onMutate: async (mutation) => {
			const response = await fetch('/api/events', {
				method: 'POST',
				body: JSON.stringify(mutation)
			});
			if (!response.ok) throw new Error('Could not save');
		},
		onError: (error) => console.error(error),
		labels: { allDay: 'Todo el día', newEvent: 'Nuevo evento', save: 'Guardar' }
	});
</script>

<Calendar state={calendar} />
```

Events are all-day (`CalendarDate` start/end) or timed (`ZonedDateTime` start/end). `end` is exclusive, as in iCalendar. Dates, views and navigation labels come from `Intl`, so they follow `locale`. The few texts Intl cannot provide are in `labels` (see `defaultLabels`).

What users can do (with `editable: true`, the default):

- Click an event to edit or delete it. Click an empty spot to create one; in the week and day views, drag over empty time to choose its range.
- Drag events to move them (across days and hours), and drag their bottom edge to resize them. Changes snap to `snapStep` minutes (default 15). Escape cancels a drag.
- Undo and redo with the toolbar buttons or Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (or Ctrl+Y). Delete or Backspace removes the focused event.

Changes show right away and are sent to `onMutate`. Changes to the same event are saved in order, and undo and redo reach `onMutate` as inverse changes.

| Item             | What it is                                                          |
| ---------------- | ------------------------------------------------------------------- |
| `calendar`       | Toolbar (new event, today, previous/next, undo/redo, view switcher) |
| `month-view`     | Month grid with multi-day bars, "+N" overflow and drag between days |
| `time-grid`      | Week and day views: drag, resize, draw new events, "now" line       |
| `event-dialog`   | Create, edit and delete events                                      |
| `calendar-state` | Runes state, event store and drag helpers                           |

## Adding a registry item

1. Put the files in `apps/docs/src/lib/registry/<item>/`.
2. Add the item to `apps/docs/registry.json` with type `registry:ui` (one folder per item) and its npm `dependencies`.
3. Put logic in `packages/core`, not in the component.
4. Run `bun run build`.
