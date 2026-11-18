import {
  endOfMonth,
  getDayOfWeek,
  startOfMonth,
  toCalendarDate,
  toZoned,
  CalendarDate,
  type ZonedDateTime,
} from "@internationalized/date";
import { isAllDay, startOfDayMs } from "../events/queries.js";
import type { CalendarEvent } from "../events/types.js";
import { daysBetween } from "../time/week.js";
import type { DateRange } from "../time/view.js";
import { parseRRule, WEEKDAYS, type ByDay, type RecurrenceRule, type Weekday } from "./rule.js";

/** Guards against rules that never produce a date (e.g. February 30th). */
const MAX_PERIODS = 50_000;

const weekdayOf = (date: CalendarDate): Weekday => WEEKDAYS[getDayOfWeek(date, "en-US", "mon")]!;

function sortUnique(dates: CalendarDate[]) {
  const sorted = [...dates].sort((a, b) => a.compare(b));
  return sorted.filter((date, index) => index === 0 || date.compare(sorted[index - 1]!) !== 0);
}

function applySetPos(dates: CalendarDate[], positions: number[] | undefined) {
  if (!positions) return dates;
  const picked = positions.map((pos) => (pos > 0 ? dates[pos - 1] : dates[dates.length + pos]));
  return sortUnique(picked.filter((date): date is CalendarDate => !!date));
}

/** Picks the nth date (negative from the end); all of them when `n` is missing. */
const nth = (dates: CalendarDate[], n: number | undefined) => {
  if (n === undefined) return dates;
  const date = n > 0 ? dates[n - 1] : dates[dates.length + n];
  return date ? [date] : [];
};

/** Every date from `first` to `last` (inclusive) that falls on `weekday`. */
function weekdaysBetween(first: CalendarDate, last: CalendarDate, weekday: Weekday) {
  const offset = (WEEKDAYS.indexOf(weekday) - WEEKDAYS.indexOf(weekdayOf(first)) + 7) % 7;
  const dates: CalendarDate[] = [];
  for (
    let date = first.add({ days: offset });
    date.compare(last) <= 0;
    date = date.add({ weeks: 1 })
  ) {
    dates.push(date);
  }
  return dates;
}

function monthDates(first: CalendarDate, rule: RecurrenceRule, defaultDay: number) {
  const last = endOfMonth(first);
  let dates: CalendarDate[] | undefined;

  if (rule.byMonthDay) {
    dates = rule.byMonthDay
      .map((day) => (day > 0 ? day : last.day + 1 + day))
      .filter((day) => day >= 1 && day <= last.day)
      .map((day) => first.set({ day }));
  }
  if (rule.byDay) {
    const byDay = rule.byDay.flatMap(({ weekday, n }) =>
      nth(weekdaysBetween(first, last, weekday), n),
    );
    dates = dates ? dates.filter((date) => byDay.some((day) => day.compare(date) === 0)) : byDay;
  }
  return sortUnique(dates ?? (defaultDay <= last.day ? [first.set({ day: defaultDay })] : []));
}

function yearDates(year: number, rule: RecurrenceRule, anchor: CalendarDate) {
  const months = (list: number[]) =>
    list.flatMap((month) => monthDates(new CalendarDate(year, month, 1), rule, anchor.day));

  if (rule.byMonth) return months(rule.byMonth);
  if (rule.byMonthDay) return months([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  if (rule.byDay) {
    const first = new CalendarDate(year, 1, 1);
    const last = new CalendarDate(year, 12, 31);
    return sortUnique(
      rule.byDay.flatMap(({ weekday, n }: ByDay) => nth(weekdaysBetween(first, last, weekday), n)),
    );
  }
  const date = new CalendarDate(year, anchor.month, anchor.day);
  return date.day === anchor.day ? [date] : []; // February 29th only in leap years
}

function matchesFilters(date: CalendarDate, rule: RecurrenceRule) {
  if (rule.byMonth && !rule.byMonth.includes(date.month)) return false;
  if (rule.byDay && !rule.byDay.some(({ weekday }) => weekday === weekdayOf(date))) return false;
  if (rule.byMonthDay) {
    const length = endOfMonth(date).day;
    const matches = rule.byMonthDay.some((day) => (day > 0 ? day : length + 1 + day) === date.day);
    if (!matches) return false;
  }
  return true;
}

/** Candidate dates of each period (day, week, month or year) of the rule, in order. */
function* periods(rule: RecurrenceRule, anchor: CalendarDate) {
  const interval = rule.interval ?? 1;
  const weekStart = WEEKDAYS.indexOf(rule.weekStart ?? "MO");
  const firstWeek = anchor.subtract({
    days: (WEEKDAYS.indexOf(weekdayOf(anchor)) - weekStart + 7) % 7,
  });

  for (let period = 0; period < MAX_PERIODS; period++) {
    const step = period * interval;
    if (rule.freq === "DAILY") {
      const date = anchor.add({ days: step });
      yield { start: date, dates: matchesFilters(date, rule) ? [date] : [] };
    } else if (rule.freq === "WEEKLY") {
      const start = firstWeek.add({ weeks: step });
      const weekdays = rule.byDay?.map(({ weekday }) => weekday) ?? [weekdayOf(anchor)];
      const days = Array.from({ length: 7 }, (_, offset) => start.add({ days: offset })).filter(
        (date) =>
          weekdays.includes(weekdayOf(date)) &&
          (!rule.byMonth || rule.byMonth.includes(date.month)),
      );
      yield { start, dates: applySetPos(days, rule.bySetPos) };
    } else if (rule.freq === "MONTHLY") {
      const start = startOfMonth(anchor).add({ months: step });
      const inMonth = !rule.byMonth || rule.byMonth.includes(start.month);
      const dates = inMonth ? monthDates(start, rule, anchor.day) : [];
      yield { start, dates: applySetPos(dates, rule.bySetPos) };
    } else {
      const start = new CalendarDate(anchor.year + step, 1, 1);
      yield { start, dates: applySetPos(yearDates(start.year, rule, anchor), rule.bySetPos) };
    }
  }
}

type Start = CalendarDate | ZonedDateTime;

/** Absolute time used to compare starts; all-day dates are read in `timeZone`. */
const instant = (start: Start, timeZone: string) =>
  "hour" in start ? start.toDate().getTime() : startOfDayMs(start, timeZone);

/**
 * Every start of a series, in order, honoring COUNT and UNTIL. Excluded dates are yielded with
 * `excluded: true` because they still count toward COUNT. Stops after `stopAfter` (a date).
 */
export function* seriesStarts(
  event: CalendarEvent,
  rule: RecurrenceRule,
  stopAfter: CalendarDate,
): Generator<{ start: Start; excluded: boolean }> {
  const zone = isAllDay(event) ? "UTC" : event.start.timeZone;
  const anchor = isAllDay(event) ? event.start : toCalendarDate(event.start);
  const excluded = new Set(event.exdates?.map((date) => instant(date, zone)));
  const until =
    rule.until &&
    ("hour" in rule.until
      ? rule.until.toDate().getTime()
      : startOfDayMs(rule.until.add({ days: 1 }), zone) - 1);
  let count = 0;

  for (const period of periods(rule, anchor)) {
    if (period.start.compare(stopAfter) > 0) return;
    for (const date of period.dates) {
      if (date.compare(anchor) < 0) continue;
      const start: Start = isAllDay(event)
        ? date
        : event.start.set({ year: date.year, month: date.month, day: date.day });
      const at = instant(start, zone);
      if (until !== undefined && at > until) return;
      if (rule.count !== undefined && ++count > rule.count) return;
      yield { start, excluded: excluded.has(at) };
    }
  }
}

/** The RDATE starts of `event` as the series' own kind: dates for all-day, times for timed. */
export function rdateStarts(event: CalendarEvent): Start[] {
  return (event.rdates ?? []).map((date) => {
    if (isAllDay(event)) return "hour" in date ? toCalendarDate(date) : date;
    return "hour" in date
      ? date
      : event.start.set({ year: date.year, month: date.month, day: date.day });
  });
}

/** Whether `start` is one of the starts of the series `event`, excluded ones included. */
export function isSeriesStart(event: CalendarEvent, start: Start): boolean {
  const zone = isAllDay(event) ? "UTC" : event.start.timeZone;
  const at = instant(start, zone);
  const same = (other: Start) => instant(other, zone) === at;
  if (rdateStarts(event).some(same)) return true;
  if (!event.rrule) return same(event.start);
  for (const series of seriesStarts(event, parseRRule(event.rrule), dateIn(start, zone))) {
    if (same(series.start)) return true;
  }
  return false;
}

/** Separator between the series id and the occurrence start in occurrence ids. */
export const OCCURRENCE_SEPARATOR = "::";

/**
 * The occurrences of `event` that overlap `range` (end exclusive) seen from `timeZone`.
 * Each occurrence is a copy with its own `id`, `start` and `end`, plus `seriesId` and
 * `recurrenceId` (its original start). RDATE starts join the rule's ones, in order and without
 * duplicates. Events without `rrule` or `rdates` are returned as is if they overlap.
 */
export function occurrences<T extends CalendarEvent>(
  event: T,
  range: DateRange,
  timeZone: string,
): T[] {
  const rangeStart = startOfDayMs(range.start, timeZone);
  const rangeEnd = startOfDayMs(range.end, timeZone);
  const overlaps = (start: Start, end: Start) => {
    const from = instant(start, timeZone);
    return from < rangeEnd && Math.max(instant(end, timeZone), from + 1) > rangeStart;
  };

  if (!event.rrule && !event.rdates?.length) {
    return overlaps(event.start, event.end) ? [event] : [];
  }

  // One extra day covers series stored in another time zone.
  const stopAfter = range.end.add({ days: 1 });
  const zone = isAllDay(event) ? "UTC" : event.start.timeZone;
  const excluded = new Set(event.exdates?.map((date) => instant(date, zone)));
  // Keyed by instant, so an RDATE equal to a rule start appears once.
  const starts = new Map<number, Start>();
  if (event.rrule) {
    for (const { start } of seriesStarts(event, parseRRule(event.rrule), stopAfter)) {
      if (instant(start, timeZone) >= rangeEnd) break;
      starts.set(instant(start, zone), start);
    }
  } else starts.set(instant(event.start, zone), event.start);
  for (const start of rdateStarts(event)) starts.set(instant(start, zone), start);
  const ordered = [...starts]
    .filter(([at]) => !excluded.has(at))
    .sort(([a], [b]) => a - b)
    .map(([, start]) => start);
  const result: T[] = [];

  for (const start of ordered) {
    const end = isAllDay(event)
      ? (start as CalendarDate).add({ days: daysBetween(event.start, event.end) })
      : (start as ZonedDateTime).add({
          milliseconds: event.end.toDate().getTime() - event.start.toDate().getTime(),
        });
    if (instant(start, timeZone) >= rangeEnd) break;
    if (overlaps(start, end)) {
      result.push({
        ...event,
        id: `${event.id}${OCCURRENCE_SEPARATOR}${start.toString()}`,
        start,
        end,
        seriesId: event.id,
        recurrenceId: start,
      });
    }
  }
  return result;
}

/** Expands every recurring event into its occurrences in `range`; keeps single events that overlap. */
export function expandEvents<T extends CalendarEvent>(
  events: readonly T[],
  range: DateRange,
  timeZone: string,
): T[] {
  return events.flatMap((event) => occurrences(event, range, timeZone));
}

/** Date in `timeZone` of an instant, used to bound series iteration. */
export const dateIn = (start: Start, timeZone: string): CalendarDate =>
  "hour" in start ? toCalendarDate(toZoned(start, timeZone)) : start;
