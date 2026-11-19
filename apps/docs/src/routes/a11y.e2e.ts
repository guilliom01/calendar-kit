import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// WCAG 2.1 A and AA rules from axe-core, on every view, the dialog and every demo page.
const scan = async (page: Page) =>
  (
    await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
  ).violations.map((violation) => `${violation.id}: ${violation.nodes[0]?.target.join(" ")}`);

for (const colorScheme of ["light", "dark"] as const) {
  test(`no WCAG 2.1 AA violations in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.clock.setFixedTime(new Date("2026-11-17T14:00:00-05:00"));
    await page.goto("/");

    for (const view of [
      "mes",
      "semana",
      "día",
      "Agenda",
      "año",
      "Línea de tiempo",
      "Recursos",
      "Gantt",
    ]) {
      await page.getByRole("button", { name: view, exact: true }).click();
      expect(await scan(page), view).toEqual([]);
    }

    await page.getByRole("button", { name: "mes", exact: true }).click();
    await page.getByRole("button", { name: /2 eventos más/ }).click();
    expect(await scan(page), "+N popover").toEqual([]);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: /Svelte workshop/ }).click();
    expect(await scan(page), "event dialog").toEqual([]);

    for (const path of [
      "/minimo",
      "/ganchos",
      "/carga",
      "/personalizar",
      "/asistente",
      "/docs",
      "/docs/blocks",
      "/docs/state",
      "/docs/recurrence",
      "/docs/import-export",
      "/docs/i18n-a11y",
    ]) {
      await page.goto(path);
      expect(await scan(page), path).toEqual([]);
    }
  });
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`no WCAG 2.1 AA violations on a phone in ${colorScheme} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme });
    await page.clock.setFixedTime(new Date("2026-11-17T14:00:00-05:00"));
    await page.goto("/");
    // The compact month, with a day's list open, and the view select.
    await page
      .getByRole("button", { name: "miércoles, 18 de noviembre de 2026, 3 eventos" })
      .and(page.locator(":not([data-mini-date])"))
      .click();
    expect(await scan(page), "compact month").toEqual([]);
  });
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`validation messages pass WCAG 2.1 AA in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.clock.setFixedTime(new Date("2026-11-17T14:00:00-05:00"));
    await page.goto("/");
    await page.getByRole("button", { name: /Svelte workshop/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Fin", { exact: true }).first().fill("2026-11-10");
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(dialog.getByText("El fin debe ser posterior al inicio.")).toBeVisible();
    expect(await scan(page), "dialog with an error").toEqual([]);
  });
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`the docs examples pass WCAG 2.1 AA in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.clock.setFixedTime(new Date("2026-11-17T14:00:00-05:00"));
    for (const path of [
      "/docs/examples",
      "/docs/examples/basic",
      "/docs/examples/events",
      "/docs/examples/views",
      "/docs/examples/editing",
      "/docs/examples/recurring",
      "/docs/examples/time-zones",
      "/docs/examples/resources",
      "/docs/examples/gantt",
      "/docs/examples/calendars",
      "/docs/examples/search",
      "/docs/examples/context-menu",
      "/docs/examples/event-preview",
      "/docs/examples/mini-calendar",
      "/docs/examples/external-drag",
      "/docs/examples/scheduling-assistant",
      "/docs/examples/loading",
      "/docs/examples/saving",
      "/docs/examples/hooks",
      "/docs/examples/permissions",
      "/docs/examples/custom-rendering",
      "/docs/examples/import-export",
      "/docs/examples/validation",
      "/docs/examples/languages",
      "/docs/examples/mobile",
      "/docs/examples/own-ui",
    ]) {
      await page.goto(path);
      expect(await scan(page), path).toEqual([]);
    }
  });
}
