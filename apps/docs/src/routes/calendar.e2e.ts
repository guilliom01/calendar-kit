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
		let box = (await workshop.boundingBox())!;
		await drag(page, box.x + box.width / 2, box.y + 20, 0, HOUR);
		await expect(workshop).toContainText('4:00 – 7:00 p. m.');

		const lunch = page.getByRole('button', { name: /Almuerzo/ });
		box = (await lunch.boundingBox())!;
		await drag(page, box.x + box.width / 2, box.y + box.height - 3, 0, HOUR);
		await expect(lunch).toContainText('1:00 – 3:30 p. m.');

		// One column to the right: Wednesday 18 -> Thursday 19.
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

	test('a new event can repeat every week', async ({ page }) => {
		await page.getByRole('button', { name: 'Nuevo evento' }).click();
		await dialog(page).getByLabel('Título').fill('Gimnasio');
		await dialog(page).getByLabel('Repetir').selectOption({ label: 'Cada semana el martes' });
		await dialog(page).getByRole('button', { name: 'Guardar' }).click();

		await viewButton(page, 'semana').click();
		await page.getByRole('button', { name: 'la próxima semana' }).click();
		await expect(page.getByRole('button', { name: /Gimnasio/ })).toContainText('3:00 – 4:00 p. m.');
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
