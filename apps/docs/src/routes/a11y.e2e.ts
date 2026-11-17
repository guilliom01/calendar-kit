import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// WCAG 2.1 A and AA rules from axe-core, on every view, the dialog and every demo page.
const scan = async (page: Page) =>
	(
		await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
	).violations.map((violation) => `${violation.id}: ${violation.nodes[0]?.target.join(' ')}`);

for (const colorScheme of ['light', 'dark'] as const) {
	test(`no WCAG 2.1 AA violations in ${colorScheme} mode`, async ({ page }) => {
		await page.emulateMedia({ colorScheme });
		await page.clock.setFixedTime(new Date('2026-11-17T14:00:00-05:00'));
		await page.goto('/');

		for (const view of [
			'mes',
			'semana',
			'día',
			'Agenda',
			'año',
			'Línea de tiempo',
			'Recursos',
			'Gantt'
		]) {
			await page.getByRole('button', { name: view, exact: true }).click();
			expect(await scan(page), view).toEqual([]);
		}

		await page.getByRole('button', { name: 'mes', exact: true }).click();
		await page.getByRole('button', { name: /Svelte workshop/ }).click();
		expect(await scan(page), 'event dialog').toEqual([]);

		for (const path of [
			'/minimo',
			'/ganchos',
			'/carga',
			'/docs',
			'/docs/blocks',
			'/docs/state',
			'/docs/recurrence',
			'/docs/import-export',
			'/docs/i18n-a11y'
		]) {
			await page.goto(path);
			expect(await scan(page), path).toEqual([]);
		}
	});
}
