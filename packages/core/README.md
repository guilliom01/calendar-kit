# @guilli/calendar-core

Framework-agnostic calendar logic in TypeScript: dates and time zones, recurring events, layout,
optimistic saving with undo/redo, import and export, and free-time search. It has no UI and no
framework dependency; the Svelte components of [calendar-kit](https://github.com/guilliom01/calendar-kit)
are built on it.

```sh
npm install @guilli/calendar-core
```

## What it covers

- **Events**: all-day (`CalendarDate`) or timed (`ZonedDateTime`) from `@internationalized/date`,
  with `end` exclusive as in iCalendar, plus `location`, `description`, resources and calendars.
- **Recurrence**: RFC 5545 `RRULE` (`FREQ` daily to yearly, `INTERVAL`, `COUNT`, `UNTIL`, `BYDAY`
  with ordinals, `BYMONTHDAY`, `BYMONTH`, `BYSETPOS`, `WKST`), `EXDATE` and `RDATE`, expanded only
  for the range you ask for; `seriesChanges` for "this", "this and following" and "all" edits.
- **Layout**: overlapping timed events side by side, multi-day bars in lanes.
- **Interaction math**: move, resize from either end, snapping.
- **EventStore**: optimistic changes saved through `onMutate`, per-event ordering, rollback, server
  conflicts (`ConflictError`), undo/redo; `RangeLoader` loads months on demand.
- **Import and export**: `.ics` (`parseICS`, `toICS`), CSV (`toCSV`) and Excel (`toXLSX`, no
  dependencies).
- **Scheduling**: `findFreeSlots` finds times when every participant is free.
- **Search**: `matchesQuery` ignores accents and case.

```ts
import { EventStore, expandEvents, toICS } from "@guilli/calendar-core";

const store = new EventStore({ events, onMutate: (mutation) => api.save(mutation) });
const visible = expandEvents(store.events, { start, end }, "America/Lima");
const ics = toICS(store.events, { name: "Team" });
```

## License

MIT
