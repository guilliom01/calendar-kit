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
	/** Escape pressed, the browser cancelled the pointer, or a touch turned into scrolling. */
	onCancel?: () => void;
	/** A touch rested long enough: the item is lifted and can be dragged. */
	onLift?: () => void;
}

/** Long-press delay for touch, or false when touch should never drag. */
export type TouchDrag = number | false;

/** The touch setting of a calendar state, for `trackPointer` and `dragAcrossDays`. */
export const touchOf = (calendar: { touchDrag: boolean; touchDragDelay: number }): TouchDrag =>
	calendar.touchDrag ? calendar.touchDragDelay : false;

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

const preventDefault = (event: Event) => event.preventDefault();

/** Distance from a scroll container's edge, in pixels, where a drag starts scrolling it. */
const SCROLL_EDGE = 48;
/** Auto-scroll speed at the very edge (or beyond it), in pixels per frame. */
const SCROLL_SPEED = 16;
/** Milliseconds the pointer must rest near an edge before scrolling, so drops near it stay put. */
const SCROLL_DELAY = 250;

/** Scrollable ancestors of `element`, innermost first. */
function scrollParents(element: Element | null) {
	const parents: HTMLElement[] = [];
	for (let node = element?.parentElement; node; node = node.parentElement) {
		const { overflowX, overflowY } = getComputedStyle(node);
		if (/auto|scroll/.test(overflowX + overflowY)) parents.push(node);
	}
	return parents;
}

/** Scroll step along one axis: negative near the start edge, positive near the end edge. */
function edgeSpeed(position: number, start: number, end: number) {
	const edge = Math.min(SCROLL_EDGE, (end - start) / 4);
	const depth =
		position < start + edge
			? -(start + edge - position)
			: position > end - edge
				? position - (end - edge)
				: 0;
	return Math.sign(depth) * SCROLL_SPEED * Math.min(1, Math.abs(depth) / edge);
}

/**
 * While the pointer rests near the edge of a scroll container around `element` (for
 * `SCROLL_DELAY` ms), scrolls the
 * innermost one that can still move and calls `onScroll`, so the drag preview follows the content.
 * Returns the function that stops it.
 */
function autoScroll(element: Element | null, pointer: () => PointerEvent, onScroll: () => void) {
	const parents = scrollParents(element);
	// When the pointer entered an edge zone; undefined while it is away from every edge.
	let since: number | undefined;
	let frame = requestAnimationFrame(function step(now) {
		const { clientX, clientY } = pointer();
		const steps = parents.map((parent) => {
			const rect = parent.getBoundingClientRect();
			return [edgeSpeed(clientX, rect.left, rect.right), edgeSpeed(clientY, rect.top, rect.bottom)];
		});
		if (!steps.some(([left, top]) => left || top)) since = undefined;
		else if (since === undefined) since = now;
		else if (now - since >= SCROLL_DELAY) {
			for (const [index, parent] of parents.entries()) {
				const { scrollLeft, scrollTop } = parent;
				const [left, top] = steps[index]!;
				parent.scrollBy({ left, top, behavior: 'instant' });
				if (parent.scrollLeft !== scrollLeft || parent.scrollTop !== scrollTop) {
					onScroll();
					break;
				}
			}
		}
		frame = requestAnimationFrame(step);
	});
	return () => cancelAnimationFrame(frame);
}

/**
 * Follows a primary-button press until it is released or cancelled.
 *
 * Mouse and pen drag at once. A finger must rest for `touch` milliseconds first: moving earlier
 * is a scroll, so tracking stops and the page scrolls normally. Once lifted, page scrolling and
 * the long-press menu are blocked until the finger is released. `touch = false` never drags.
 * Near the edge of a scroll container, the container scrolls and `onMove` runs again.
 */
export function trackPointer(
	down: PointerEvent,
	handlers: PointerTracking,
	touch: TouchDrag = 400
) {
	if (down.button !== 0) return;
	const isTouch = down.pointerType === 'touch';
	let lifted = !isTouch;
	let dragging = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let stopScrolling: (() => void) | undefined;

	if (isTouch && touch !== false) {
		timer = setTimeout(() => {
			lifted = true;
			// Non-passive, so it can stop the page from scrolling while dragging.
			window.addEventListener('touchmove', preventDefault, { passive: false });
			window.addEventListener('contextmenu', preventDefault);
			navigator.vibrate?.(10);
			handlers.onLift?.();
		}, touch);
	}

	let last = down;
	const move = (event: PointerEvent) => {
		const distance = Math.hypot(event.clientX - down.clientX, event.clientY - down.clientY);
		if (!dragging && distance < DRAG_THRESHOLD) return;
		if (!lifted) return cancel(); // a touch that moved too soon is a scroll
		last = event;
		if (!dragging) {
			dragging = true;
			stopScrolling = autoScroll(
				down.target as Element,
				() => last,
				() => handlers.onMove(last)
			);
		}
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
		clearTimeout(timer);
		stopScrolling?.();
		window.removeEventListener('pointermove', move);
		window.removeEventListener('pointerup', up);
		window.removeEventListener('pointercancel', cancel);
		window.removeEventListener('keydown', key);
		window.removeEventListener('touchmove', preventDefault);
		window.removeEventListener('contextmenu', preventDefault);
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
	handlers: DayDragHandlers<T>,
	touch: TouchDrag = 400
) {
	const from = cellAtPoint(down.clientX, down.clientY);
	if (!from) return;
	let moved: T | null = null;

	trackPointer(
		down,
		{
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
			onCancel: () => handlers.onPreview(null),
			onLift: () => handlers.onPreview(event)
		},
		touch
	);
}

/** `events` with `preview` shown instead of the event with the same id (or added, if new). */
export function withPreview<T extends CalendarEvent>(events: readonly T[], preview: T | null) {
	if (!preview) return events;
	const found = events.some((event) => event.id === preview.id);
	return found
		? events.map((event) => (event.id === preview.id ? preview : event))
		: [...events, preview];
}
