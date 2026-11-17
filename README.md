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

This copies `calendar`, `month-view`, `time-grid` (into your `ui` alias) and `calendar-state.svelte.ts` (into your `lib` alias), and adds `@calendar-kit/core`.

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
		]
	});
</script>

<Calendar state={calendar} allDayLabel="todo el día" />
```

Events are all-day (`CalendarDate` start/end) or timed (`ZonedDateTime` start/end). `end` is exclusive, as in iCalendar. Labels come from `Intl`, so the calendar follows `locale`.

| Item             | What it is                                                  |
| ---------------- | ----------------------------------------------------------- |
| `calendar`       | Toolbar (today, previous/next, view switcher) and the views |
| `month-view`     | Month grid with multi-day bars and "+N" overflow            |
| `time-grid`      | Week and day views with overlap columns and a "now" line    |
| `calendar-state` | Runes state shared through context                          |

## Adding a registry item

1. Put the files in `apps/docs/src/lib/registry/<item>/`.
2. Add the item to `apps/docs/registry.json` with type `registry:ui` (one folder per item) and its npm `dependencies`.
3. Put logic in `packages/core`, not in the component.
4. Run `bun run build`.
