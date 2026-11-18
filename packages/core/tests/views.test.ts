import { describe, expect, it } from "vitest";
import { CalendarDate } from "@internationalized/date";
import {
  countByDay,
  eventsForResource,
  flattenResources,
  groupByDay,
  type Resource,
} from "../src/index.js";
import { allDay, timeZone, timed } from "./fixtures.js";

const range = { start: new CalendarDate(2026, 11, 16), end: new CalendarDate(2026, 11, 20) };

describe("groupByDay (agenda)", () => {
  it("lists each day that has events, all-day first, then by start time", () => {
    const groups = groupByDay(
      [
        timed("late", "2026-11-17T15:00", "2026-11-17T16:00"),
        timed("early", "2026-11-17T08:00", "2026-11-17T09:00"),
        allDay("trip", new CalendarDate(2026, 11, 17), new CalendarDate(2026, 11, 19)),
        timed("outside", "2026-11-25T08:00", "2026-11-25T09:00"),
      ],
      range,
      timeZone,
    );

    expect(
      groups.map(({ day, events }) => [day.toString(), events.map((event) => event.id)]),
    ).toEqual([
      ["2026-11-17", ["trip", "early", "late"]],
      ["2026-11-18", ["trip"]],
    ]);
  });
});

describe("countByDay (year view)", () => {
  it("counts the events on each day, including every day of multi-day events", () => {
    const counts = countByDay(
      [
        timed("a", "2026-11-17T08:00", "2026-11-17T09:00"),
        timed("b", "2026-11-17T10:00", "2026-11-17T11:00"),
        allDay("trip", new CalendarDate(2026, 11, 18), new CalendarDate(2026, 11, 20)),
      ],
      range,
      timeZone,
    );

    expect(Object.fromEntries(counts)).toEqual({
      "2026-11-17": 2,
      "2026-11-18": 1,
      "2026-11-19": 1,
    });
  });
});

describe("resources", () => {
  const resources: Resource[] = [
    { id: "rooms", title: "Salas" },
    { id: "room-a", title: "Sala A", parentId: "rooms" },
    { id: "room-b", title: "Sala B", parentId: "rooms" },
    { id: "ana", title: "Ana" },
  ];

  it("flattens the tree in order with depth and hides children of collapsed resources", () => {
    const rows = (collapsed: string[]) =>
      flattenResources(resources, new Set(collapsed)).map(
        (row) => `${row.depth}:${row.resource.id}${row.hasChildren ? "+" : ""}`,
      );

    expect(rows([])).toEqual(["0:rooms+", "1:room-a", "1:room-b", "0:ana"]);
    expect(rows(["rooms"])).toEqual(["0:rooms+", "0:ana"]);
  });

  it("finds the events assigned to a resource", () => {
    const meeting = {
      ...timed("m", "2026-11-17T08:00", "2026-11-17T09:00"),
      resourceIds: ["room-a", "ana"],
    };
    const other = {
      ...timed("o", "2026-11-17T08:00", "2026-11-17T09:00"),
      resourceIds: ["room-b"],
    };

    expect(eventsForResource([meeting, other], "ana").map((event) => event.id)).toEqual(["m"]);
  });
});
