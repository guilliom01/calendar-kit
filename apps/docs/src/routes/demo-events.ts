import { startOfWeek, toZoned, type CalendarDate } from '@internationalized/date';
import type { CalendarEvent } from '@calendar-kit/core';

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
			end: at(day(1), 9, 30)
		},
		{
			id: 'design-review',
			title: 'Design review',
			start: at(day(1), 9, 15),
			end: at(day(1), 10, 30),
			color: 'oklch(0.6 0.15 250)'
		},
		{
			id: 'lunch',
			title: 'Almuerzo con el equipo',
			start: at(day(2), 13),
			end: at(day(2), 14, 30),
			color: 'oklch(0.65 0.15 150)'
		},
		{
			id: 'workshop',
			title: 'Svelte workshop',
			start: at(day(3), 15),
			end: at(day(3), 18),
			color: 'oklch(0.6 0.2 300)'
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
		...['Revisión 1:1', 'Planning', 'Retro', 'Café'].map((title, index) => ({
			id: `busy-${index}`,
			title,
			start: at(day(5), 10 + index),
			end: at(day(5), 10 + index, 45)
		}))
	];
}
