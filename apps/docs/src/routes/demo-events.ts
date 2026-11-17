import { startOfWeek, toZoned, type CalendarDate } from '@internationalized/date';
import type { CalendarEvent, Resource } from '@calendar-kit/core';

/** Rooms and people, grouped, for the timeline and resource views. */
export const demoResources: Resource[] = [
	{ id: 'rooms', title: 'Salas' },
	{ id: 'room-a', title: 'Sala A', parentId: 'rooms', color: 'oklch(0.6 0.15 250)' },
	{ id: 'room-b', title: 'Sala B', parentId: 'rooms', color: 'oklch(0.6 0.2 300)' },
	{ id: 'team', title: 'Equipo' },
	{ id: 'ana', title: 'Ana', parentId: 'team', color: 'oklch(0.65 0.15 150)' },
	{ id: 'luis', title: 'Luis', parentId: 'team', color: 'oklch(0.7 0.15 70)' }
];

/** Sample events around `today`, so the demo always has something to show. */
export function demoEvents(today: CalendarDate, locale: string, timeZone: string): CalendarEvent[] {
	const week = startOfWeek(today, locale);
	const at = (day: CalendarDate, hour: number, minute = 0) =>
		toZoned(day, timeZone).set({ hour, minute });
	const day = (offset: number) => week.add({ days: offset });

	return [
		{
			id: 'standup',
			title: 'Daily standup',
			start: at(day(1), 9),
			end: at(day(1), 9, 30),
			resourceIds: ['ana', 'luis']
		},
		{
			id: 'design-review',
			title: 'Design review',
			start: at(day(1), 9, 15),
			end: at(day(1), 10, 30),
			color: 'oklch(0.6 0.15 250)',
			resourceIds: ['room-a', 'ana']
		},
		{
			id: 'lunch',
			title: 'Almuerzo con el equipo',
			start: at(day(2), 13),
			end: at(day(2), 14, 30),
			color: 'oklch(0.65 0.15 150)',
			resourceIds: ['luis']
		},
		{
			id: 'workshop',
			title: 'Svelte workshop',
			start: at(day(3), 15),
			end: at(day(3), 18),
			color: 'oklch(0.6 0.2 300)',
			resourceIds: ['room-b']
		},
		{
			id: 'deploy',
			title: 'Deploy nocturno',
			start: at(day(4), 22),
			end: at(day(5), 1),
			color: 'oklch(0.6 0.2 25)'
		},
		{
			id: 'conference',
			title: 'Conferencia en Cusco',
			start: day(3),
			end: day(6),
			color: 'oklch(0.7 0.15 70)'
		},
		{
			id: 'holiday',
			title: 'Feriado',
			start: week.add({ weeks: 1, days: 2 }),
			end: week.add({ weeks: 1, days: 3 }),
			color: 'oklch(0.6 0.2 25)'
		},
		{
			id: 'english',
			title: 'Clase de inglés',
			start: at(day(1), 19),
			end: at(day(1), 20, 30),
			color: 'oklch(0.6 0.15 250)',
			rrule: 'FREQ=WEEKLY;BYDAY=MO,WE'
		},
		{
			id: 'bills',
			title: 'Pago de servicios',
			start: today.set({ day: 1 }).add({ months: 1 }).subtract({ days: 1 }),
			end: today.set({ day: 1 }).add({ months: 1 }),
			color: 'oklch(0.65 0.15 150)',
			rrule: 'FREQ=MONTHLY;BYMONTHDAY=-1'
		},
		...['Revisión 1:1', 'Planning', 'Retro', 'Café'].map((title, index) => ({
			id: `busy-${index}`,
			title,
			start: at(day(5), 10 + index),
			end: at(day(5), 10 + index, 45),
			resourceIds: ['room-a']
		})),
		// Project tasks for the gantt view (all-day, with progress and dependencies).
		...(
			[
				['analysis', 'Análisis', 7, 9, 1, []],
				['design', 'Diseño', 9, 11, 0.6, ['analysis']],
				['build', 'Desarrollo', 11, 14, 0.2, ['design']],
				['testing', 'Pruebas', 14, 16, 0, ['build']]
			] as const
		).map(([id, title, from, to, progress, dependsOn]) => ({
			id,
			title,
			start: day(from),
			end: day(to),
			progress,
			dependsOn,
			color: 'oklch(0.55 0.15 200)'
		}))
	];
}
