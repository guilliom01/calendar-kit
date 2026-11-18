import type { CalendarEvent } from '../events/types.js';

/** A change to the event list, as sent to `onMutate`. */
export type Mutation<T extends CalendarEvent = CalendarEvent> =
	| { type: 'create'; event: T }
	| { type: 'update'; before: T; after: T }
	| { type: 'delete'; event: T };

export interface EventStoreOptions<T extends CalendarEvent> {
	events?: readonly T[] | undefined;
	/**
	 * Persists a change (e.g. calls your API). It runs after the change is already visible.
	 * Return the saved event to replace the local one (for example, with a server id).
	 * Throw or reject to roll the change back.
	 */
	onMutate?(mutation: Mutation<T>): Promise<T | void> | T | void;
	/** Called when `onMutate` fails, after the rollback. */
	onError?(error: unknown, mutation: Mutation<T>): void;
	/**
	 * Called when `onMutate` threw a `ConflictError`, after the server's version (`current`, or
	 * null when it was deleted) replaced the local one. Tell the user here.
	 */
	onConflict?(mutation: Mutation<T>, current: T | null): void;
	/** Undo steps to keep. */
	historyLimit?: number | undefined;
}

type Listener<T> = (events: readonly T[]) => void;
/** One undo step: the changes made together, in order. */
type Entry<T extends CalendarEvent> = Mutation<T>[];

const invert = <T extends CalendarEvent>(mutation: Mutation<T>): Mutation<T> =>
	mutation.type === 'create'
		? { type: 'delete', event: mutation.event }
		: mutation.type === 'delete'
			? { type: 'create', event: mutation.event }
			: { type: 'update', before: mutation.after, after: mutation.before };

const targetId = (mutation: Mutation) =>
	mutation.type === 'update' ? mutation.after.id : mutation.event.id;

/**
 * Event list with optimistic saving and undo/redo. Framework-agnostic: `subscribe` follows the
 * Svelte store contract (it calls the listener right away), so it also works as a readable store.
 *
 * Changes are applied locally first, then sent to `onMutate`. Changes to the same event are sent
 * in order. If saving fails, the change is rolled back unless a later change already replaced it.
 */
/**
 * Throw it from `onMutate` when the server has a newer version of the event: `current`, or null
 * when it was deleted. The store shows that version instead of rolling back to the stale one.
 */
export class ConflictError<T extends CalendarEvent = CalendarEvent> extends Error {
	constructor(readonly current: T | null) {
		super('The event changed on the server');
		this.name = 'ConflictError';
	}
}

export class EventStore<T extends CalendarEvent = CalendarEvent> {
	#events: T[];
	#listeners = new Set<Listener<T>>();
	/** Events whose save hit a conflict; their later queued changes are not sent. */
	#conflicted = new Set<string>();
	#past: Entry<T>[] = [];
	#future: Entry<T>[] = [];
	#queues = new Map<string, Promise<unknown>>();
	#options: EventStoreOptions<T>;

	constructor(options: EventStoreOptions<T> = {}) {
		this.#options = options;
		this.#events = [...(options.events ?? [])];
	}

	get events(): readonly T[] {
		return this.#events;
	}

	get canUndo(): boolean {
		return this.#past.length > 0;
	}

	get canRedo(): boolean {
		return this.#future.length > 0;
	}

	subscribe(listener: Listener<T>): () => void {
		this.#listeners.add(listener);
		listener(this.#events);
		return () => this.#listeners.delete(listener);
	}

	/** Adds an event. Resolves with the saved event, or `undefined` if saving failed. */
	async create(event: T): Promise<T | undefined> {
		return (await this.#record([{ type: 'create', event }]))[0];
	}

	/** Replaces the event with the same id. Resolves with the saved event, or `undefined`. */
	async update(event: T): Promise<T | undefined> {
		const before = this.#find(event.id);
		if (!before) return undefined;
		return (await this.#record([{ type: 'update', before, after: event }]))[0];
	}

	async remove(id: string): Promise<void> {
		const event = this.#find(id);
		if (event) await this.#record([{ type: 'delete', event }]);
	}

	/**
	 * Adds or replaces events that came from your backend (for example, a loaded month).
	 * It is not a user change: it skips `onMutate` and the undo history. Events with a save on its
	 * way keep their local copy: the version `onMutate` returns replaces it when the save ends (if it
	 * returns nothing, the local copy stays until the next reload).
	 */
	merge(events: readonly T[]) {
		const incoming = new Map(
			events.filter((event) => !this.#queues.has(event.id)).map((event) => [event.id, event])
		);
		if (incoming.size === 0) return;
		const updated = this.#events.map((event) => {
			const replacement = incoming.get(event.id);
			incoming.delete(event.id);
			return replacement ?? event;
		});
		this.#events = [...updated, ...incoming.values()];
		this.#notify();
	}

	/**
	 * Applies several changes as one undo step (e.g. ending a series and starting a new one).
	 * Each change is still sent to `onMutate` on its own; the ones that fail are rolled back.
	 * Resolves with the saved event of each change (`undefined` for deletes and failures).
	 */
	batch(mutations: Mutation<T>[]): Promise<(T | undefined)[]> {
		return this.#record([...mutations]);
	}

	async undo(): Promise<void> {
		const entry = this.#past.pop();
		if (!entry) return;
		this.#future.push(entry);
		const results = await Promise.all(
			entry.toReversed().map((mutation) => this.#run(invert(mutation), mutation))
		);
		if (results.includes(false)) this.#move(entry, this.#future, this.#past);
	}

	async redo(): Promise<void> {
		const entry = this.#future.pop();
		if (!entry) return;
		this.#past.push(entry);
		const results = await Promise.all(entry.map((mutation) => this.#run(mutation, mutation)));
		if (results.includes(false)) this.#move(entry, this.#past, this.#future);
	}

	#find(id: string) {
		return this.#events.find((event) => event.id === id);
	}

	/** Runs new user changes and adds them to the undo history as one step. */
	async #record(entry: Entry<T>): Promise<(T | undefined)[]> {
		if (entry.length === 0) return [];
		this.#past.push(entry);
		this.#future = [];
		const limit = this.#options.historyLimit ?? 100;
		if (this.#past.length > limit) this.#past.shift();

		const saved: (T | undefined)[] = [];
		const results = await Promise.all(
			entry.map((mutation, index) =>
				this.#run(mutation, mutation, (event) => (saved[index] = event))
			)
		);
		// Forget the changes that were rolled back; drop the step if none is left.
		const kept = entry.filter((_, index) => results[index]);
		entry.splice(0, entry.length, ...kept);
		if (entry.length === 0) this.#removeEntry(entry, this.#past);
		return results.map((ok, index) => (ok ? saved[index] : undefined));
	}

	/**
	 * Applies `mutation` locally, then saves it after earlier saves of the same event.
	 * `original` is the mutation as stored in the history, fixed up when the backend assigns a new id.
	 */
	#run(
		mutation: Mutation<T>,
		original: Mutation<T>,
		onSaved?: (event: T | undefined) => void
	): Promise<boolean> {
		this.#apply(mutation);
		const id = targetId(mutation);
		const previous = this.#queues.get(id) ?? Promise.resolve();

		const task = previous.then(async () => {
			// Built on the copy the server rejected: sending it would overwrite their version.
			if (this.#conflicted.has(id)) return false;
			try {
				const saved = (await this.#options.onMutate?.(mutation)) ?? undefined;
				const local = mutation.type === 'update' ? mutation.after : mutation.event;
				if (saved && mutation.type !== 'delete') this.#replace(local, saved, original);
				onSaved?.(mutation.type === 'delete' ? undefined : (saved ?? local));
				return true;
			} catch (error) {
				if (error instanceof ConflictError) {
					this.#conflicted.add(id);
					this.#takeServer(id, error.current as T | null);
					this.#options.onConflict?.(mutation, error.current as T | null);
				} else {
					this.#rollback(mutation);
					this.#options.onError?.(error, mutation);
				}
				return false;
			}
		});

		this.#queues.set(id, task);
		void task.finally(() => {
			if (this.#queues.get(id) !== task) return;
			this.#queues.delete(id);
			this.#conflicted.delete(id); // the queue is empty: new changes start from the server's version
		});
		return task;
	}

	#apply(mutation: Mutation<T>) {
		if (mutation.type === 'create') this.#events = [...this.#events, mutation.event];
		else if (mutation.type === 'delete') {
			this.#events = this.#events.filter((event) => event.id !== mutation.event.id);
		} else {
			this.#events = this.#events.map((event) =>
				event.id === mutation.before.id ? mutation.after : event
			);
		}
		this.#notify();
	}

	/**
	 * After a conflict, shows the server's version of `id` (or removes it) and forgets the undo
	 * steps that touch it: undoing them would write the stale copy back.
	 */
	#takeServer(id: string, current: T | null) {
		const others = this.#events.filter((event) => event.id !== id);
		const at = this.#events.findIndex((event) => event.id === id);
		this.#events = current
			? at === -1
				? [...others, current]
				: this.#events.map((event) => (event.id === id ? current : event))
			: others;
		const touches = (entry: Entry<T>) => entry.some((mutation) => targetId(mutation) === id);
		this.#past = this.#past.filter((entry) => !touches(entry));
		this.#future = this.#future.filter((entry) => !touches(entry));
		this.#notify();
	}

	/** Undoes a failed change, unless a later change already replaced it locally. */
	#rollback(mutation: Mutation<T>) {
		const current = this.#find(targetId(mutation));
		if (mutation.type === 'create' && current !== mutation.event) return;
		if (mutation.type === 'update' && current !== mutation.after) return;
		if (mutation.type === 'delete' && current) return;
		this.#apply(invert(mutation));
	}

	/** Swaps the local copy for the saved one, in the list and in the history. */
	#replace(local: T, saved: T, original: Mutation<T>) {
		if (this.#find(local.id) === local) {
			this.#events = this.#events.map((event) => (event === local ? saved : event));
			this.#notify();
		}
		if (saved.id === local.id) return;

		const swap = (event: T) => (event.id === local.id ? { ...event, id: saved.id } : event);
		const rewrite = (mutation: Mutation<T>): Mutation<T> =>
			mutation.type === 'update'
				? { type: 'update', before: swap(mutation.before), after: swap(mutation.after) }
				: { type: mutation.type, event: mutation === original ? saved : swap(mutation.event) };
		// Rewrite in place so entries keep their identity for undo/redo bookkeeping.
		for (const entry of [...this.#past, ...this.#future]) {
			entry.splice(0, entry.length, ...entry.map(rewrite));
		}
	}

	#move(entry: Entry<T>, from: Entry<T>[], to: Entry<T>[]) {
		if (this.#removeEntry(entry, from)) to.push(entry);
	}

	#removeEntry(entry: Entry<T>, list: Entry<T>[]) {
		const index = list.lastIndexOf(entry);
		if (index !== -1) list.splice(index, 1);
		return index !== -1;
	}

	#notify() {
		for (const listener of this.#listeners) listener(this.#events);
	}
}
