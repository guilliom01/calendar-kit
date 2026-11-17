import { describe, expect, it } from 'vitest';
import { CalendarDate, parseZonedDateTime } from '@internationalized/date';
import { toCSV } from '../src/index.js';
import { allDay, timed } from './fixtures.js';

describe('toCSV', () => {
	it('writes one row per event with local times, quoting where needed', () => {
		const csv = toCSV(
			[
				{
					...timed('m1', '2026-11-18T09:00', '2026-11-18T10:30'),
					title: 'Reunión, "kickoff"',
					resourceIds: ['ana', 'luis']
				},
				allDay('h1', new CalendarDate(2026, 11, 24), new CalendarDate(2026, 11, 25)),
				{
					id: 'madrid',
					title: 'Llamada\nMadrid',
					start: parseZonedDateTime('2026-11-18T15:00[Europe/Madrid]'),
					end: parseZonedDateTime('2026-11-18T16:00[Europe/Madrid]'),
					rrule: 'FREQ=WEEKLY;BYDAY=WE'
				}
			],
			{ timeZone: 'America/Lima' }
		);

		expect(csv.split('\r\n')).toEqual([
			'id,title,start,end,all_day,rrule,resources,color',
			'm1,"Reunión, ""kickoff""",2026-11-18 09:00,2026-11-18 10:30,false,,ana;luis,',
			'h1,h1,2026-11-24,2026-11-24,true,,,',
			'madrid,"Llamada\nMadrid",2026-11-18 09:00,2026-11-18 10:00,false,FREQ=WEEKLY;BYDAY=WE,,',
			''
		]);
	});
});
