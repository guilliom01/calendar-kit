import { moveEvent, resizeEvent, type CalendarEvent } from '@calendar-kit/core';
import { fillLabel, type CalendarState } from './calendar-state.svelte.js';

/** Arrow pressed in move mode, already mirrored for right-to-left pages. */
export interface MoveStep {
	/** -1 earlier, 1 later (left/right on the page, start/end in reading order). */
	horizontal: -1 | 0 | 1;
	/** -1 up, 1 down. */
	vertical: -1 | 0 | 1;
	/** Shift held: change the length instead of moving. */
	resize: boolean;
}

/** Computes the event after one arrow press, or null when that arrow does nothing in this view. */
export type MoveStepper<T extends CalendarEvent> = (current: T, step: MoveStep) => T | null;

/**
 * Keyboard move mode for a focused event: arrows move a preview (announced to screen readers),
 * Shift+arrows change its length, Enter saves through `changeEvent` (hooks and scope questions
 * included, no confirmation dialog) and Escape cancels. Focus returns to the event afterwards.
 */
export function keyboardMove<T extends CalendarEvent>(
	calendar: CalendarState<T>,
	event: T,
	element: HTMLElement,
	stepper: MoveStepper<T>,
	onPreview: (preview: T | null) => void
) {
	const rtl = getComputedStyle(element).direction === 'rtl';
	let current = event;
	let resized = false;
	let moved = false;
	calendar.announce(
		fillLabel(calendar.labels.moveMode, { title: event.title || calendar.labels.untitled })
	);

	const finish = (save: boolean) => {
		window.removeEventListener('keydown', onKey, { capture: true });
		onPreview(null);
		if (save && current !== event) {
			void calendar.changeEvent(
				{ event: current, previous: event, kind: resized && !moved ? 'resize' : 'move' },
				{ confirmed: true }
			);
		} else if (!save) calendar.announce(calendar.labels.moveCancelled);
		// The event may have been redrawn elsewhere (another day column); focus it again there.
		requestAnimationFrame(() =>
			document.querySelector<HTMLElement>(`[data-event-id="${CSS.escape(event.id)}"]`)?.focus()
		);
	};

	const onKey = (key: KeyboardEvent) => {
		const arrows: Record<string, [MoveStep['horizontal'], MoveStep['vertical']]> = {
			ArrowLeft: [rtl ? 1 : -1, 0],
			ArrowRight: [rtl ? -1 : 1, 0],
			ArrowUp: [0, -1],
			ArrowDown: [0, 1]
		};
		if (key.key === 'Enter' || key.key === 'Escape') {
			key.preventDefault();
			key.stopPropagation();
			finish(key.key === 'Enter');
			return;
		}
		const arrow = arrows[key.key];
		if (!arrow) return;
		key.preventDefault();
		key.stopPropagation();
		const next = stepper(current, {
			horizontal: arrow[0],
			vertical: arrow[1],
			resize: key.shiftKey
		});
		if (!next) return;
		if (key.shiftKey) resized = true;
		else moved = true;
		current = next;
		onPreview(next);
		calendar.announce(calendar.describe(next));
	};

	window.addEventListener('keydown', onKey, { capture: true });
}

/**
 * Steps for day-based views: left/right one day, up/down `verticalDays` days (a week in the month
 * view; omit it where up/down mean something else), Shift+left/right one day shorter or longer.
 */
export function dayStepper<T extends CalendarEvent>(verticalDays?: number): MoveStepper<T> {
	return (current, { horizontal, vertical, resize }) => {
		if (resize) {
			return horizontal ? resizeEvent(current, current.end.add({ days: horizontal })) : null;
		}
		const days = horizontal || (verticalDays && vertical ? vertical * verticalDays : 0);
		return days ? moveEvent(current, current.start.add({ days })) : null;
	};
}
