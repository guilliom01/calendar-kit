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
		if (dragging) handlers.onDrop(event);
		else handlers.onClick?.(event);
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

/** The day under the pointer, read from the nearest element with a `data-date` attribute. */
export function dayAtPoint(x: number, y: number): CalendarDate | undefined {
	for (const element of document.elementsFromPoint(x, y)) {
		const date = (element as HTMLElement).dataset?.date;
		if (date) return parseDate(date);
	}
	return undefined;
}

export interface DayDragHandlers<T> {
	/** The event at its dragged position while moving, `null` when the drag ends. */
	onPreview: (preview: T | null) => void;
	/** Drag finished: the moved copy, or `null` if it ended on the starting day. */
	onDrop: (moved: T | null) => void;
}

/**
 * Drags `event` across day cells (elements with `data-date`), keeping its time of day and
 * duration. Used by the month view and the all-day row of the time grid.
 */
export function dragAcrossDays<T extends CalendarEvent>(
	down: PointerEvent,
	event: T,
	handlers: DayDragHandlers<T>
) {
	const from = dayAtPoint(down.clientX, down.clientY);
	if (!from) return;
	let moved: T | null = null;

	trackPointer(down, {
		onMove: (move) => {
			const to = dayAtPoint(move.clientX, move.clientY);
			if (!to) return;
			const days = daysBetween(from, to);
			moved = days === 0 ? null : moveEvent(event, event.start.add({ days }));
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
