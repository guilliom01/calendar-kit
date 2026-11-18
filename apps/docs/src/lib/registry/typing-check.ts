// Compile-time check (svelte-check): a state built from inline events, whose type is narrower
// than CalendarEvent, must still be accepted by the calendar components.
import { CalendarDate } from "@internationalized/date";
import { CalendarState } from "#lib/registry/lib/calendar-state.svelte.js";

export function narrowStateFitsComponents(): CalendarState {
  const day = new CalendarDate(2026, 11, 17);
  return new CalendarState({
    events: [{ id: "1", title: "Birthday", start: day, end: day.add({ days: 1 }) }],
    isEditable: (event) => event.title !== "Birthday",
    onEventClick: (event) => console.log(event.title),
  });
}
