import { toZoned, type CalendarDate } from "@internationalized/date";
import type { CalendarEvent } from "@guilli/calendar-core";

/** A few events in the week of `day`, for the examples. */
export function sampleEvents(day: CalendarDate, timeZone: string): CalendarEvent[] {
  const at = (offset: number, hour: number, minute = 0) =>
    toZoned(day.add({ days: offset }), timeZone).set({ hour, minute });
  return [
    { id: "standup", title: "Daily standup", start: at(0, 9), end: at(0, 9, 30) },
    {
      id: "review",
      title: "Revisión de diseño",
      start: at(1, 11),
      end: at(1, 12, 30),
      color: "oklch(0.6 0.15 250)",
    },
    {
      id: "lunch",
      title: "Almuerzo con el equipo",
      start: at(2, 13),
      end: at(2, 14, 30),
      color: "oklch(0.65 0.15 150)",
    },
    { id: "trip", title: "Viaje a Cusco", start: day.add({ days: 3 }), end: day.add({ days: 5 }) },
  ];
}
