import { describe, expect, it } from "vitest";
import { RRuleTemporal } from "rrule-temporal";
import { CalendarDate, parseZonedDateTime } from "@internationalized/date";
import {
  endSeriesBefore,
  excludeOccurrence,
  expandEvents,
  formatRRule,
  occurrences,
  parseRRule,
  type CalendarEvent,
} from "../src/index.js";
import { allDay, timeZone, timed } from "./fixtures.js";

const wide = { start: new CalendarDate(2020, 1, 1), end: new CalendarDate(2045, 1, 1) };
const starts = (events: CalendarEvent[]) => events.map((event) => event.start.toString());

describe("parseRRule / formatRRule", () => {
  it("round-trips the supported parts", () => {
    const value = "FREQ=MONTHLY;INTERVAL=2;COUNT=5;BYDAY=-1FR,2TU;BYSETPOS=1;WKST=SU";
    const rule = parseRRule(`RRULE:${value}`);

    expect(rule).toMatchObject({
      freq: "MONTHLY",
      interval: 2,
      count: 5,
      byDay: [
        { weekday: "FR", n: -1 },
        { weekday: "TU", n: 2 },
      ],
      bySetPos: [1],
      weekStart: "SU",
    });
    expect(formatRRule(rule)).toBe(value);
  });

  it("reads UNTIL as a date or as a UTC time", () => {
    expect(parseRRule("FREQ=DAILY;UNTIL=20261231").until?.toString()).toBe("2026-12-31");
    expect(formatRRule(parseRRule("FREQ=DAILY;UNTIL=20261231T235959Z"))).toBe(
      "FREQ=DAILY;UNTIL=20261231T235959Z",
    );
  });

  it("rejects parts it does not support instead of ignoring them", () => {
    expect(() => parseRRule("FREQ=DAILY;BYHOUR=9")).toThrow(RangeError);
    expect(() => parseRRule("FREQ=HOURLY")).toThrow(RangeError);
    expect(() => parseRRule("INTERVAL=2")).toThrow(RangeError);
  });
});

describe("occurrences match rrule-temporal", () => {
  const cases: [zone: string, start: string, rule: string][] = [
    ["America/Lima", "20261118T090000", "FREQ=DAILY;COUNT=5"],
    ["America/Lima", "20261118T090000", "FREQ=DAILY;INTERVAL=3;COUNT=5"],
    ["America/Lima", "20261118T090000", "FREQ=DAILY;BYMONTH=1;COUNT=5"],
    ["America/Lima", "20261118T090000", "FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10"],
    ["America/Lima", "20261118T090000", "FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH;COUNT=8"],
    ["America/Lima", "20261118T090000", "FREQ=WEEKLY;BYDAY=MO;COUNT=3"],
    ["America/Lima", "20261118T090000", "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,SU;WKST=SU;COUNT=6"],
    ["America/Lima", "20261118T090000", "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,SU;WKST=MO;COUNT=6"],
    ["America/Lima", "20261118T090000", "FREQ=WEEKLY;BYDAY=SA;UNTIL=20261231T235959Z"],
    ["America/Lima", "20260131T090000", "FREQ=MONTHLY;COUNT=6"],
    ["America/Lima", "20261118T090000", "FREQ=MONTHLY;BYMONTHDAY=1,15;COUNT=6"],
    ["America/Lima", "20261118T090000", "FREQ=MONTHLY;BYMONTHDAY=-1;COUNT=6"],
    ["America/Lima", "20261118T090000", "FREQ=MONTHLY;BYDAY=-1FR;COUNT=6"],
    ["America/Lima", "20261118T090000", "FREQ=MONTHLY;BYDAY=2TU;COUNT=6"],
    ["America/Lima", "20261118T090000", "FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1;COUNT=6"],
    ["America/Lima", "20261118T090000", "FREQ=MONTHLY;BYDAY=FR;BYMONTHDAY=13;COUNT=3"],
    ["America/Lima", "20261118T090000", "FREQ=YEARLY;COUNT=4"],
    ["America/Lima", "20240229T090000", "FREQ=YEARLY;COUNT=3"],
    ["America/Lima", "20261118T090000", "FREQ=YEARLY;BYMONTH=11;BYDAY=4TH;COUNT=4"],
    ["America/Lima", "20261118T090000", "FREQ=YEARLY;BYDAY=20MO;COUNT=3"],
    ["America/Lima", "20260105T090000", "FREQ=YEARLY;BYMONTHDAY=1;COUNT=4"],
    ["America/Lima", "20261118T090000", "FREQ=YEARLY;BYMONTH=1,7;BYDAY=MO;BYSETPOS=1;COUNT=4"],
    // DST ends on 2026-11-01 in New York: occurrences keep their 09:00 wall time.
    ["America/New_York", "20261029T090000", "FREQ=DAILY;COUNT=5"],
  ];

  it.each(cases)("%s %s %s", (zone, start, rule) => {
    const expected = new RRuleTemporal({
      rruleString: `DTSTART;TZID=${zone}:${start}\nRRULE:${rule}`,
    })
      .all((_, index) => index < 50)
      .map((date) => date.toString());

    const iso = `${start.slice(0, 4)}-${start.slice(4, 6)}-${start.slice(6, 8)}T${start.slice(9, 11)}:${start.slice(11, 13)}`;
    const series = {
      id: "series",
      title: "series",
      start: parseZonedDateTime(`${iso}[${zone}]`),
      end: parseZonedDateTime(`${iso}[${zone}]`).add({ minutes: 30 }),
      rrule: rule,
    };

    expect(starts(occurrences(series, wide, zone)).slice(0, 50)).toEqual(expected);
  });
});

describe("occurrences", () => {
  const weekly = {
    ...timed("class", "2026-11-16T18:00", "2026-11-16T20:00"),
    rrule: "FREQ=WEEKLY;BYDAY=MO,WE",
  };
  const november = { start: new CalendarDate(2026, 11, 15), end: new CalendarDate(2026, 11, 29) };

  it("returns only occurrences that overlap the range, with stable ids and the series id", () => {
    const result = occurrences(weekly, november, timeZone);

    expect(result.map((event) => event.id)).toEqual([
      "class::2026-11-16T18:00:00-05:00[America/Lima]",
      "class::2026-11-18T18:00:00-05:00[America/Lima]",
      "class::2026-11-23T18:00:00-05:00[America/Lima]",
      "class::2026-11-25T18:00:00-05:00[America/Lima]",
    ]);
    expect(result[1]).toMatchObject({ seriesId: "class", title: "class" });
    expect(result[1]?.end.toString()).toBe("2026-11-18T20:00:00-05:00[America/Lima]");
  });

  it("skips excluded dates but still counts them toward COUNT", () => {
    const series = {
      ...weekly,
      rrule: "FREQ=WEEKLY;BYDAY=MO,WE;COUNT=3",
      exdates: [parseZonedDateTime("2026-11-18T18:00[America/Lima]")],
    };
    expect(starts(occurrences(series, november, timeZone))).toEqual([
      "2026-11-16T18:00:00-05:00[America/Lima]",
      "2026-11-23T18:00:00-05:00[America/Lima]",
    ]);
  });

  it("repeats all-day events by date", () => {
    const series = {
      ...allDay("payday", new CalendarDate(2026, 1, 31), new CalendarDate(2026, 2, 1)),
      rrule: "FREQ=MONTHLY;BYMONTHDAY=-1",
    };
    const firstHalf = { start: new CalendarDate(2026, 1, 1), end: new CalendarDate(2026, 7, 1) };
    expect(starts(occurrences(series, firstHalf, timeZone))).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
      "2026-06-30",
    ]);
  });

  it("stops safely on rules that never match", () => {
    const series = { ...weekly, rrule: "FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=30" };
    expect(occurrences(series, wide, timeZone)).toEqual([]);
  });
});

describe("expandEvents", () => {
  it("expands recurring events and keeps single events that overlap the range", () => {
    const events = [
      timed("single", "2026-11-18T09:00", "2026-11-18T10:00"),
      timed("outside", "2026-12-18T09:00", "2026-12-18T10:00"),
      { ...timed("daily", "2026-11-17T08:00", "2026-11-17T08:15"), rrule: "FREQ=DAILY;COUNT=3" },
    ];
    const range = { start: new CalendarDate(2026, 11, 18), end: new CalendarDate(2026, 11, 20) };

    expect(expandEvents(events, range, timeZone).map((event) => event.id)).toEqual([
      "single",
      "daily::2026-11-18T08:00:00-05:00[America/Lima]",
      "daily::2026-11-19T08:00:00-05:00[America/Lima]",
    ]);
  });
});

describe("series editing", () => {
  const series = {
    ...timed("class", "2026-11-16T18:00", "2026-11-16T20:00"),
    rrule: "FREQ=WEEKLY;BYDAY=MO,WE;COUNT=6",
  };
  const third = parseZonedDateTime("2026-11-23T18:00[America/Lima]");

  it("excludes one occurrence", () => {
    const updated = excludeOccurrence(series, third);
    expect(updated.exdates?.map(String)).toEqual([third.toString()]);
    expect(series).not.toHaveProperty("exdates");
  });

  it("ends the series before an occurrence and returns how many occurrences came before", () => {
    const { series: ended, countBefore } = endSeriesBefore(series, third);

    expect(countBefore).toBe(2);
    expect(ended.rrule).toBe("FREQ=WEEKLY;COUNT=2;BYDAY=MO,WE");
    expect(starts(occurrences(ended, wide, timeZone))).toEqual([
      "2026-11-16T18:00:00-05:00[America/Lima]",
      "2026-11-18T18:00:00-05:00[America/Lima]",
    ]);
  });

  it("uses UNTIL when the series has no COUNT", () => {
    const { series: ended } = endSeriesBefore(
      { ...series, rrule: "FREQ=WEEKLY;BYDAY=MO,WE" },
      third,
    );
    expect(ended.rrule).toBe("FREQ=WEEKLY;UNTIL=20261123T225959Z;BYDAY=MO,WE");
  });
});

describe("RDATE", () => {
  const lima = (value: string) => parseZonedDateTime(`${value}[America/Lima]`);
  const series: CalendarEvent = {
    ...timed("class", "2026-11-16T18:00", "2026-11-16T20:00"),
    rrule: "FREQ=WEEKLY;COUNT=3",
    // Out of order, one repeats an rrule start and one is excluded.
    rdates: [lima("2026-11-25T18:00"), lima("2026-11-18T18:00"), lima("2026-11-23T18:00")],
    exdates: [lima("2026-11-25T18:00")],
  };

  it("adds the extra starts in order, without duplicates or excluded dates", () => {
    const result = occurrences(series, wide, timeZone);

    expect(starts(result)).toEqual([
      "2026-11-16T18:00:00-05:00[America/Lima]",
      "2026-11-18T18:00:00-05:00[America/Lima]",
      "2026-11-23T18:00:00-05:00[America/Lima]",
      "2026-11-30T18:00:00-05:00[America/Lima]",
    ]);
    expect(result[1]).toMatchObject({
      id: "class::2026-11-18T18:00:00-05:00[America/Lima]",
      seriesId: "class",
      recurrenceId: lima("2026-11-18T18:00"),
    });
    expect(result[1]!.end.toString()).toBe("2026-11-18T20:00:00-05:00[America/Lima]");
  });

  it("only returns the extra starts inside the range", () => {
    const week = { start: new CalendarDate(2026, 11, 17), end: new CalendarDate(2026, 11, 20) };
    expect(starts(expandEvents([series], week, timeZone))).toEqual([
      "2026-11-18T18:00:00-05:00[America/Lima]",
    ]);
  });

  it("makes a series without rrule: the start plus each date", () => {
    const dates: CalendarEvent = {
      ...allDay("fair", new CalendarDate(2026, 11, 20), new CalendarDate(2026, 11, 21)),
      rdates: [new CalendarDate(2026, 12, 4), new CalendarDate(2026, 11, 27)],
    };
    const result = occurrences(dates, wide, timeZone);

    expect(starts(result)).toEqual(["2026-11-20", "2026-11-27", "2026-12-04"]);
    expect(result.map((event) => event.end.toString())).toEqual([
      "2026-11-21",
      "2026-11-28",
      "2026-12-05",
    ]);
    expect(result.every((event) => event.seriesId === "fair")).toBe(true);
  });
});
