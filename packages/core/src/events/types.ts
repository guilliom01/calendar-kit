import type { CalendarDate, ZonedDateTime } from '@internationalized/date';

interface EventBase<TData> {
	id: string;
	title: string;
	calendarId?: string | undefined;
	/** Any CSS color; components fall back to the calendar or theme color. */
	color?: string | undefined;
	/** Your own payload; the library never reads it. */
	data?: TData | undefined;
	/** RFC 5545 recurrence rule, e.g. `FREQ=WEEKLY;BYDAY=MO,WE`. Makes the event a series. */
	rrule?: string | undefined;
	/** Starts of occurrences removed from the series (EXDATE). */
	exdates?: readonly (CalendarDate | ZonedDateTime)[] | undefined;
	/** Set on expanded occurrences: the id of the series they come from. */
	seriesId?: string | undefined;
	/** Set on expanded occurrences: their original start in the series (RECURRENCE-ID). */
	recurrenceId?: CalendarDate | ZonedDateTime | undefined;
	/** Resources (people, rooms...) the event is assigned to, for the timeline and resource views. */
	resourceIds?: readonly string[] | undefined;
	/** Gantt: completion from 0 to 1. */
	progress?: number | undefined;
	/** Gantt: ids of the events that must finish before this one. */
	dependsOn?: readonly string[] | undefined;
}

/** Someone or something events are assigned to: a person, a room, a vehicle... */
export interface Resource {
	id: string;
	title: string;
	color?: string | undefined;
	/** Makes this resource a child of another one, for grouped rows. */
	parentId?: string | undefined;
}

/** Date-only event. `end` is exclusive, as in iCalendar: a one-day event ends the next day. */
export interface AllDayEvent<TData = unknown> extends EventBase<TData> {
	start: CalendarDate;
	end: CalendarDate;
}

/** Event at an exact time. `end` is exclusive. Time zones may differ from the calendar's. */
export interface TimedEvent<TData = unknown> extends EventBase<TData> {
	start: ZonedDateTime;
	end: ZonedDateTime;
}

export type CalendarEvent<TData = unknown> = AllDayEvent<TData> | TimedEvent<TData>;
