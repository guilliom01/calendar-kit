import { expect, test, type Page } from '@playwright/test';

// Tuesday 2026-11-17, 14:00 in Lima. The demo events are placed around "today".
test.beforeEach(async ({ page }) => {
	await page.clock.setFixedTime(new Date('2026-11-17T14:00:00-05:00'));
	await page.goto('/');
});

const title = (page: Page) => page.getByRole('heading', { level: 2 });
const viewButton = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

test('month view shows the current month with its events', async ({ page }) => {
	await expect(title(page)).toHaveText('noviembre de 2026');
	await expect(page.getByText('Conferencia en Cusco')).toBeVisible();
	await expect(page.getByText('Feriado')).toBeVisible();
	// Friday: the conference bar plus 4 meetings; 3 lanes fit, 2 meetings collapse.
	// The overnight deploy (Thu 22:00 to Fri 01:00) shows only on Thursday.
	await expect(page.getByRole('button', { name: '+2' })).toBeVisible();
});

test('previous, next and today navigate by the current view', async ({ page }) => {
	await page.getByRole('button', { name: 'el próximo mes' }).click();
	await expect(title(page)).toHaveText('diciembre de 2026');

	await page.getByRole('button', { name: 'el mes pasado' }).click();
	await page.getByRole('button', { name: 'el mes pasado' }).click();
	await expect(title(page)).toHaveText('octubre de 2026');

	await page.getByRole('button', { name: 'hoy' }).click();
	await expect(title(page)).toHaveText('noviembre de 2026');
});

test('week and day views show the time grid', async ({ page }) => {
	await viewButton(page, 'semana').click();
	await expect(title(page)).toHaveText('15 – 21 de nov. de 2026');
	await expect(viewButton(page, 'semana')).toHaveAttribute('aria-pressed', 'true');
	await expect(page.getByText('Svelte workshop')).toBeVisible();
	await expect(page.getByText('todo el día')).toBeVisible();

	await page.getByRole('button', { name: 'la próxima semana' }).click();
	await expect(title(page)).toHaveText('22 – 28 de nov. de 2026');

	// The focused date moved from Tue 17 to Tue 24; the day view shows it.
	await viewButton(page, 'día').click();
	await expect(title(page)).toHaveText('martes, 24 de noviembre de 2026');
});

test('clicking a day number opens that day', async ({ page }) => {
	await page.getByRole('button', { name: 'miércoles, 18 de noviembre de 2026' }).click();
	await expect(title(page)).toHaveText('miércoles, 18 de noviembre de 2026');
	await expect(page.getByText('Svelte workshop')).toBeVisible();
});

test.describe('editing', () => {
	const HOUR = 48; // 3rem hour height

	/** Drags from the given point by (dx, dy) pixels in small steps. */
	async function drag(page: Page, x: number, y: number, dx: number, dy: number) {
		await page.mouse.move(x, y);
		await page.mouse.down();
		await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 5 });
		await page.mouse.move(x + dx, y + dy, { steps: 5 });
		await page.mouse.up();
	}

	test('creates an event from the toolbar at the next full hour', async ({ page }) => {
		await page.getByRole('button', { name: 'Nuevo evento' }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('heading', { name: 'Nuevo evento' })).toBeVisible();

		await dialog.getByLabel('Título').fill('Clase de cerámica');
		await dialog.getByRole('button', { name: 'Guardar' }).click();
		await expect(dialog).toBeHidden();

		await viewButton(page, 'día').click();
		await expect(page.getByRole('button', { name: /Clase de cerámica/ })).toContainText(
			'3:00 – 4:00 p. m.'
		);
	});

	test('edits and deletes an event, and undoes and redoes the delete', async ({ page }) => {
		await viewButton(page, 'semana').click();
		const dialog = page.getByRole('dialog');

		await page.getByRole('button', { name: /Svelte workshop/ }).click();
		await expect(dialog.getByRole('heading', { name: 'Editar evento' })).toBeVisible();
		await dialog.getByLabel('Título').fill('Taller de Svelte');
		await dialog.getByRole('button', { name: 'Guardar' }).click();
		const workshop = page.getByRole('button', { name: /Taller de Svelte/ });
		await expect(workshop).toBeVisible();

		await workshop.click();
		await dialog.getByRole('button', { name: 'Eliminar' }).click();
		await expect(workshop).toBeHidden();

		await page.keyboard.press('Control+z');
		await expect(workshop).toBeVisible();

		await page.getByRole('button', { name: 'Rehacer' }).click();
		await expect(workshop).toBeHidden();
	});

	test('moves and resizes timed events in the week view', async ({ page }) => {
		await viewButton(page, 'semana').click();

		const workshop = page.getByRole('button', { name: /Svelte workshop/ });
		await workshop.scrollIntoViewIfNeeded();
		let box = (await workshop.boundingBox())!;
		await drag(page, box.x + box.width / 2, box.y + 20, 0, HOUR);
		await expect(workshop).toContainText('4:00 – 7:00 p. m.');

		const lunch = page.getByRole('button', { name: /Almuerzo/ });
		await lunch.scrollIntoViewIfNeeded();
		box = (await lunch.boundingBox())!;
		await drag(page, box.x + box.width / 2, box.y + box.height - 3, 0, HOUR);
		await expect(lunch).toContainText('1:00 – 3:30 p. m.');

		// One column to the right: Wednesday 18 -> Thursday 19.
		await workshop.scrollIntoViewIfNeeded();
		box = (await workshop.boundingBox())!;
		await drag(page, box.x + box.width / 2, box.y + 20, box.width, 0);
		await page.getByRole('button', { name: 'jueves, 19 de noviembre de 2026' }).click();
		await expect(page.getByRole('button', { name: /Svelte workshop/ })).toContainText(
			'4:00 – 7:00 p. m.'
		);
	});

	test('moves an event to another day in the month view', async ({ page }) => {
		const holiday = page.getByRole('button', { name: 'Feriado' });
		const from = (await holiday.boundingBox())!;
		const target = (await page.locator('[data-date="2026-11-26"]').boundingBox())!;

		await drag(
			page,
			from.x + 10,
			from.y + from.height / 2,
			target.x + target.width / 2 - (from.x + 10),
			0
		);

		await page.getByRole('button', { name: 'jueves, 26 de noviembre de 2026' }).click();
		await expect(page.getByRole('button', { name: 'Feriado' })).toBeVisible();
	});

	test('draws a new event on an empty part of the time grid', async ({ page }) => {
		await viewButton(page, 'día').click();
		const column = (await page.locator('[style*="repeating-linear-gradient"]').boundingBox())!;

		// From 10:00 to 11:30.
		await drag(page, column.x + column.width / 2, column.y + 10 * HOUR + 2, 0, 1.5 * HOUR);

		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('heading', { name: 'Nuevo evento' })).toBeVisible();
		await expect(dialog.getByLabel('Inicio, hora')).toHaveValue('10:00');
		await expect(dialog.getByLabel('Fin, hora')).toHaveValue('11:30');
	});
});

test.describe('recurring events', () => {
	const english = (page: Page) => page.getByRole('button', { name: /Clase de inglés/ });
	const dialog = (page: Page) => page.getByRole('dialog');

	async function chooseScope(page: Page, scope: string) {
		await expect(dialog(page).getByRole('heading', { name: /evento recurrente/ })).toBeVisible();
		await dialog(page).getByLabel(scope).check();
		await dialog(page).getByRole('button', { name: 'Aceptar' }).click();
		await expect(dialog(page)).toBeHidden();
	}

	test('show on every matching day, week after week', async ({ page }) => {
		await viewButton(page, 'semana').click();
		await expect(english(page)).toHaveCount(2);
		await page.getByRole('button', { name: 'la próxima semana' }).click();
		await expect(english(page)).toHaveCount(2);
	});

	test('editing one occurrence changes only that one, in one undo step', async ({ page }) => {
		await viewButton(page, 'semana').click();
		await english(page).first().click();
		await dialog(page).getByLabel('Título').fill('Clase de repaso');
		await dialog(page).getByRole('button', { name: 'Guardar' }).click();
		await chooseScope(page, 'Este evento');

		await expect(page.getByRole('button', { name: /Clase de repaso/ })).toHaveCount(1);
		await expect(english(page)).toHaveCount(1);

		await page.keyboard.press('Control+z');
		await expect(english(page)).toHaveCount(2);
		await expect(page.getByRole('button', { name: /Clase de repaso/ })).toHaveCount(0);
	});

	test('moving an occurrence with "all events" moves the whole series', async ({ page }) => {
		await viewButton(page, 'semana').click();
		const wednesday = english(page).last();
		await wednesday.scrollIntoViewIfNeeded();
		const box = (await wednesday.boundingBox())!;
		await page.mouse.move(box.x + box.width / 2, box.y + 10);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width / 2, box.y + 34, { steps: 5 });
		await page.mouse.move(box.x + box.width / 2, box.y + 58, { steps: 5 });
		await page.mouse.up();
		await chooseScope(page, 'Todos los eventos');

		await expect(english(page).first()).toContainText('8:00 – 9:30 p. m.');
		await page.getByRole('button', { name: 'la próxima semana' }).click();
		await expect(english(page).first()).toContainText('8:00 – 9:30 p. m.');
	});

	test('deleting "this and following" keeps the earlier occurrences', async ({ page }) => {
		await viewButton(page, 'semana').click();
		await page.getByRole('button', { name: 'la próxima semana' }).click();
		await english(page).first().click();
		await dialog(page).getByRole('button', { name: 'Eliminar' }).click();
		await chooseScope(page, 'Este y los eventos siguientes');

		await expect(english(page)).toHaveCount(0);
		await page.getByRole('button', { name: 'la semana pasada' }).click();
		await expect(english(page)).toHaveCount(2);
	});

	test('the recurrence editor builds custom rules: every 2 weeks on Tuesday and Thursday', async ({
		page
	}) => {
		await page.getByRole('button', { name: 'Nuevo evento' }).click();
		await dialog(page).getByLabel('Título').fill('Gimnasio');
		await dialog(page).getByRole('combobox', { name: 'Repetir' }).selectOption({ label: 'semana' });
		// Tuesday comes from the start date; add Thursday and make it every 2 weeks.
		await expect(dialog(page).getByRole('button', { name: 'martes' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await dialog(page).getByRole('button', { name: 'jueves' }).click();
		await dialog(page).getByRole('spinbutton', { name: 'Repetir cada' }).fill('2');
		await dialog(page).getByRole('button', { name: 'Guardar' }).click();

		const gym = page.getByRole('button', { name: /Gimnasio/ });
		await viewButton(page, 'semana').click();
		await expect(gym).toHaveCount(2);
		await page.getByRole('button', { name: 'la próxima semana' }).click();
		await expect(gym).toHaveCount(0);
		await page.getByRole('button', { name: 'la próxima semana' }).click();
		await expect(gym).toHaveCount(2);
	});

	test('the recurrence editor shows the rule of an existing series', async ({ page }) => {
		await viewButton(page, 'semana').click();
		await english(page).first().click();
		await expect(dialog(page).getByRole('button', { name: 'lunes' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await expect(dialog(page).getByRole('button', { name: 'miércoles' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await expect(dialog(page).getByRole('button', { name: 'martes' })).toHaveAttribute(
			'aria-pressed',
			'false'
		);
	});

	test('a monthly series on the last day lands on 30 and 31', async ({ page }) => {
		const bills = page.getByRole('button', { name: 'Pago de servicios' });
		await page.getByRole('button', { name: 'lunes, 30 de noviembre de 2026' }).click();
		await expect(bills).toBeVisible();
		await page.getByRole('button', { name: 'mañana' }).click();
		await expect(bills).toHaveCount(0);

		await viewButton(page, 'mes').click();
		await page.getByRole('button', { name: 'jueves, 31 de diciembre de 2026' }).click();
		await expect(bills).toBeVisible();
	});
});

test('switching the time zone shows timed events at the new local time', async ({ page }) => {
	await page.getByRole('button', { name: 'lunes, 16 de noviembre de 2026' }).click();
	const review = page.getByRole('button', { name: /Design review/ });
	await expect(review).toContainText('9:15 – 10:30 a. m.');

	await page.getByRole('combobox', { name: 'Zona horaria' }).selectOption('Europe/Madrid');
	await expect(review).toContainText('3:15 – 4:30 p. m.');
});

test.describe('more views', () => {
	async function dragTo(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
		await page.mouse.move(from.x, from.y);
		await page.mouse.down();
		await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 5 });
		await page.mouse.move(to.x, to.y, { steps: 5 });
		await page.mouse.up();
	}
	const center = (box: { x: number; y: number; width: number; height: number }) => ({
		x: box.x + box.width / 2,
		y: box.y + box.height / 2
	});

	test('year view shows the year, how busy each day is, and opens a day', async ({ page }) => {
		await viewButton(page, 'año').click();
		await expect(title(page)).toHaveText('2026');

		await page
			.getByRole('button', { name: 'miércoles, 18 de noviembre de 2026, 3 eventos' })
			.click();
		await expect(title(page)).toHaveText('miércoles, 18 de noviembre de 2026');
	});

	test('agenda lists the month day by day with resources, and opens events', async ({ page }) => {
		await viewButton(page, 'Agenda').click();
		const standup = page.getByRole('button', { name: /Daily standup/ });
		await expect(standup).toContainText('Ana y Luis');
		await expect(standup).toContainText('9:00 – 9:30 a. m.');

		await standup.click();
		await expect(page.getByRole('dialog').getByLabel('Título')).toHaveValue('Daily standup');
	});

	test('timeline groups resources and moves events between them', async ({ page }) => {
		await viewButton(page, 'Línea de tiempo').click();
		const workshop = page.getByRole('button', { name: /Svelte workshop/ });
		const roomA = page.locator('[data-date="2026-11-18"][data-resource="room-a"]');

		await dragTo(
			page,
			center((await workshop.boundingBox())!),
			center((await roomA.boundingBox())!)
		);
		const bar = center((await workshop.boundingBox())!);
		const row = (await roomA.boundingBox())!;
		expect(bar.y).toBeGreaterThan(row.y);
		expect(bar.y).toBeLessThan(row.y + row.height);

		await workshop.click();
		await expect(page.getByRole('dialog').getByLabel('Sala A')).toBeChecked();
		await expect(page.getByRole('dialog').getByLabel('Sala B')).not.toBeChecked();
		await page.keyboard.press('Escape');

		const rooms = page.getByRole('button', { name: 'Salas' });
		await rooms.click();
		await expect(rooms).toHaveAttribute('aria-expanded', 'false');
		await expect(page.getByText('Sala A')).toBeHidden();
	});

	test('resource view shows one column per resource and creates events for it', async ({
		page
	}) => {
		await viewButton(page, 'Recursos').click();
		await expect(page.getByRole('button', { name: /Almuerzo/ })).toBeVisible();

		const column = (await page
			.locator('[style*="repeating-linear-gradient"]')
			.nth(2)
			.boundingBox())!;
		await page.mouse.click(column.x + column.width / 2, column.y + 10 * 48 + 5);
		const dialog = page.getByRole('dialog');
		await expect(dialog.getByLabel('Ana')).toBeChecked();
		await expect(dialog.getByLabel('Luis')).not.toBeChecked();
		await expect(dialog.getByLabel('Inicio, hora')).toHaveValue('10:00');
	});

	test('gantt shows tasks with progress and dependency arrows', async ({ page }) => {
		await viewButton(page, 'Gantt').click();
		for (const task of ['Análisis', 'Diseño', 'Desarrollo', 'Pruebas']) {
			await expect(page.getByRole('button', { name: new RegExp(`^${task}`) })).toBeVisible();
		}
		await expect(page.getByRole('button', { name: /^Diseño, Avance 60/ })).toBeVisible();
		await expect(page.locator('svg path[marker-end]')).toHaveCount(3);
	});
});

test('loads events month by month with a cache', async ({ page }) => {
	await page.goto('/carga');
	const requests = page.getByTestId('requests');
	await expect(page.getByRole('button', { name: /Evento remoto 1\/11/ })).toBeVisible();
	await expect(requests).toHaveText(/2026-11/);

	await page.getByRole('button', { name: 'el próximo mes' }).click();
	await expect(page.getByRole('button', { name: /Evento remoto 1\/12/ })).toBeVisible();
	await page.getByRole('button', { name: 'el mes pasado' }).click();
	await expect(page.getByRole('button', { name: /Evento remoto 1\/11/ })).toBeVisible();

	// Each month was requested once, including the preloaded neighbours.
	const months = (await requests.textContent())!
		.replace('Meses pedidos:', '')
		.split(',')
		.map((m) => m.trim());
	expect(months.filter((month) => month === '2026-11')).toHaveLength(1);
	expect(months.filter((month) => month === '2026-12')).toHaveLength(1);
});

test.describe('building blocks', () => {
	test('a month-only calendar has no other views, no dialog, and its own click handling', async ({
		page
	}) => {
		await page.goto('/minimo');
		await expect(title(page)).toHaveText('noviembre de 2026');
		await expect(page.getByRole('group', { name: 'Vistas' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Nuevo evento' })).toHaveCount(0);

		await page.getByRole('button', { name: /Svelte workshop/ }).click();
		await expect(page.getByTestId('panel')).toHaveText('Evento elegido: Svelte workshop');
		await expect(page.getByRole('dialog')).toHaveCount(0);

		await page.getByRole('button', { name: 'miércoles, 25 de noviembre de 2026' }).click();
		await expect(page.getByTestId('panel')).toHaveText('Día elegido: 2026-11-25');
		await expect(title(page)).toHaveText('noviembre de 2026');
	});

	test('hooks can veto changes, lock events and replace the new-event dialog', async ({ page }) => {
		await page.goto('/ganchos');
		const message = page.getByTestId('message');
		const cell = (date: string) => page.locator(`[data-date="${date}"]`);
		const centerOf = async (locator: ReturnType<Page['locator']>) => {
			const box = (await locator.boundingBox())!;
			return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
		};
		async function dragTo(name: RegExp | string, date: string) {
			const from = await centerOf(page.getByRole('button', { name }));
			const to = await centerOf(cell(date));
			await page.mouse.move(from.x, from.y);
			await page.mouse.down();
			await page.mouse.move(to.x, to.y, { steps: 8 });
			await page.mouse.up();
		}
		async function expectIn(name: RegExp | string, date: string) {
			const chip = await centerOf(page.getByRole('button', { name }));
			const box = (await cell(date).boundingBox())!;
			expect(chip.x).toBeGreaterThan(box.x);
			expect(chip.x).toBeLessThan(box.x + box.width);
			expect(chip.y).toBeGreaterThan(box.y);
			expect(chip.y).toBeLessThan(box.y + box.height);
		}

		// onEventChange vetoes Sundays.
		await dragTo(/Svelte workshop/, '2026-11-22');
		await expect(message).toHaveText('No se permiten eventos en domingo');
		await expectIn(/Svelte workshop/, '2026-11-18');

		await dragTo(/Svelte workshop/, '2026-11-26');
		await expect(message).toHaveText('Movido: Svelte workshop');
		await expectIn(/Svelte workshop/, '2026-11-26');

		// isEditable locks the holiday.
		await dragTo('Feriado', '2026-11-25');
		await expectIn('Feriado', '2026-11-24');

		// onSelect replaces the new-event dialog.
		const empty = (await cell('2026-11-27').boundingBox())!;
		await page.mouse.click(empty.x + empty.width / 2, empty.y + empty.height - 8);
		await expect(message).toHaveText('Selección: 2026-11-27');
		await expect(page.getByRole('dialog')).toHaveCount(0);
	});
});

test('the demo navigation opens each page and marks the current one', async ({ page }) => {
	const nav = page.getByRole('navigation', { name: 'Demos' });
	for (const [label, heading] of [
		['Solo mes', 'Solo vista de mes'],
		['Ganchos', 'Ganchos de interacción'],
		['Carga por rango', 'Carga por rango'],
		['Completo', 'Calendario completo']
	]) {
		await nav.getByRole('link', { name: label }).click();
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
		await expect(nav.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
	}
});

test.describe('import and export', () => {
	const readDownload = async (download: import('@playwright/test').Download) => {
		const chunks: Buffer[] = [];
		for await (const chunk of (await download.createReadStream())!) chunks.push(chunk as Buffer);
		return Buffer.concat(chunks).toString('utf8');
	};

	test('exports the events as .ics, with series and their rules', async ({ page }) => {
		const [download] = await Promise.all([
			page.waitForEvent('download'),
			page.getByRole('button', { name: 'Exportar .ics' }).click()
		]);
		expect(download.suggestedFilename()).toBe('calendario.ics');
		const ics = await readDownload(download);
		expect(ics).toContain('SUMMARY:Daily standup');
		expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE');
		expect(ics).toContain('X-WR-CALNAME:calendar-kit');
	});

	test('exports the visible events as CSV with local times', async ({ page }) => {
		const [download] = await Promise.all([
			page.waitForEvent('download'),
			page.getByRole('button', { name: 'Exportar CSV' }).click()
		]);
		const csv = await readDownload(download);
		expect(csv).toContain('id,title,start,end,all_day,rrule,resources,color');
		expect(csv).toContain(
			'standup,Daily standup,2026-11-16 09:00,2026-11-16 09:30,false,,ana;luis,'
		);
	});

	test('imports a .ics file as one undo step and reports what it could not use', async ({
		page
	}) => {
		const ics = [
			'BEGIN:VCALENDAR',
			'BEGIN:VEVENT',
			'UID:imported-1',
			'SUMMARY:Evento importado',
			'DTSTART;TZID=America/Lima:20261119T100000',
			'DTEND;TZID=America/Lima:20261119T110000',
			'END:VEVENT',
			'BEGIN:VEVENT',
			'UID:imported-2',
			'SUMMARY:Cada hora',
			'DTSTART;TZID=America/Lima:20261120T080000',
			'RRULE:FREQ=HOURLY',
			'END:VEVENT',
			'END:VCALENDAR'
		].join('\r\n');
		await page.locator('input[type="file"]').setInputFiles({
			name: 'otro.ics',
			mimeType: 'text/calendar',
			buffer: Buffer.from(ics)
		});

		await expect(page.getByTestId('import-warnings')).toContainText(
			'imported-2: unsupported recurrence rule'
		);
		await viewButton(page, 'semana').click();
		await expect(page.getByRole('button', { name: /Evento importado/ })).toContainText(
			'10:00 – 11:00 a. m.'
		);

		await page.keyboard.press('Control+z');
		await expect(page.getByRole('button', { name: /Evento importado/ })).toHaveCount(0);
		await expect(page.getByRole('button', { name: /Cada hora/ })).toHaveCount(0);
	});

	test('prints with the controls hidden', async ({ page }) => {
		await page.evaluate(() => {
			window.print = () => document.body.setAttribute('data-printed', 'true');
		});
		await page.getByRole('button', { name: 'Imprimir' }).click();
		await expect(page.locator('body')).toHaveAttribute('data-printed', 'true');

		await page.emulateMedia({ media: 'print' });
		await expect(page.getByRole('button', { name: 'Nuevo evento' })).toBeHidden();
		await expect(page.getByRole('navigation', { name: 'Demos' })).toBeHidden();
		await expect(title(page)).toBeVisible();
		await expect(page.getByText('Conferencia en Cusco')).toBeVisible();
	});
});

test.describe('languages and directions', () => {
	test('counts use plural rules: "1 evento", "3 eventos"', async ({ page }) => {
		await viewButton(page, 'año').click();
		await expect(
			page.getByRole('button', { name: 'martes, 17 de noviembre de 2026, 1 evento' })
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'miércoles, 18 de noviembre de 2026, 3 eventos' })
		).toBeVisible();
	});

	test('right-to-left pages drag toward the next day and mirror the gantt', async ({ page }) => {
		await page.evaluate(() => (document.documentElement.dir = 'rtl'));
		await viewButton(page, 'semana').click();

		// In RTL the next day is on the left.
		const workshop = page.getByRole('button', { name: /Svelte workshop/ });
		await workshop.scrollIntoViewIfNeeded();
		const box = (await workshop.boundingBox())!;
		await page.mouse.move(box.x + box.width / 2, box.y + 20);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width / 2 - box.width / 2, box.y + 20, { steps: 5 });
		await page.mouse.move(box.x + box.width / 2 - box.width, box.y + 20, { steps: 5 });
		await page.mouse.up();
		await page.getByRole('button', { name: 'jueves, 19 de noviembre de 2026' }).click();
		await expect(page.getByRole('button', { name: /Svelte workshop/ })).toContainText(
			'3:00 – 6:00 p. m.'
		);

		await viewButton(page, 'Gantt').click();
		const analysis = (await page.getByRole('button', { name: /^Análisis/ }).boundingBox())!;
		const design = (await page.getByRole('button', { name: /^Diseño/ }).boundingBox())!;
		expect(analysis.x).toBeGreaterThan(design.x);
		await expect(page.locator('svg path[marker-end]')).toHaveCount(3);
	});
});

test('the documentation covers every block and links its sections', async ({ page }) => {
	await page.goto('/docs');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('calendar-kit');
	const docs = page.getByRole('navigation', { name: 'Documentation' });
	await docs.getByRole('link', { name: 'Blocks' }).click();
	for (const item of [
		'calendar',
		'month-view',
		'time-grid',
		'agenda-view',
		'year-view',
		'timeline-view',
		'gantt-view',
		'event-dialog',
		'recurrence-editor',
		'import-export'
	]) {
		await expect(page.getByRole('heading', { level: 2, name: item, exact: true })).toBeVisible();
	}
	await expect(docs.getByRole('link', { name: 'Blocks' })).toHaveAttribute('aria-current', 'page');
	await expect(
		page.getByRole('navigation', { name: 'Demos' }).getByRole('link', { name: 'Documentación' })
	).toHaveAttribute('aria-current', 'page');
});

test('the documentation sections are reachable on a phone', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/docs');
	const docs = page.getByRole('navigation', { name: 'Documentation' });
	await docs.getByRole('link', { name: 'State and hooks' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('State and hooks');
});
