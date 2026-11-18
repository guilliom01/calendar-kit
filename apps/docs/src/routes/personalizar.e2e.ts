import { expect, test, type Page } from '@playwright/test';

// Tuesday 2026-11-17, 14:00 in Lima. The page has no confirmation dialog, so changes save at once.
test.beforeEach(async ({ page }) => {
	await page.clock.setFixedTime(new Date('2026-11-17T14:00:00-05:00'));
	await page.goto('/personalizar');
});

async function drag(page: Page, x: number, y: number, dx: number, dy: number) {
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 5 });
	await page.mouse.move(x + dx, y + dy, { steps: 5 });
	await page.mouse.up();
}

const holiday = (page: Page) => page.getByTestId('custom-event').filter({ hasText: 'Feriado' });

test('the month view renders our own event, day cell and "+N" elements', async ({ page }) => {
	await expect(holiday(page)).toHaveClass(/rounded-full/);
	await expect(page.locator('[data-date="2026-11-24"]').getByTestId('holiday-mark')).toBeVisible();

	await page.getByTestId('custom-more').first().click();
	await expect(page.getByRole('dialog')).toBeVisible();
});

test('custom events keep clicks, dragging and keyboard moves', async ({ page }) => {
	await holiday(page).click();
	await expect(page.getByTestId('opened')).toHaveText('Abriste: Feriado');

	const from = (await holiday(page).boundingBox())!;
	const target = (await page.locator('[data-date="2026-11-26"]').boundingBox())!;
	await drag(
		page,
		from.x + 10,
		from.y + from.height / 2,
		target.x + target.width / 2 - from.x - 10,
		0
	);
	await expect(page.locator('[data-date="2026-11-26"]').getByTestId('holiday-mark')).toBeVisible();

	await holiday(page).focus();
	await page.keyboard.press('m');
	await page.keyboard.press('ArrowRight');
	await page.keyboard.press('Enter');
	await expect(page.locator('[data-date="2026-11-27"]').getByTestId('holiday-mark')).toBeVisible();
	await expect(holiday(page)).toBeFocused();
});

test('the time grid renders our own events, hour labels, now line and resize handle', async ({
	page
}) => {
	await page.getByRole('button', { name: 'semana', exact: true }).click();
	await expect(page.getByText('09:00', { exact: true })).toBeVisible();
	await expect(page.getByTestId('custom-now')).toBeVisible();

	const lunch = page.getByTestId('custom-timed').filter({ hasText: 'Almuerzo con el equipo' });
	await expect(lunch).toHaveAttribute('title', 'Almuerzo con el equipo');
	const before = (await lunch.boundingBox())!.height;
	const handle = (await lunch.getByTestId('custom-resize').boundingBox())!;
	await drag(page, handle.x + handle.width / 2, handle.y + handle.height / 2, 0, 48);
	await expect.poll(async () => (await lunch.boundingBox())!.height).toBeGreaterThan(before + 40);
});

test('the timeline renders our own resource labels, and groups still collapse', async ({
	page
}) => {
	await page.getByRole('button', { name: 'Línea de tiempo', exact: true }).click();
	const team = page.getByRole('button', { name: 'Equipo', exact: true });
	await expect(team).toHaveAttribute('aria-expanded', 'true');
	await expect(page.locator('[data-resource="ana"]').first()).toBeVisible();
	await team.click();
	await expect(team).toHaveAttribute('aria-expanded', 'false');
	await expect(page.locator('[data-resource="ana"]').first()).toBeHidden();
});
