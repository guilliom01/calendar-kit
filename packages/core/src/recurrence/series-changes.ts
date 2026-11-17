import { toCalendarDate, toTimeZone, toZoned } from '@internationalized/date';
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

/**
 * New start and end for the whole series when one occurrence moved from `occurrence` to `changed`:
 * the series keeps its first date, shifted by the same number of days, and takes the new time.
 */
function shiftSeries<T extends CalendarEvent>(series: T, occurrence: T, changed: T) {
	const days = daysBetween(
		isAllDay(occurrence) ? occurrence.start : toCalendarDate(occurrence.start),
		isAllDay(changed) ? changed.start : toCalendarDate(changed.start)
	);
	const firstDay = (isAllDay(series) ? series.start : toCalendarDate(series.start)).add({ days });

	if (isAllDay(changed)) {
		return {
			start: firstDay,
			end: firstDay.add({ days: daysBetween(changed.start, changed.end) })
		};
	}
	const zone = isAllDay(series) ? changed.start.timeZone : series.start.timeZone;
	const time = toTimeZone(changed.start, zone);
	const start = toZoned(firstDay, zone).set({
		hour: time.hour,
		minute: time.minute,
		second: time.second
	});
	return { start, end: start.add({ milliseconds: duration(changed) }) };
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

	const timing = shiftSeries(series, occurrence, changed);
	const after = { ...standalone(changed), ...timing, id: series.id } as T;
	if (series.exdates) after.exdates = series.exdates;
	return [{ type: 'update', before: series, after }];
}
