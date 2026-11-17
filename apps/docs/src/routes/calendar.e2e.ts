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
	// Friday has 5 events: 2 visible lanes after the bar, the rest collapsed.
	await expect(page.getByRole('button', { name: '+3' })).toBeVisible();
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
