import { toTimeZone, type CalendarDate, type ZonedDateTime } from "@internationalized/date";
import type { CalendarEvent } from "../events/types.js";
import { dateIn, rdateStarts, seriesStarts } from "./expand.js";
import { formatRRule, parseRRule } from "./rule.js";

type Start = CalendarDate | ZonedDateTime;

/** Copy of `series` that skips the occurrence starting at `start` (adds an EXDATE). */
export function excludeOccurrence<T extends CalendarEvent>(series: T, start: Start): T {
  return { ...series, exdates: [...(series.exdates ?? []), start] };
}

/**
 * Copy of `series` that ends right before the occurrence starting at `start`, used for
 * "this and following" edits. A COUNT becomes the number of earlier occurrences; otherwise
 * UNTIL is set just before `start`. RDATE starts from `start` on are dropped. `countBefore`
 * tells how many rule occurrences remain (all occurrences for a series without `rrule`).
 */
export function endSeriesBefore<T extends CalendarEvent>(
  series: T,
  start: Start,
): { series: T; countBefore: number } {
  if (!series.rrule && !series.rdates?.length) throw new TypeError("The event has no rrule.");
  const zone = "hour" in start ? start.timeZone : "UTC";
  const at = (value: Start) => ("hour" in value ? value.toDate().getTime() : value.toString());
  const { rdates: _rdates, ...withoutRdates } = series;
  const kept = rdateStarts(series).filter((date) => at(date) < at(start));
  const before = (kept.length ? { ...withoutRdates, rdates: kept } : withoutRdates) as T;
  if (!series.rrule) {
    return { series: before, countBefore: kept.length + (at(series.start) < at(start) ? 1 : 0) };
  }

  const rule = parseRRule(series.rrule);

  let countBefore = 0;
  for (const occurrence of seriesStarts(series, rule, dateIn(start, zone))) {
    if (at(occurrence.start) >= at(start)) break;
    countBefore++;
  }

  const { count, until: _until, ...rest } = rule;
  const ended =
    count !== undefined
      ? { ...rest, count: countBefore }
      : {
          ...rest,
          until:
            "hour" in start
              ? toTimeZone(start.subtract({ seconds: 1 }), "UTC")
              : start.subtract({ days: 1 }),
        };
  return { series: { ...before, rrule: formatRRule(ended) }, countBefore };
}
