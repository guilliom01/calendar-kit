import { describe, expect, it } from "vitest";
import { CalendarDate, toZoned } from "@internationalized/date";
import {
  expandEvents,
  groupByDay,
  layoutTimedEvents,
  layoutWeekRow,
  monthGrid,
  type CalendarEvent,
} from "../src/index.js";
import { locale, timeZone } from "./fixtures.js";

// Guards against complexity regressions (e.g. something quadratic), not a benchmark: the limits
// are about ten times what a laptop measured, so slow CI machines stay green.
const first = new CalendarDate(2026, 1, 1);
const events: CalendarEvent[] = Array.from({ length: 5000 }, (_, index) => {
  const start = toZoned(first.add({ days: index % 365 }), timeZone).set({ hour: 8 + (index % 10) });
  return {
    id: `e${index}`,
    title: `Evento ${index}`,
    start,
    end: start.add({ minutes: 45 }),
    ...(index % 50 === 0 && { rrule: "FREQ=WEEKLY" }),
  };
});
const month = { start: new CalendarDate(2026, 11, 1), end: new CalendarDate(2026, 12, 6) };

/** Average milliseconds of `run`, after one warm-up call. */
function time(run: () => unknown, times = 3) {
  run();
  const start = performance.now();
  for (let index = 0; index < times; index++) run();
  return (performance.now() - start) / times;
}

describe("performance with 5,000 events", () => {
  const visible = expandEvents(events, month, timeZone);
  const weeks = monthGrid(new CalendarDate(2026, 11, 17), { locale });

  it("expands the visible month in well under a quarter second", () => {
    expect(time(() => expandEvents(events, month, timeZone))).toBeLessThan(200);
  });

  it("lays out the month, a week and the agenda fast enough to drag", () => {
    expect(
      time(() => weeks.forEach((week) => layoutWeekRow(visible, week, timeZone))),
    ).toBeLessThan(40);
    expect(
      time(() => weeks[2]!.forEach((day) => layoutTimedEvents(visible, day, timeZone))),
    ).toBeLessThan(90);
    expect(time(() => groupByDay(visible, month, timeZone))).toBeLessThan(40);
  });
});
