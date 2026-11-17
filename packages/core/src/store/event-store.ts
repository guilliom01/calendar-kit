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
	onMutate?: ((mutation: Mutation<T>) => Promise<T | void> | T | void) | undefined;
	/** Called when `onMutate` fails, after the rollback. */
	onError?: ((error: unknown, mutation: Mutation<T>) => void) | undefined;
	/** Undo steps to keep. */
	historyLimit?: number | undefined;
}

type Listener<T> = (events: readonly T[]) => void;

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
export class EventStore<T extends CalendarEvent = CalendarEvent> {
	#events: T[];
	#listeners = new Set<Listener<T>>();
	#past: Mutation<T>[] = [];
	#future: Mutation<T>[] = [];
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
	create(event: T): Promise<T | undefined> {
		return this.#record({ type: 'create', event });
	}

	/** Replaces the event with the same id. Resolves with the saved event, or `undefined`. */
	update(event: T): Promise<T | undefined> {
		const before = this.#find(event.id);
		if (!before) return Promise.resolve(undefined);
		return this.#record({ type: 'update', before, after: event });
	}

	async remove(id: string): Promise<void> {
		const event = this.#find(id);
		if (event) await this.#record({ type: 'delete', event });
	}

	async undo(): Promise<void> {
		const mutation = this.#past.pop();
		if (!mutation) return;
		this.#future.push(mutation);
		const ok = await this.#run(invert(mutation), mutation);
		if (!ok) this.#move(mutation, this.#future, this.#past);
	}

	async redo(): Promise<void> {
		const mutation = this.#future.pop();
		if (!mutation) return;
		this.#past.push(mutation);
		const ok = await this.#run(mutation, mutation);
		if (!ok) this.#move(mutation, this.#past, this.#future);
	}

	#find(id: string) {
		return this.#events.find((event) => event.id === id);
	}

	/** Runs a new user change and adds it to the undo history. */
	async #record(mutation: Mutation<T>): Promise<T | undefined> {
		this.#past.push(mutation);
		this.#future = [];
		const limit = this.#options.historyLimit ?? 100;
		if (this.#past.length > limit) this.#past.shift();

		let saved: T | undefined;
		const ok = await this.#run(mutation, mutation, (event) => (saved = event));
		if (!ok) {
			this.#remove(mutation, this.#past);
			return undefined;
		}
		return saved;
	}

	/**
	 * Applies `mutation` locally, then saves it after earlier saves of the same event.
	 * `entry` is the history entry to fix up when the backend assigns a new id.
	 */
	#run(
		mutation: Mutation<T>,
		entry: Mutation<T>,
		onSaved?: (event: T | undefined) => void
	): Promise<boolean> {
		this.#apply(mutation);
		const id = targetId(mutation);
		const previous = this.#queues.get(id) ?? Promise.resolve();

		const task = previous.then(async () => {
			try {
				const saved = (await this.#options.onMutate?.(mutation)) ?? undefined;
				const local = mutation.type === 'update' ? mutation.after : mutation.event;
				if (saved && mutation.type !== 'delete') this.#replace(local, saved, entry);
				onSaved?.(mutation.type === 'delete' ? undefined : (saved ?? local));
				return true;
			} catch (error) {
				this.#rollback(mutation);
				this.#options.onError?.(error, mutation);
				return false;
			}
		});

		this.#queues.set(id, task);
		void task.finally(() => {
			if (this.#queues.get(id) === task) this.#queues.delete(id);
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

	/** Undoes a failed change, unless a later change already replaced it locally. */
	#rollback(mutation: Mutation<T>) {
		const current = this.#find(targetId(mutation));
		if (mutation.type === 'create' && current !== mutation.event) return;
		if (mutation.type === 'update' && current !== mutation.after) return;
		if (mutation.type === 'delete' && current) return;
		this.#apply(invert(mutation));
	}

	/** Swaps the local copy for the saved one, in the list and in the history. */
	#replace(local: T, saved: T, entry: Mutation<T>) {
		if (this.#find(local.id) === local) {
			this.#events = this.#events.map((event) => (event === local ? saved : event));
			this.#notify();
		}
		if (saved.id === local.id) return;

		const swap = (event: T) => (event.id === local.id ? { ...event, id: saved.id } : event);
		const rewrite = (mutation: Mutation<T>): Mutation<T> =>
			mutation.type === 'update'
				? { type: 'update', before: swap(mutation.before), after: swap(mutation.after) }
				: { type: mutation.type, event: mutation === entry ? saved : swap(mutation.event) };
		this.#past = this.#past.map(rewrite);
		this.#future = this.#future.map(rewrite);
	}

	#move(mutation: Mutation<T>, from: Mutation<T>[], to: Mutation<T>[]) {
		if (this.#remove(mutation, from)) to.push(mutation);
	}

	#remove(mutation: Mutation<T>, list: Mutation<T>[]) {
		const index = list.lastIndexOf(mutation);
		if (index !== -1) list.splice(index, 1);
		return index !== -1;
	}

	#notify() {
		for (const listener of this.#listeners) listener(this.#events);
	}
}
