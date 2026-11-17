import { parseDate, type CalendarDate } from '@internationalized/date';
import { daysBetween, moveEvent, type CalendarEvent } from '@calendar-kit/core';

/** Pixels the pointer must travel before a press becomes a drag. */
const DRAG_THRESHOLD = 4;

export interface PointerTracking {
	/** Pointer moved past the threshold (called on every move after that). */
	onMove: (event: PointerEvent) => void;
	/** Pointer released after a drag. */
	onDrop: (event: PointerEvent) => void;
	/** Pointer released without dragging. */
	onClick?: (event: PointerEvent) => void;
	/** Escape pressed or the browser cancelled the pointer. */
	onCancel?: () => void;
}

/** Stops the click the browser fires right after a drag, so dropping does not also open the event. */
function swallowNextClick() {
	const swallow = (click: MouseEvent) => {
		click.stopPropagation();
		click.preventDefault();
	};
	window.addEventListener('click', swallow, { capture: true, once: true });
	// No click follows when the pointer was released over another element.
	setTimeout(() => window.removeEventListener('click', swallow, { capture: true }));
}

/** Follows a primary-button press until it is released or cancelled. */
export function trackPointer(down: PointerEvent, handlers: PointerTracking) {
	if (down.button !== 0) return;
	let dragging = false;

	const move = (event: PointerEvent) => {
		const distance = Math.hypot(event.clientX - down.clientX, event.clientY - down.clientY);
		if (!dragging && distance < DRAG_THRESHOLD) return;
		dragging = true;
		handlers.onMove(event);
	};
	const up = (event: PointerEvent) => {
		stop();
		if (dragging) {
			swallowNextClick();
			handlers.onDrop(event);
		} else handlers.onClick?.(event);
	};
	const cancel = () => {
		stop();
		handlers.onCancel?.();
	};
	const key = (event: KeyboardEvent) => {
		if (event.key === 'Escape') cancel();
	};
	const stop = () => {
		window.removeEventListener('pointermove', move);
		window.removeEventListener('pointerup', up);
		window.removeEventListener('pointercancel', cancel);
		window.removeEventListener('keydown', key);
	};

	window.addEventListener('pointermove', move);
	window.addEventListener('pointerup', up);
	window.addEventListener('pointercancel', cancel);
	window.addEventListener('keydown', key);
}

/**
 * The cell under the pointer: the nearest element with a `data-date` attribute, and its
 * `data-resource` (empty or missing when the row has no resource).
 */
export function cellAtPoint(
	x: number,
	y: number
): { date: CalendarDate; resource: string | undefined } | undefined {
	for (const element of document.elementsFromPoint(x, y)) {
		const { date, resource } = (element as HTMLElement).dataset ?? {};
		if (date) return { date: parseDate(date), resource: resource || undefined };
	}
	return undefined;
}

/** The day under the pointer. */
export const dayAtPoint = (x: number, y: number) => cellAtPoint(x, y)?.date;

/** Resource ids after moving an event from the `from` row to the `to` row. */
function moveResource(ids: readonly string[] | undefined, from?: string, to?: string) {
	if (from === to) return ids;
	const rest = (ids ?? []).filter((id) => id !== from && id !== to);
	return to ? [...rest, to] : rest;
}

export interface DayDragHandlers<T> {
	/** The event at its dragged position while moving, `null` when the drag ends. */
	onPreview: (preview: T | null) => void;
	/** Drag finished: the moved copy, or `null` if it ended on the starting day. */
	onDrop: (moved: T | null) => void;
}

/**
 * Drags `event` across day cells (elements with `data-date`), keeping its time of day and
 * duration. When cells also have `data-resource` (timeline rows), dropping on another row moves
 * the event to that resource. Used by the month, timeline and gantt views and the all-day row.
 */
export function dragAcrossDays<T extends CalendarEvent>(
	down: PointerEvent,
	event: T,
	handlers: DayDragHandlers<T>
) {
	const from = cellAtPoint(down.clientX, down.clientY);
	if (!from) return;
	let moved: T | null = null;

	trackPointer(down, {
		onMove: (move) => {
			const to = cellAtPoint(move.clientX, move.clientY);
			if (!to) return;
			const days = daysBetween(from.date, to.date);
			const sameRow = from.resource === to.resource;
			if (days === 0 && sameRow) moved = null;
			else {
				const shifted = moveEvent(event, event.start.add({ days }));
				moved = sameRow
					? shifted
					: {
							...shifted,
							resourceIds: moveResource(event.resourceIds, from.resource, to.resource)
						};
			}
			handlers.onPreview(moved ?? event);
		},
		onDrop: () => {
			handlers.onPreview(null);
			handlers.onDrop(moved);
		},
		onCancel: () => handlers.onPreview(null)
	});
}

/** `events` with `preview` shown instead of the event with the same id (or added, if new). */
export function withPreview<T extends CalendarEvent>(events: readonly T[], preview: T | null) {
	if (!preview) return events;
	const found = events.some((event) => event.id === preview.id);
	return found
		? events.map((event) => (event.id === preview.id ? preview : event))
		: [...events, preview];
}
