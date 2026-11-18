import { describe, expect, it } from "vitest";
import { CalendarDate, parseZonedDateTime } from "@internationalized/date";
import { findFreeSlots, type CalendarEvent } from "../src/index.js";
import { allDay, timeZone, timed } from "./fixtures.js";

const lima = (value: string) => parseZonedDateTime(`${value}[${timeZone}]`);
const of = (resourceIds: string[], event: CalendarEvent): CalendarEvent => ({
  ...event,
  resourceIds,
});
// Monday 16 to Wednesday 18 November 2026.
const range = { start: new CalendarDate(2026, 11, 16), end: new CalendarDate(2026, 11, 18) };
const starts = (slots: { start: { toString(): string } }[]) =>
  slots.map((slot) => slot.start.toString().slice(0, 16));

describe("findFreeSlots", () => {
  it("finds the first hour when every participant is free", () => {
    const events = [
      of(["ana"], timed("a", "2026-11-16T09:00", "2026-11-16T10:00")),
      of(["luis"], timed("b", "2026-11-16T10:00", "2026-11-16T11:30")),
    ];
    const slots = findFreeSlots(events, {
      range,
      duration: 60,
      timeZone,
      resourceIds: ["ana", "luis"],
      limit: 2,
    });
    expect(starts(slots)).toEqual(["2026-11-16T11:30", "2026-11-16T11:45"]);
    expect(slots[0]!.end.toString()).toBe(lima("2026-11-16T12:30").toString());
  });

  it("ignores events of people who are not taking part", () => {
    const events = [of(["room-a"], timed("a", "2026-11-16T09:00", "2026-11-16T12:00"))];
    const slots = findFreeSlots(events, { range, duration: 60, timeZone, resourceIds: ["ana"] });
    expect(starts(slots)[0]).toBe("2026-11-16T09:00");
  });

  it("stays inside working hours and skips weekends", () => {
    const weekend = { start: new CalendarDate(2026, 11, 21), end: new CalendarDate(2026, 11, 24) };
    const slots = findFreeSlots([], {
      range: weekend,
      duration: 120,
      timeZone,
      step: 60,
      workingHours: { days: [1, 2, 3, 4, 5], start: 9 * 60, end: 12 * 60 },
      limit: 5,
    });
    // Saturday 21 to Monday 23: only Monday is a working day, 9:00 to 12:00.
    expect(starts(slots)).toEqual(["2026-11-23T09:00", "2026-11-23T10:00"]);
  });

  it("starts after a given time, on the step", () => {
    const slots = findFreeSlots([], {
      range,
      duration: 30,
      timeZone,
      after: lima("2026-11-16T14:07"),
      limit: 1,
    });
    expect(starts(slots)).toEqual(["2026-11-16T14:15"]);
  });

  it("treats all-day events and occurrences of series as busy", () => {
    const events = [
      of(["ana"], allDay("trip", new CalendarDate(2026, 11, 16), new CalendarDate(2026, 11, 17))),
      of(["ana"], {
        ...timed("daily", "2026-11-10T09:00", "2026-11-10T13:00"),
        rrule: "FREQ=DAILY",
      }),
    ];
    const slots = findFreeSlots(events, {
      range,
      duration: 60,
      timeZone,
      resourceIds: ["ana"],
      limit: 1,
    });
    expect(starts(slots)).toEqual(["2026-11-17T13:00"]);
  });
});
