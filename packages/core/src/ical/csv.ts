import { toTimeZone } from "@internationalized/date";
import { isAllDay } from "../events/queries.js";
import type { CalendarEvent } from "../events/types.js";

export interface CsvExportOptions {
  /** Times are written as local times in this zone. */
  timeZone: string;
}

const cell = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

/**
 * Events as CSV for spreadsheets: one row each, local "YYYY-MM-DD HH:mm" times in `timeZone`,
 * and the last day (inclusive) for all-day events. Pass expanded occurrences to list what the
 * user sees, or the stored events to list series once (with their `rrule`).
 */
export function toCSV(events: readonly CalendarEvent[], { timeZone }: CsvExportOptions): string {
  const header = [
    "id",
    "title",
    "start",
    "end",
    "all_day",
    "rrule",
    "resources",
    "color",
    "location",
    "description",
  ];
  const rows = events.map((event) => {
    const allDay = isAllDay(event);
    const local = (value: CalendarEvent["start"]) => {
      if (!("hour" in value)) return value.toString();
      const time = toTimeZone(value, timeZone);
      return `${time.toString().slice(0, 10)} ${time.toString().slice(11, 16)}`;
    };
    const end = allDay ? event.end.subtract({ days: 1 }) : event.end;
    return [
      event.id,
      event.title,
      local(event.start),
      local(end),
      String(allDay),
      event.rrule ?? "",
      (event.resourceIds ?? []).join(";"),
      event.color ?? "",
      event.location ?? "",
      event.description ?? "",
    ].map(cell);
  });
  return [header, ...rows].map((row) => row.join(",")).join("\r\n") + "\r\n";
}
