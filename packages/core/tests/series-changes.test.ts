import { describe, expect, it } from "vitest";
import { CalendarDate, parseZonedDateTime } from "@internationalized/date";
import { occurrences, seriesChanges, type CalendarEvent } from "../src/index.js";
import { allDay, timeZone, timed } from "./fixtures.js";

const series = {
  ...timed("class", "2026-11-16T18:00", "2026-11-16T20:00"),
  rrule: "FREQ=WEEKLY;BYDAY=MO,WE;COUNT=6",
};
const november = { start: new CalendarDate(2026, 11, 1), end: new CalendarDate(2026, 12, 31) };
const [first, , third] = occurrences(series, november, timeZone) as CalendarEvent[];
let ids = 0;
const starts = (events: CalendarEvent[]) => events.map((event) => event.start.toString());
const createId = () => `new-${++ids}`;

describe("seriesChanges: delete", () => {
  it("this event: excludes the occurrence", () => {
    const [change] = seriesChanges(series, third!, null, "this", createId);
    expect(change).toMatchObject({ type: "update", after: { id: "class" } });
    expect(change?.type === "update" && change.after.exdates?.map(String)).toEqual([
      "2026-11-23T18:00:00-05:00[America/Lima]",
    ]);
  });

  it("this and following: ends the series before it", () => {
    const [change] = seriesChanges(series, third!, null, "following", createId);
    expect(change?.type === "update" && change.after.rrule).toBe("FREQ=WEEKLY;COUNT=2;BYDAY=MO,WE");
  });

  it("this and following from the first occurrence, or all: deletes the series", () => {
    expect(seriesChanges(series, first!, null, "following", createId)).toEqual([
      { type: "delete", event: series },
    ]);
    expect(seriesChanges(series, third!, null, "all", createId)).toEqual([
      { type: "delete", event: series },
    ]);
  });
});

describe("seriesChanges: update", () => {
  const later = (event: CalendarEvent) =>
    ({
      ...event,
      start: event.start.add({ hours: 1 }),
      end: event.end.add({ hours: 1 }),
    }) as CalendarEvent;

  it("this event: excludes it and creates a single event without rrule or series fields", () => {
    const changes = seriesChanges(
      series,
      third!,
      { ...third!, title: "Make-up class" },
      "this",
      createId,
    );

    expect(changes.map((change) => change.type)).toEqual(["update", "create"]);
    const created = changes[1]?.type === "create" ? changes[1].event : undefined;
    expect(created).toMatchObject({ title: "Make-up class", start: third!.start });
    expect(created?.id).toMatch(/^new-/);
    expect(created).not.toHaveProperty("rrule");
    expect(created).not.toHaveProperty("seriesId");
  });

  it("this event: the new single event stays linked to its series and original start", () => {
    const changes = seriesChanges(
      series,
      third!,
      { ...third!, title: "Make-up" },
      "this",
      createId,
    );
    const created = changes[1]?.type === "create" ? changes[1].event : undefined;

    expect(created).toMatchObject({ exceptionOf: "class", recurrenceId: third!.recurrenceId });
  });

  it("this and following: ends the series and starts a new one with the remaining count", () => {
    const changes = seriesChanges(series, third!, later(third!), "following", createId);

    expect(changes[0]?.type === "update" && changes[0].after.rrule).toBe(
      "FREQ=WEEKLY;COUNT=2;BYDAY=MO,WE",
    );
    const created = changes[1]?.type === "create" ? changes[1].event : undefined;
    expect(created?.rrule).toBe("FREQ=WEEKLY;COUNT=4;BYDAY=MO,WE");
    expect(created?.start.toString()).toBe("2026-11-23T19:00:00-05:00[America/Lima]");
  });

  it("all events: moves the whole series by the same amount", () => {
    const [change] = seriesChanges(series, third!, later(third!), "all", createId);

    expect(change?.type).toBe("update");
    const updated = change?.type === "update" ? change.after : undefined;
    expect(updated?.id).toBe("class");
    expect(updated?.rrule).toBe(series.rrule);
    expect(updated?.start.toString()).toBe("2026-11-16T19:00:00-05:00[America/Lima]");
    expect(updated?.end.toString()).toBe("2026-11-16T21:00:00-05:00[America/Lima]");
    expect(updated).not.toHaveProperty("seriesId");
  });

  it("all events: excluded dates move with the series, so they stay excluded", () => {
    const withGap = { ...series, exdates: [third!.start] };
    const [, second] = occurrences(withGap, november, timeZone);
    const [change] = seriesChanges(withGap, second!, later(second!), "all", createId);
    const updated = change?.type === "update" ? change.after : undefined;

    expect(starts(occurrences(updated!, november, timeZone))).toEqual([
      "2026-11-16T19:00:00-05:00[America/Lima]",
      "2026-11-18T19:00:00-05:00[America/Lima]",
      "2026-11-25T19:00:00-05:00[America/Lima]",
      "2026-11-30T19:00:00-05:00[America/Lima]",
      "2026-12-02T19:00:00-05:00[America/Lima]",
    ]);
  });

  it("all events: moving to another day shifts excluded dates by the same days", () => {
    const days = {
      ...allDay("trip", new CalendarDate(2026, 11, 2), new CalendarDate(2026, 11, 3)),
      rrule: "FREQ=WEEKLY;COUNT=3",
      exdates: [new CalendarDate(2026, 11, 9)],
    };
    const [first] = occurrences(days, november, timeZone);
    const moved = {
      ...first!,
      start: first!.start.add({ days: 1 }),
      end: first!.end.add({ days: 1 }),
    } as CalendarEvent;

    const [change] = seriesChanges(days, first!, moved, "all", createId);
    const updated = change?.type === "update" ? change.after : undefined;
    expect(starts(occurrences(updated!, november, timeZone))).toEqual(["2026-11-03", "2026-11-17"]);
  });

  it("all events: shifts all-day series by days", () => {
    const days = {
      ...allDay("trip", new CalendarDate(2026, 11, 2), new CalendarDate(2026, 11, 4)),
      rrule: "FREQ=MONTHLY",
    };
    const [, december] = occurrences(days, november, timeZone);
    const moved = {
      ...december!,
      start: december!.start.add({ days: 1 }),
      end: december!.end.add({ days: 1 }),
    } as CalendarEvent;

    const [change] = seriesChanges(days, december!, moved, "all", createId);
    const updated = change?.type === "update" ? change.after : undefined;
    expect([updated?.start.toString(), updated?.end.toString()]).toEqual([
      "2026-11-03",
      "2026-11-05",
    ]);
  });
});

describe("seriesChanges: series with RDATE", () => {
  const lima = (value: string) => parseZonedDateTime(`${value}[America/Lima]`);
  const dates: CalendarEvent = {
    ...timed("talks", "2026-11-16T18:00", "2026-11-16T19:00"),
    rdates: [lima("2026-11-20T18:00"), lima("2026-11-27T18:00")],
  };
  const [, second] = occurrences(dates, november, timeZone);

  it("this event: the single event has no rdates", () => {
    const changes = seriesChanges(dates, second!, { ...second!, title: "x" }, "this", createId);
    const created = changes[1]?.type === "create" ? changes[1].event : undefined;
    expect(created).not.toHaveProperty("rdates");
    expect(created).toMatchObject({ exceptionOf: "talks" });
  });

  it("this and following: splits the dates between both series", () => {
    const changes = seriesChanges(
      dates,
      second!,
      { ...second!, title: "New" },
      "following",
      createId,
    );
    const ended = changes[0]?.type === "update" ? changes[0].after : undefined;
    const next = changes[1]?.type === "create" ? changes[1].event : undefined;

    expect(starts(occurrences(ended!, november, timeZone))).toEqual([
      "2026-11-16T18:00:00-05:00[America/Lima]",
    ]);
    expect(starts(occurrences(next!, november, timeZone))).toEqual([
      "2026-11-20T18:00:00-05:00[America/Lima]",
      "2026-11-27T18:00:00-05:00[America/Lima]",
    ]);
  });

  it("all events: moving one occurrence moves every date", () => {
    const moved = {
      ...second!,
      start: second!.start.add({ hours: 1 }),
      end: second!.end.add({ hours: 1 }),
    } as CalendarEvent;
    const [change] = seriesChanges(dates, second!, moved, "all", createId);
    const updated = change?.type === "update" ? change.after : undefined;

    expect(starts(occurrences(updated!, november, timeZone))).toEqual([
      "2026-11-16T19:00:00-05:00[America/Lima]",
      "2026-11-20T19:00:00-05:00[America/Lima]",
      "2026-11-27T19:00:00-05:00[America/Lima]",
    ]);
  });

  it("all events: only changes the series, never its exceptions", () => {
    const changes = seriesChanges(dates, second!, { ...second!, title: "All" }, "all", createId);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ type: "update", after: { id: "talks", title: "All" } });
  });
});
