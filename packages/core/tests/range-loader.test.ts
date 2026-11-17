import { describe, expect, it, vi } from 'vitest';
import { CalendarDate } from '@internationalized/date';
import { EventStore, RangeLoader, type CalendarEvent, type DateRange } from '../src/index.js';
import { timed } from './fixtures.js';

const november = { start: new CalendarDate(2026, 11, 1), end: new CalendarDate(2026, 12, 1) };
const flush = () => new Promise((resolve) => setTimeout(resolve));

describe('RangeLoader', () => {
	it('loads whole months once, caches them and adds the events to the store', async () => {
		const store = new EventStore();
		const load = vi.fn(async (range: { start: CalendarDate; end: CalendarDate }) => [
			timed(`event-${range.start}`, `${range.start}T09:00`, `${range.start}T10:00`)
		]);
		const loader = new RangeLoader({ store, load });

		await loader.ensure({
			start: new CalendarDate(2026, 11, 10),
			end: new CalendarDate(2026, 11, 12)
		});
		await loader.ensure(november);

		expect(load).toHaveBeenCalledTimes(1);
		expect(load.mock.calls[0]?.[0].start.toString()).toBe('2026-11-01');
		expect(load.mock.calls[0]?.[0].end.toString()).toBe('2026-12-01');
		expect(store.events.map((event) => event.id)).toEqual(['event-2026-11-01']);
		expect(store.canUndo).toBe(false);
	});

	it('requests each missing month of a range that spans several', async () => {
		const load = vi.fn(async (_range: DateRange): Promise<CalendarEvent[]> => []);
		const loader = new RangeLoader({ store: new EventStore(), load });

		await loader.ensure({
			start: new CalendarDate(2026, 10, 26),
			end: new CalendarDate(2026, 12, 6)
		});

		expect(load.mock.calls.map(([range]) => range.start.toString())).toEqual([
			'2026-10-01',
			'2026-11-01',
			'2026-12-01'
		]);
	});

	it('shares an in-flight request and preloads neighbouring months', async () => {
		const load = vi.fn(async (_range: DateRange): Promise<CalendarEvent[]> => []);
		const loader = new RangeLoader({ store: new EventStore(), load, preload: 1 });

		await Promise.all([loader.ensure(november), loader.ensure(november)]);
		await flush();

		expect(load.mock.calls.map(([range]) => range.start.toString()).sort()).toEqual([
			'2026-10-01',
			'2026-11-01',
			'2026-12-01'
		]);
	});

	it('does not duplicate events that are already in the store', async () => {
		const store = new EventStore({
			events: [timed('same', '2026-11-03T09:00', '2026-11-03T10:00')]
		});
		const load = async () => [
			{ ...timed('same', '2026-11-03T09:00', '2026-11-03T10:00'), title: 'Server' }
		];
		await new RangeLoader({ store, load }).ensure(november);

		expect(store.events.map((event) => event.title)).toEqual(['Server']);
	});

	it('forgets a failed month so it is requested again, and reports the error', async () => {
		const onError = vi.fn();
		const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
		const loader = new RangeLoader({ store: new EventStore(), load, onError });

		await loader.ensure(november);
		await loader.ensure(november);

		expect(onError).toHaveBeenCalledOnce();
		expect(load).toHaveBeenCalledTimes(2);
	});

	it('reports whether it is loading', async () => {
		let release!: () => void;
		const loader = new RangeLoader({
			store: new EventStore(),
			load: () => new Promise<CalendarEvent[]>((resolve) => (release = () => resolve([])))
		});

		const pending = loader.ensure(november);
		expect(loader.loading).toBe(true);
		release();
		await pending;
		expect(loader.loading).toBe(false);
	});
});
