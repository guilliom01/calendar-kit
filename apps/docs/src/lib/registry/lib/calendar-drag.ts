import { parseDate, type CalendarDate } from "@internationalized/date";
import {
  daysBetween,
  moveEvent,
  resizeEvent,
  resizeEventStart,
  snapMinutes,
  zonedAt,
  type CalendarEvent,
} from "@calendar-kit/core";
import type { Attachment } from "svelte/attachments";
import type { CalendarState, ExternalItem, ResizeHandles } from "./calendar-state.svelte.js";

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
  /** Whether resting near an edge here may auto-scroll (e.g. not over a drop zone outside it). */
  canScroll?: (event: PointerEvent) => boolean;
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
  window.addEventListener("click", swallow, { capture: true, once: true });
  // No click follows when the pointer was released over another element.
  setTimeout(() => window.removeEventListener("click", swallow, { capture: true }));
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
function autoScroll(
  element: Element | null,
  pointer: () => PointerEvent,
  onScroll: () => void,
  canScroll: (event: PointerEvent) => boolean = () => true,
) {
  const parents = scrollParents(element);
  // When the pointer entered an edge zone; undefined while it is away from every edge.
  let since: number | undefined;
  let frame = requestAnimationFrame(function step(now) {
    const { clientX, clientY } = pointer();
    const allowed = canScroll(pointer());
    const steps = parents.map((parent) => {
      const rect = parent.getBoundingClientRect();
      return [edgeSpeed(clientX, rect.left, rect.right), edgeSpeed(clientY, rect.top, rect.bottom)];
    });
    if (!allowed || !steps.some(([left, top]) => left || top)) since = undefined;
    else if (since === undefined) since = now;
    else if (now - since >= SCROLL_DELAY) {
      for (const [index, parent] of parents.entries()) {
        const { scrollLeft, scrollTop } = parent;
        const [left, top] = steps[index]!;
        parent.scrollBy({ left, top, behavior: "instant" });
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
  touch: TouchDrag = 400,
) {
  if (down.button !== 0) return;
  const isTouch = down.pointerType === "touch";
  let lifted = !isTouch;
  let dragging = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopScrolling: (() => void) | undefined;

  if (isTouch && touch !== false) {
    timer = setTimeout(() => {
      lifted = true;
      // Non-passive, so it can stop the page from scrolling while dragging.
      window.addEventListener("touchmove", preventDefault, { passive: false });
      window.addEventListener("contextmenu", preventDefault);
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
        () => handlers.onMove(last),
        handlers.canScroll,
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
    if (event.key === "Escape") cancel();
  };
  const stop = () => {
    clearTimeout(timer);
    stopScrolling?.();
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", cancel);
    window.removeEventListener("keydown", key);
    window.removeEventListener("touchmove", preventDefault);
    window.removeEventListener("contextmenu", preventDefault);
  };

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", cancel);
  window.addEventListener("keydown", key);
}

/**
 * The cell under the pointer: the nearest element with a `data-date` attribute, and its
 * `data-resource` (empty or missing when the row has no resource).
 */
export function cellAtPoint(
  x: number,
  y: number,
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
  touch: TouchDrag = 400,
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
                resourceIds: moveResource(event.resourceIds, from.resource, to.resource),
              };
        }
        handlers.onPreview(moved ?? event);
      },
      onDrop: () => {
        handlers.onPreview(null);
        handlers.onDrop(moved);
      },
      onCancel: () => handlers.onPreview(null),
      onLift: () => handlers.onPreview(event),
    },
    touch,
  );
}

/**
 * Resizes `event` by whole days from its `edge`, following the day cells (`data-date`) under the
 * pointer. Timed events keep their times of day.
 */
export function resizeAcrossDays<T extends CalendarEvent>(
  down: PointerEvent,
  event: T,
  edge: "start" | "end",
  handlers: DayDragHandlers<T>,
  touch: TouchDrag = 400,
) {
  const from = cellAtPoint(down.clientX, down.clientY);
  if (!from) return;
  let resized: T | null = null;

  trackPointer(
    down,
    {
      onMove: (move) => {
        const to = cellAtPoint(move.clientX, move.clientY);
        if (!to) return;
        const days = daysBetween(from.date, to.date);
        resized = !days
          ? null
          : edge === "start"
            ? resizeEventStart(event, event.start.add({ days }))
            : resizeEvent(event, event.end.add({ days }));
        handlers.onPreview(resized ?? event);
      },
      onDrop: () => {
        handlers.onPreview(null);
        handlers.onDrop(resized);
      },
      onCancel: () => handlers.onPreview(null),
      onLift: () => handlers.onPreview(event),
    },
    touch,
  );
}

/**
 * Start and end handles of a bar that spans days (month, timeline, gantt, all-day row). Edges
 * that continue outside the shown range, or events the user may not resize, get no handle.
 */
export function barResizeHandles<T extends CalendarEvent>(
  calendar: CalendarState<T>,
  event: T,
  edges: { continuesBefore: boolean; continuesAfter: boolean },
  onPreview: (preview: T | null) => void,
): ResizeHandles {
  if (!calendar.canEdit(event, "resize")) return {};
  const handle = (edge: "start" | "end") => ({
    "aria-hidden": "true",
    class: `absolute inset-y-0 ${edge === "start" ? "start-0" : "end-0"} w-1.5 cursor-ew-resize`,
    onpointerdown: (down: PointerEvent) => {
      down.stopPropagation(); // not a move of the whole bar
      resizeAcrossDays(
        down,
        event,
        edge,
        {
          onPreview,
          onDrop: (resized) => {
            if (resized)
              void calendar.changeEvent({ event: resized, previous: event, kind: "resize" });
          },
        },
        touchOf(calendar),
      );
    },
  });
  return {
    start: edges.continuesBefore ? undefined : handle("start"),
    end: edges.continuesAfter ? undefined : handle("end"),
  };
}

/** `events` with `preview` shown instead of the event with the same id (or added, if new). */
export function withPreview<T extends CalendarEvent>(events: readonly T[], preview: T | null) {
  if (!preview) return events;
  const found = events.some((event) => event.id === preview.id);
  return found
    ? events.map((event) => (event.id === preview.id ? preview : event))
    : [...events, preview];
}

const MINUTES_PER_DAY = 24 * 60;

/**
 * Where a drop at (x, y) lands: a time-grid column (`data-time-column`, with the minute under the
 * pointer) or a day cell (`data-date`), with the `data-resource` of either.
 */
function dropTargetAt(x: number, y: number, step: number) {
  for (const element of document.elementsFromPoint(x, y)) {
    const { timeColumn, date, resource } = (element as HTMLElement).dataset ?? {};
    if (timeColumn) {
      const rect = element.getBoundingClientRect();
      const minutes = snapMinutes(((y - rect.top) / rect.height) * MINUTES_PER_DAY, step);
      return { date: parseDate(timeColumn), minutes, resource: resource || undefined };
    }
    if (date) return { date: parseDate(date), minutes: undefined, resource: resource || undefined };
  }
  return undefined;
}

/**
 * Makes any element of yours draggable onto the views: `<li {@attach draggable(calendar, item)}>`.
 * Dropped on the hours it becomes a timed event lasting `item.duration` (or `defaultDuration`);
 * dropped on a day it becomes an all-day event. `onExternalDrop` decides what is created.
 * There is no keyboard path: offer one of your own (e.g. a "Schedule" button).
 */
export function draggable<T extends CalendarEvent>(
  calendar: CalendarState<T>,
  item: ExternalItem,
): Attachment<HTMLElement> {
  return (node) => {
    const down = (pointer: PointerEvent) => {
      let ghost: HTMLElement | undefined;
      trackPointer(
        pointer,
        {
          onMove: (move) => {
            if (!ghost) {
              // A label that follows the pointer; pointer-events-none keeps it out of hit tests.
              ghost = document.createElement("div");
              ghost.textContent = item.title;
              ghost.className =
                "pointer-events-none fixed top-0 left-0 z-50 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground shadow-lg";
              document.body.append(ghost);
            }
            ghost.style.translate = `${move.clientX + 8}px ${move.clientY + 8}px`;
          },
          onDrop: (up) => {
            ghost?.remove();
            const target = dropTargetAt(up.clientX, up.clientY, calendar.snapStep);
            if (!target) return;
            const resourceIds = target.resource ? [target.resource] : undefined;
            if (target.minutes === undefined) {
              const start = target.date;
              void calendar.dropExternal({
                item,
                start,
                end: start.add({ days: 1 }),
                allDay: true,
                resourceIds,
              });
            } else {
              const start = zonedAt(target.date, target.minutes, calendar.timeZone);
              const end = start.add({ minutes: item.duration ?? calendar.defaultDuration });
              void calendar.dropExternal({ item, start, end, allDay: false, resourceIds });
            }
          },
          onCancel: () => ghost?.remove(),
        },
        touchOf(calendar),
      );
    };
    node.addEventListener("pointerdown", down);
    return () => node.removeEventListener("pointerdown", down);
  };
}
