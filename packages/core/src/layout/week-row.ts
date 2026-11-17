import type { CalendarDate } from '@internationalized/date';
import { eventBounds, startOfDayMs } from '../events/queries.js';
import type { CalendarEvent } from '../events/types.js';

export interface RowEventLayout<T extends CalendarEvent = CalendarEvent> {
	event: T;
	/** Index of the first visible day in the row. */
	startIndex: number;
	/** Number of visible days the event covers. */
	span: number;
	/** Vertical slot inside the row, 0 is the top one. */
	lane: number;
	continuesBefore: boolean;
	continuesAfter: boolean;
}

/**
 * Packs events into lanes for a row of consecutive days (a month week, or the all-day row of a
 * week view). Longer and earlier events get the upper lanes; each event takes the lowest lane
 * that is free on all its days.
 */
export function layoutWeekRow<T extends CalendarEvent>(
	events: readonly T[],
	days: readonly CalendarDate[],
	timeZone: string
): RowEventLayout<T>[] {
	const last = days.at(-1);
	if (!last) return [];

	const edges = [...days, last.add({ days: 1 })].map((day) => startOfDayMs(day, timeZone));
	const rowStart = edges[0]!;
	const rowEnd = edges.at(-1)!;
	const placed: (RowEventLayout<T> & { sortStart: number })[] = [];

	for (const event of events) {
		const { start, end } = eventBounds(event, timeZone);
		if (start >= rowEnd || end <= rowStart) continue;

		const startIndex = days.findIndex((_, i) => start < edges[i + 1]!);
		const endIndex = days.findLastIndex((_, i) => end > edges[i]!);
		placed.push({
			event,
			startIndex,
			span: endIndex - startIndex + 1,
			lane: 0,
			continuesBefore: start < rowStart,
			continuesAfter: end > rowEnd,
			sortStart: start
		});
	}

	placed.sort(
		(a, b) => a.startIndex - b.startIndex || b.span - a.span || a.sortStart - b.sortStart
	);

	const taken: boolean[][] = days.map(() => []);
	for (const item of placed) {
		const covered = taken.slice(item.startIndex, item.startIndex + item.span);
		let lane = 0;
		while (covered.some((lanes) => lanes[lane])) lane++;
		for (const lanes of covered) lanes[lane] = true;
		item.lane = lane;
	}

	return placed.map(({ sortStart: _, ...item }) => item);
}
