import { toTimeZone, type CalendarDate, type ZonedDateTime } from '@internationalized/date';
import type { CalendarEvent } from '../events/types.js';
import { dateIn, seriesStarts } from './expand.js';
import { formatRRule, parseRRule } from './rule.js';

type Start = CalendarDate | ZonedDateTime;

/** Copy of `series` that skips the occurrence starting at `start` (adds an EXDATE). */
export function excludeOccurrence<T extends CalendarEvent>(series: T, start: Start): T {
	return { ...series, exdates: [...(series.exdates ?? []), start] };
}

/**
 * Copy of `series` that ends right before the occurrence starting at `start`, used for
 * "this and following" edits. A COUNT becomes the number of earlier occurrences; otherwise
 * UNTIL is set just before `start`. `countBefore` tells how many occurrences remain.
 */
export function endSeriesBefore<T extends CalendarEvent>(
	series: T,
	start: Start
): { series: T; countBefore: number } {
	if (!series.rrule) throw new TypeError('The event has no rrule.');
	const rule = parseRRule(series.rrule);
	const zone = 'hour' in start ? start.timeZone : 'UTC';
	const at = (value: Start) => ('hour' in value ? value.toDate().getTime() : value.toString());

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
						'hour' in start
							? toTimeZone(start.subtract({ seconds: 1 }), 'UTC')
							: start.subtract({ days: 1 })
				};
	return { series: { ...series, rrule: formatRRule(ended) }, countBefore };
}
