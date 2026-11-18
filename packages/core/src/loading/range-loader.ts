import { startOfMonth, type CalendarDate } from "@internationalized/date";
import type { CalendarEvent } from "../events/types.js";
import type { EventStore } from "../store/event-store.js";
import type { DateRange } from "../time/view.js";

export interface RangeLoaderOptions<T extends CalendarEvent> {
  store: EventStore<T>;
  /** Fetches the events of a range (always one whole month; `end` exclusive). */
  load(range: DateRange): Promise<readonly T[]>;
  /** Months to fetch ahead on each side of what is shown, so navigation feels instant. */
  preload?: number | undefined;
  onError?(error: unknown, range: DateRange): void;
  onLoadingChange?(loading: boolean): void;
}

/**
 * Loads events on demand, one month at a time. Each month is requested once (in-flight requests
 * are shared) and its events are merged into the store without touching the undo history.
 * A month that fails is forgotten, so the next `ensure` requests it again.
 */
export class RangeLoader<T extends CalendarEvent = CalendarEvent> {
  #months = new Map<string, Promise<void>>();
  #pending = 0;
  #options: RangeLoaderOptions<T>;

  constructor(options: RangeLoaderOptions<T>) {
    this.#options = options;
  }

  get loading(): boolean {
    return this.#pending > 0;
  }

  /** Makes sure every month that `range` touches is loaded (and preloads its neighbours). */
  async ensure(range: DateRange): Promise<void> {
    const first = startOfMonth(range.start);
    const last = startOfMonth(range.end.subtract({ days: 1 }));
    const months: CalendarDate[] = [];
    for (let month = first; month.compare(last) <= 0; month = month.add({ months: 1 })) {
      months.push(month);
    }

    const shown = Promise.all(months.map((month) => this.#month(month)));
    for (let offset = 1; offset <= (this.#options.preload ?? 0); offset++) {
      void this.#month(first.subtract({ months: offset }));
      void this.#month(last.add({ months: offset }));
    }
    await shown;
  }

  /** Forgets what was loaded, e.g. after the data changed on the server. */
  clear() {
    this.#months.clear();
  }

  #month(start: CalendarDate): Promise<void> {
    const key = start.toString();
    const existing = this.#months.get(key);
    if (existing) return existing;

    const range = { start, end: start.add({ months: 1 }) };
    this.#setPending(1);
    const request = this.#options
      .load(range)
      .then((events) => this.#options.store.merge(events))
      .catch((error: unknown) => {
        this.#months.delete(key);
        this.#options.onError?.(error, range);
      })
      .finally(() => this.#setPending(-1));
    this.#months.set(key, request);
    return request;
  }

  #setPending(delta: number) {
    const before = this.loading;
    this.#pending += delta;
    if (before !== this.loading) this.#options.onLoadingChange?.(this.loading);
  }
}
