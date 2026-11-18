import { expect, test, type Page } from "@playwright/test";

// Tuesday 2026-11-17, 14:00 in Lima, as in the other end-to-end tests.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-17T14:00:00-05:00"));
});

const example = (page: Page) => page.getByRole("region", { name: "Live example" });
const title = (page: Page) => example(page).getByRole("heading", { level: 2 });
const open = (page: Page, slug: string) => page.goto(`/docs/examples/${slug}`);

test("the examples index links every example", async ({ page }) => {
  await page.goto("/docs/examples");
  for (const name of ["Basic", "Events", "Views", "Editing"]) {
    await expect(page.getByRole("link", { name: new RegExp(`^${name}`) })).toBeVisible();
  }
});

test("each example shows the code a user writes, not this repository's paths", async ({ page }) => {
  await open(page, "basic");
  const code = page.locator("pre code");
  await expect(code).toContainText('from "#lib/components/ui/full-calendar/index.js"');
  await expect(code).not.toContainText("registry");
  await page.getByRole("link", { name: "Events →" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Events");
});

test("basic: a month with no events", async ({ page }) => {
  await open(page, "basic");
  await expect(title(page)).toHaveText("noviembre de 2026");
  await expect(example(page).locator("[data-event-id]")).toHaveCount(0);
});

test("events: read-only events, and a button that adds random ones", async ({ page }) => {
  await open(page, "events");
  const events = example(page).locator("[data-event-id]");
  await expect(events).toHaveCount(2);
  // Read-only: no keyboard move mode is offered.
  await expect(events.first()).not.toHaveAttribute("aria-keyshortcuts");

  await example(page).getByRole("button", { name: "Agregar evento aleatorio" }).click();
  await expect(events).toHaveCount(3);
});

test("views: the switcher moves between month, week, agenda and year", async ({ page }) => {
  await open(page, "views");
  const views = example(page).getByRole("group", { name: "Vistas" });
  await views.getByRole("button", { name: "semana", exact: true }).click();
  await expect(title(page)).toContainText("15");
  await views.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(example(page).getByRole("button", { name: /Daily standup/ })).toBeVisible();
  await views.getByRole("button", { name: "año", exact: true }).click();
  await expect(title(page)).toHaveText("2026");
});

test("editing: create an event, then undo it", async ({ page }) => {
  await open(page, "editing");
  await example(page).getByRole("button", { name: "Nuevo evento" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Título").fill("Clase de cerámica");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(example(page).getByRole("button", { name: /Clase de cerámica/ })).toBeVisible();

  await example(page).getByRole("button", { name: "Deshacer" }).click();
  await expect(example(page).getByRole("button", { name: /Clase de cerámica/ })).toHaveCount(0);
});
