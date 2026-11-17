import {
	toCalendarDate,
	toTimeZone,
	toZoned,
	type CalendarDate,
	type ZonedDateTime
} from '@internationalized/date';
import { isAllDay } from '../events/queries.js';
import type { CalendarEvent } from '../events/types.js';
import type { Mutation } from '../store/event-store.js';
import { daysBetween } from '../time/week.js';
import { endSeriesBefore, excludeOccurrence } from './edit.js';
import { formatRRule, parseRRule } from './rule.js';

/** Which occurrences a change to a recurring event applies to. */
export type SeriesScope = 'this' | 'following' | 'all';

/** Drops the fields that only expanded occurrences carry. */
function standalone<T extends CalendarEvent>(event: T): T {
	const { seriesId: _seriesId, recurrenceId: _recurrenceId, ...rest } = event;
	return rest as T;
}

const duration = (event: CalendarEvent) =>
	event.end.toDate('UTC').getTime() - event.start.toDate('UTC').getTime();

type Start = CalendarDate | ZonedDateTime;

/**
 * How every start of a series moves when one occurrence moved from `occurrence` to `changed`:
 * by the same number of days, taking the new time of day (or becoming all-day).
 * Applied to the series start and to its excluded dates, so exclusions stay in place.
 */
function seriesShift<T extends CalendarEvent>(series: T, occurrence: T, changed: T) {
	const zone = isAllDay(series)
		? isAllDay(changed)
			? 'UTC'
			: changed.start.timeZone
		: series.start.timeZone;
	const dayOf = (start: Start) =>
		'hour' in start ? toCalendarDate(toTimeZone(start, zone)) : start;
	const days = daysBetween(dayOf(occurrence.start), dayOf(changed.start));
	const time = isAllDay(changed) ? undefined : toTimeZone(changed.start, zone);

	return (start: Start): Start => {
		const day = dayOf(start).add({ days });
		if (!time) return day;
		return toZoned(day, zone).set({ hour: time.hour, minute: time.minute, second: time.second });
	};
}

/**
 * The store changes that apply an edit (`changed`) or a deletion (`changed = null`) of one
 * `occurrence` of `series` to the chosen `scope`. Pass them to `EventStore.batch` so the whole
 * change is one undo step.
 *
 * - `this`: excludes the occurrence; an edit becomes a new single event.
 * - `following`: ends the series before the occurrence; an edit starts a new series there.
 * - `all`: changes or deletes the series; moving an occurrence moves every occurrence.
 */
export function seriesChanges<T extends CalendarEvent>(
	series: T,
	occurrence: T,
	changed: T | null,
	scope: SeriesScope,
	createId: () => string
): Mutation<T>[] {
	const originalStart = occurrence.recurrenceId ?? occurrence.start;
	const { series: ended, countBefore } = endSeriesBefore(series, originalStart);
	if (scope === 'following' && countBefore === 0) scope = 'all';

	if (!changed) {
		if (scope === 'all') return [{ type: 'delete', event: series }];
		const after = scope === 'this' ? excludeOccurrence(series, originalStart) : ended;
		return [{ type: 'update', before: series, after }];
	}

	if (scope === 'this') {
		const single = { ...standalone(changed), id: createId() };
		delete single.rrule;
		delete single.exdates;
		return [
			{ type: 'update', before: series, after: excludeOccurrence(series, originalStart) },
			{ type: 'create', event: single }
		];
	}

	if (scope === 'following') {
		const rule = parseRRule(changed.rrule ?? series.rrule!);
		// Same rule as before: the new series takes over the occurrences that are left.
		if (changed.rrule === series.rrule && rule.count !== undefined) rule.count -= countBefore;
		const next = { ...standalone(changed), id: createId(), rrule: formatRRule(rule) };
		delete next.exdates;
		return [
			{ type: 'update', before: series, after: ended },
			{ type: 'create', event: next }
		];
	}

	const shift = seriesShift(series, occurrence, changed);
	const start = shift(series.start);
	const end =
		'hour' in start
			? start.add({ milliseconds: duration(changed) })
			: start.add({
					days: daysBetween(changed.start as CalendarDate, changed.end as CalendarDate)
				});
	const after = { ...standalone(changed), start, end, id: series.id } as T;
	if (series.exdates) after.exdates = series.exdates.map(shift);
	return [{ type: 'update', before: series, after }];
}
