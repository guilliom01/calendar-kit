import { CalendarDate, parseZonedDateTime, type ZonedDateTime } from '@internationalized/date';
import type { CalendarEvent } from '../events/types.js';
import { OCCURRENCE_SEPARATOR } from '../recurrence/expand.js';
import { parseRRule } from '../recurrence/rule.js';

export interface IcsImportOptions {
	/** Zone for floating times and unknown TZIDs. Defaults to UTC. */
	timeZone?: string | undefined;
}

export interface IcsImportResult {
	events: CalendarEvent[];
	/** What could not be used as is, one sentence per problem. */
	warnings: string[];
}

interface Property {
	name: string;
	params: Record<string, string>;
	value: string;
}

/** Joins folded lines (a line break followed by a space or tab continues the previous line). */
const unfold = (text: string) => text.replace(/\r?\n[ \t]/g, '');

const unescapeText = (text: string) =>
	text.replace(/\\([\\;,nN])/g, (_, character: string) =>
		character === 'n' || character === 'N' ? '\n' : character
	);

/** Splits on `separator` outside double quotes. */
function splitOutsideQuotes(text: string, separator: string) {
	const parts: string[] = [];
	let current = '';
	let quoted = false;
	for (const character of text) {
		if (character === '"') quoted = !quoted;
		if (character === separator && !quoted) {
			parts.push(current);
			current = '';
		} else current += character;
	}
	parts.push(current);
	return parts;
}

function parseLine(line: string): Property {
	let colon = -1;
	let quoted = false;
	for (let index = 0; index < line.length; index++) {
		if (line[index] === '"') quoted = !quoted;
		if (line[index] === ':' && !quoted) {
			colon = index;
			break;
		}
	}
	const head = colon === -1 ? line : line.slice(0, colon);
	const [name = '', ...rawParams] = splitOutsideQuotes(head, ';');
	const params: Record<string, string> = {};
	for (const param of rawParams) {
		const [key = '', ...rest] = param.split('=');
		params[key.toUpperCase()] = rest.join('=').replace(/^"|"$/g, '');
	}
	return { name: name.toUpperCase(), params, value: colon === -1 ? '' : line.slice(colon + 1) };
}

function isTimeZone(zone: string) {
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: zone });
		return true;
	} catch {
		return false;
	}
}

const DURATION = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;

/** Reads RFC 5545 events. Unsupported pieces are dropped with a warning instead of failing. */
export function parseICS(text: string, options: IcsImportOptions = {}): IcsImportResult {
	const fallbackZone = options.timeZone ?? 'UTC';
	const warnings: string[] = [];
	const blocks: Property[][] = [];
	let current: Property[] | null = null;
	let depth = 0;

	for (const line of unfold(text).split(/\r?\n/)) {
		if (!line.trim()) continue;
		const property = parseLine(line);
		if (property.name === 'BEGIN' && property.value.toUpperCase() === 'VEVENT') {
			current = [];
			depth = 0;
		} else if (current && property.name === 'BEGIN') depth++;
		else if (current && property.name === 'END') {
			if (property.value.toUpperCase() === 'VEVENT' && depth === 0) {
				blocks.push(current);
				current = null;
			} else depth--;
		} else if (current && depth === 0) current.push(property);
	}

	const masters = new Map<string, CalendarEvent>();
	const overrides: {
		event: CalendarEvent;
		uid: string;
		recurrenceId: CalendarDate | ZonedDateTime;
	}[] = [];
	const cancelledOverrides: { uid: string; recurrenceId: CalendarDate | ZonedDateTime }[] = [];

	for (const block of blocks) {
		const get = (name: string) => block.find((property) => property.name === name);
		const uid = get('UID')?.value ?? `event-${masters.size + overrides.length + 1}`;
		const readDate = ({ value, params }: Property) => {
			if (params.VALUE === 'DATE' || /^\d{8}$/.test(value)) {
				return new CalendarDate(
					Number(value.slice(0, 4)),
					Number(value.slice(4, 6)),
					Number(value.slice(6, 8))
				);
			}
			const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(value);
			if (!match) throw new RangeError(`invalid date "${value}"`);
			const [, year, month, day, hour, minute, second, utc] = match;
			let zone = utc ? 'UTC' : (params.TZID ?? fallbackZone);
			if (!isTimeZone(zone)) {
				warnings.push(`${uid}: unknown time zone "${zone}"; read as ${fallbackZone}`);
				zone = fallbackZone;
			}
			return parseZonedDateTime(`${year}-${month}-${day}T${hour}:${minute}:${second}[${zone}]`);
		};

		const startProperty = get('DTSTART');
		if (!startProperty) {
			warnings.push(`${uid}: no DTSTART; skipped`);
			continue;
		}
		let start: CalendarDate | ZonedDateTime;
		try {
			start = readDate(startProperty);
		} catch (error) {
			warnings.push(`${uid}: ${(error as Error).message}; skipped`);
			continue;
		}

		const endProperty = get('DTEND');
		const duration = get('DURATION') && DURATION.exec(get('DURATION')!.value);
		let end: CalendarDate | ZonedDateTime;
		if (endProperty) end = readDate(endProperty);
		else if (duration) {
			const [, sign, weeks, days, hours, minutes, seconds] = duration;
			const amount = {
				weeks: +(weeks ?? 0),
				days: +(days ?? 0),
				hours: +(hours ?? 0),
				minutes: +(minutes ?? 0),
				seconds: +(seconds ?? 0)
			};
			const signed = sign === '-' ? -1 : 1;
			end =
				'hour' in start
					? start.add(
							Object.fromEntries(
								Object.entries(amount).map(([key, value]) => [key, value * signed])
							)
						)
					: start.add({ weeks: amount.weeks * signed, days: amount.days * signed });
		} else end = 'hour' in start ? start : start.add({ days: 1 });

		const event: CalendarEvent = {
			id: uid,
			title: unescapeText(get('SUMMARY')?.value ?? ''),
			start,
			end
		} as CalendarEvent;

		const location = get('LOCATION')?.value;
		if (location) event.location = unescapeText(location);
		const description = get('DESCRIPTION')?.value;
		if (description) event.description = unescapeText(description);

		const rrule = get('RRULE')?.value;
		if (rrule) {
			try {
				parseRRule(rrule);
				event.rrule = rrule;
			} catch (error) {
				warnings.push(
					`${uid}: unsupported recurrence rule (${(error as Error).message}); imported as a single event`
				);
			}
		}
		const exdates = block
			.filter((property) => property.name === 'EXDATE')
			.flatMap((property) =>
				property.value.split(',').map((value) => readDate({ ...property, value }))
			);
		if (exdates.length) event.exdates = exdates;

		const extra = (name: string) => get(`X-CALENDAR-KIT-${name}`)?.value;
		const list = (value: string | undefined) =>
			value
				? splitOutsideQuotes(value.replace(/\\,/g, '\u0000'), ',').map((item) =>
						unescapeText(item.replace(/\u0000/g, '\\,'))
					)
				: undefined;
		if (extra('COLOR')) event.color = unescapeText(extra('COLOR')!);
		if (extra('RESOURCES')) event.resourceIds = list(extra('RESOURCES'));
		if (extra('PROGRESS')) event.progress = Number(extra('PROGRESS'));
		if (extra('DEPENDS-ON')) event.dependsOn = list(extra('DEPENDS-ON'));

		const cancelled = get('STATUS')?.value.toUpperCase() === 'CANCELLED';
		const recurrence = get('RECURRENCE-ID');
		if (recurrence) {
			const recurrenceId = readDate(recurrence);
			if (cancelled) cancelledOverrides.push({ uid, recurrenceId });
			else overrides.push({ event, uid, recurrenceId });
		} else if (!cancelled) {
			if (masters.has(uid)) warnings.push(`${uid}: duplicate UID; kept the first one`);
			else masters.set(uid, event);
		}
	}

	// A modified occurrence becomes an exclusion in its series plus a single event.
	const exclude = (uid: string, date: CalendarDate | ZonedDateTime) => {
		const master = masters.get(uid);
		if (master) master.exdates = [...(master.exdates ?? []), date];
	};
	for (const { uid, recurrenceId } of cancelledOverrides) exclude(uid, recurrenceId);
	const singles = overrides.map(({ event, uid, recurrenceId }) => {
		exclude(uid, recurrenceId);
		const { rrule: _rrule, exdates: _exdates, ...single } = event;
		return {
			...single,
			id: `${uid}${OCCURRENCE_SEPARATOR}${recurrenceId.toString()}`
		} as CalendarEvent;
	});

	return { events: [...masters.values(), ...singles], warnings };
}
