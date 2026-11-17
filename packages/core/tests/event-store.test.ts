import { describe, expect, it, vi } from 'vitest';
import { EventStore, type CalendarEvent, type Mutation } from '../src/index.js';
import { timed } from './fixtures.js';

const ids = (store: EventStore) => store.events.map((event) => event.id);
const titles = (store: EventStore) => store.events.map((event) => event.title);
const meeting = () => timed('meeting', '2026-11-18T09:00', '2026-11-18T10:00');

/** A promise you resolve or reject from the test. */
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
	return { promise, resolve, reject };
}

describe('EventStore', () => {
	it('creates, updates and removes events, notifying subscribers', async () => {
		const store = new EventStore();
		const seen: string[][] = [];
		store.subscribe((events) => seen.push(events.map((event) => event.id)));

		await store.create(meeting());
		await store.update({ ...meeting(), title: 'Renamed' });
		expect(titles(store)).toEqual(['Renamed']);
		await store.remove('meeting');

		expect(ids(store)).toEqual([]);
		// Called immediately on subscribe, then once per change.
		expect(seen).toEqual([[], ['meeting'], ['meeting'], []]);
	});

	it('applies changes before onMutate resolves (optimistic)', async () => {
		const save = deferred<void>();
		const store = new EventStore({ onMutate: () => save.promise });

		const pending = store.create(meeting());
		expect(ids(store)).toEqual(['meeting']);

		save.resolve();
		await expect(pending).resolves.toMatchObject({ id: 'meeting' });
	});

	it('rolls back, reports the error and forgets the change when onMutate throws', async () => {
		const onError = vi.fn();
		const store = new EventStore({
			events: [meeting()],
			onMutate: () => Promise.reject(new Error('offline')),
			onError
		});

		const result = await store.update({ ...meeting(), title: 'Renamed' });

		expect(result).toBeUndefined();
		expect(titles(store)).toEqual(['meeting']);
		expect(onError).toHaveBeenCalledWith(
			expect.objectContaining({ message: 'offline' }),
			expect.objectContaining({ type: 'update' })
		);
		expect(store.canUndo).toBe(false);
	});

	it('restores a deleted event and removes a created one when saving fails', async () => {
		const store = new EventStore({
			events: [meeting()],
			onMutate: () => {
				throw new Error('nope');
			},
			onError: () => {}
		});

		await store.remove('meeting');
		await store.create(timed('other', '2026-11-18T11:00', '2026-11-18T12:00'));

		expect(ids(store)).toEqual(['meeting']);
	});

	it('replaces the local event with the saved one (for example, a server id)', async () => {
		const store = new EventStore({
			onMutate: (mutation: Mutation<CalendarEvent>) =>
				mutation.type === 'create' ? { ...mutation.event, id: 'server-1' } : undefined
		});

		const saved = await store.create(meeting());

		expect(saved?.id).toBe('server-1');
		expect(ids(store)).toEqual(['server-1']);

		// Undo must delete the server id, not the temporary one.
		await store.undo();
		expect(ids(store)).toEqual([]);
	});

	it('undoes and redoes, and a new change clears redo', async () => {
		const store = new EventStore({ events: [meeting()] });

		await store.update({ ...meeting(), title: 'v2' });
		await store.update({ ...meeting(), title: 'v3' });
		await store.undo();
		expect(titles(store)).toEqual(['v2']);
		await store.undo();
		expect(titles(store)).toEqual(['meeting']);
		expect(store.canUndo).toBe(false);

		await store.redo();
		expect(titles(store)).toEqual(['v2']);
		expect(store.canRedo).toBe(true);

		await store.update({ ...meeting(), title: 'v4' });
		expect(store.canRedo).toBe(false);
	});

	it('sends undo to onMutate as the inverse change, so the backend stays in sync', async () => {
		const onMutate = vi.fn();
		const store = new EventStore({ onMutate });

		await store.create(meeting());
		await store.undo();

		expect(onMutate.mock.calls.map(([mutation]) => mutation.type)).toEqual(['create', 'delete']);
	});

	it('saves changes to the same event in order', async () => {
		const first = deferred<void>();
		const calls: string[] = [];
		const store = new EventStore({
			events: [meeting()],
			onMutate: async (mutation: Mutation<CalendarEvent>) => {
				const title = mutation.type === 'update' ? mutation.after.title : '';
				calls.push(`start ${title}`);
				if (title === 'v1') await first.promise;
				calls.push(`end ${title}`);
			}
		});

		const a = store.update({ ...meeting(), title: 'v1' });
		const b = store.update({ ...meeting(), title: 'v2' });
		first.resolve();
		await Promise.all([a, b]);

		expect(calls).toEqual(['start v1', 'end v1', 'start v2', 'end v2']);
		expect(titles(store)).toEqual(['v2']);
	});

	it('applies several changes as one undo step', async () => {
		const onMutate = vi.fn();
		const store = new EventStore({ events: [meeting()], onMutate });
		const other = timed('other', '2026-11-18T11:00', '2026-11-18T12:00');

		await store.batch([
			{ type: 'update', before: meeting(), after: { ...meeting(), title: 'Renamed' } },
			{ type: 'create', event: other }
		]);
		expect(titles(store)).toEqual(['Renamed', 'other']);
		expect(onMutate).toHaveBeenCalledTimes(2);

		await store.undo();
		expect(titles(store)).toEqual(['meeting']);
		expect(store.canUndo).toBe(false);

		await store.redo();
		expect(titles(store)).toEqual(['Renamed', 'other']);
	});

	it('keeps the parts of a batch that saved when another part fails', async () => {
		const store = new EventStore({
			events: [meeting()],
			onMutate: (mutation: Mutation<CalendarEvent>) => {
				if (mutation.type === 'create') throw new Error('nope');
			},
			onError: () => {}
		});

		await store.batch([
			{ type: 'update', before: meeting(), after: { ...meeting(), title: 'Renamed' } },
			{ type: 'create', event: timed('other', '2026-11-18T11:00', '2026-11-18T12:00') }
		]);
		expect(titles(store)).toEqual(['Renamed']);

		await store.undo();
		expect(titles(store)).toEqual(['meeting']);
	});

	it('ignores updates and removals of unknown events', async () => {
		const onMutate = vi.fn();
		const store = new EventStore({ onMutate });

		expect(await store.update(meeting())).toBeUndefined();
		await store.remove('missing');
		expect(onMutate).not.toHaveBeenCalled();
	});
});
