import {
  CalendarDate,
  parseZonedDateTime,
  toTimeZone,
  type ZonedDateTime,
} from "@internationalized/date";

export const FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;
export const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;

export type Frequency = (typeof FREQUENCIES)[number];
export type Weekday = (typeof WEEKDAYS)[number];

/** A BYDAY entry: a weekday, optionally the nth one of the month or year (negative counts from the end). */
export interface ByDay {
  weekday: Weekday;
  n?: number;
}

/** The supported subset of an RFC 5545 RRULE. */
export interface RecurrenceRule {
  freq: Frequency;
  interval?: number;
  count?: number;
  /** Inclusive. A date for all-day series, a UTC time for timed series. */
  until?: CalendarDate | ZonedDateTime;
  byMonth?: number[];
  byMonthDay?: number[];
  byDay?: ByDay[];
  bySetPos?: number[];
  weekStart?: Weekday;
}

function integers(key: string, value: string, min: number, max: number, allowNegative = false) {
  return value.split(",").map((part) => {
    const number = Number(part);
    const valid =
      Number.isInteger(number) &&
      Math.abs(number) >= min &&
      Math.abs(number) <= max &&
      (allowNegative || number > 0);
    if (!valid) throw new RangeError(`Invalid ${key} value: ${part}`);
    return number;
  });
}

function weekday(key: string, value: string): Weekday {
  if (!(WEEKDAYS as readonly string[]).includes(value)) {
    throw new RangeError(`Invalid ${key} value: ${value}`);
  }
  return value as Weekday;
}

function parseUntil(value: string): CalendarDate | ZonedDateTime {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z)?$/.exec(value);
  if (!match) throw new RangeError(`UNTIL must be a date or a UTC time: ${value}`);
  const [, year, month, day, hour, minute, second] = match;
  if (hour === undefined) return new CalendarDate(Number(year), Number(month), Number(day));
  return parseZonedDateTime(`${year}-${month}-${day}T${hour}:${minute}:${second}[UTC]`);
}

/**
 * Parses an RRULE such as `FREQ=WEEKLY;BYDAY=MO,WE;COUNT=10` (the `RRULE:` prefix is optional).
 * Throws a RangeError for parts this library does not support, so they are never silently ignored.
 */
export function parseRRule(value: string): RecurrenceRule {
  const parts = value
    .trim()
    .replace(/^RRULE:/i, "")
    .split(";")
    .filter(Boolean);
  let rule: Partial<RecurrenceRule> = {};

  for (const part of parts) {
    const [rawKey = "", raw = ""] = part.split("=");
    const key = rawKey.toUpperCase();
    const text = raw.toUpperCase();

    switch (key) {
      case "FREQ":
        if (!(FREQUENCIES as readonly string[]).includes(text)) {
          throw new RangeError(`Unsupported FREQ: ${text}`);
        }
        rule.freq = text as Frequency;
        break;
      case "INTERVAL":
        rule.interval = integers(key, text, 1, Infinity)[0]!;
        break;
      case "COUNT":
        rule.count = integers(key, text, 1, Infinity)[0]!;
        break;
      case "UNTIL":
        rule.until = parseUntil(text);
        break;
      case "BYMONTH":
        rule.byMonth = integers(key, text, 1, 12);
        break;
      case "BYMONTHDAY":
        rule.byMonthDay = integers(key, text, 1, 31, true);
        break;
      case "BYSETPOS":
        rule.bySetPos = integers(key, text, 1, 366, true);
        break;
      case "WKST":
        rule.weekStart = weekday(key, text);
        break;
      case "BYDAY":
        rule.byDay = text.split(",").map((entry) => {
          const match = /^([+-]?\d{1,2})?([A-Z]{2})$/.exec(entry);
          if (!match) throw new RangeError(`Invalid BYDAY value: ${entry}`);
          const day: ByDay = { weekday: weekday(key, match[2]!) };
          if (match[1]) day.n = integers(key, match[1], 1, 53, true)[0]!;
          return day;
        });
        break;
      default:
        throw new RangeError(`Unsupported RRULE part: ${key}`);
    }
  }

  if (!rule.freq) throw new RangeError("RRULE needs a FREQ.");
  if (rule.count !== undefined && rule.until) {
    throw new RangeError("RRULE cannot have both COUNT and UNTIL.");
  }
  return rule as RecurrenceRule;
}

const pad = (value: number, length = 2) => String(value).padStart(length, "0");

function formatUntil(until: CalendarDate | ZonedDateTime) {
  if (!("hour" in until)) return `${pad(until.year, 4)}${pad(until.month)}${pad(until.day)}`;
  const utc = toTimeZone(until, "UTC");
  return `${pad(utc.year, 4)}${pad(utc.month)}${pad(utc.day)}T${pad(utc.hour)}${pad(utc.minute)}${pad(utc.second)}Z`;
}

/** Formats a rule as an RRULE value (without the `RRULE:` prefix), in a stable part order. */
export function formatRRule(rule: RecurrenceRule): string {
  const parts = [`FREQ=${rule.freq}`];
  if (rule.interval && rule.interval !== 1) parts.push(`INTERVAL=${rule.interval}`);
  if (rule.count !== undefined) parts.push(`COUNT=${rule.count}`);
  if (rule.until) parts.push(`UNTIL=${formatUntil(rule.until)}`);
  if (rule.byMonth?.length) parts.push(`BYMONTH=${rule.byMonth.join(",")}`);
  if (rule.byMonthDay?.length) parts.push(`BYMONTHDAY=${rule.byMonthDay.join(",")}`);
  if (rule.byDay?.length) {
    parts.push(`BYDAY=${rule.byDay.map(({ weekday, n }) => `${n ?? ""}${weekday}`).join(",")}`);
  }
  if (rule.bySetPos?.length) parts.push(`BYSETPOS=${rule.bySetPos.join(",")}`);
  if (rule.weekStart) parts.push(`WKST=${rule.weekStart}`);
  return parts.join(";");
}
