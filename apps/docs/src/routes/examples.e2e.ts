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
  for (const name of [
    "Basic",
    "Events",
    "Views",
    "Editing",
    "Recurring events",
    "Time zones",
    "Resources",
    "Gantt",
    "Calendars",
    "Search and filters",
    "Context menu",
    "Event preview",
    "Mini calendar",
    "External drag",
    "Scheduling assistant",
    "Loading on demand",
  ]) {
    // Inside the list: the docs menu also has a "Recurring events" page.
    await expect(
      page.locator("ol").getByRole("link", { name: new RegExp(`^${name}`) }),
    ).toBeVisible();
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

test("recurring: a weekly series, and changing one occurrence asks for its scope", async ({
  page,
}) => {
  await open(page, "recurring");
  await example(page).getByRole("button", { name: "semana", exact: true }).click();
  const classes = example(page).getByRole("button", { name: /Clase de inglés/ });
  await expect(classes).toHaveCount(2);
  await classes.first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Título").fill("Clase de inglés (aula 3)");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Editar evento recurrente" }),
  ).toBeVisible();
});

test("time zones: the same event moves on screen with the calendar's zone", async ({ page }) => {
  await open(page, "time-zones");
  const madrid = example(page).getByRole("button", { name: /Llamada con Madrid/ });
  await expect(madrid).toContainText("10:00 – 11:00 a. m.");
  await example(page).getByRole("combobox", { name: "Zona horaria" }).selectOption("Europe/Madrid");
  await expect(madrid).toContainText("4:00 – 5:00 p. m.");
});

test("resources: columns per resource, and rows in the timeline", async ({ page }) => {
  await open(page, "resources");
  await expect(example(page).getByText("Sala A", { exact: true })).toBeVisible();
  // One event, two resources (Sala B and Luis): it shows in both columns.
  await expect(example(page).getByRole("button", { name: /Demo al cliente/ })).toHaveCount(2);
  await example(page).getByRole("button", { name: "Línea de tiempo", exact: true }).click();
  await expect(example(page).getByRole("button", { name: "Equipo", exact: true })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
});

test("gantt: tasks with progress and dependency arrows", async ({ page }) => {
  await open(page, "gantt");
  await expect(example(page).locator("[data-event-id]")).toHaveCount(4);
  await expect(example(page).locator("svg path[marker-end]")).toHaveCount(3);
});

test("calendars: hiding a calendar hides its events", async ({ page }) => {
  await open(page, "calendars");
  await expect(example(page).getByRole("button", { name: "Feriado" })).toBeVisible();
  await example(page).getByRole("checkbox", { name: "Feriados" }).click();
  await expect(example(page).getByRole("button", { name: "Feriado" })).toHaveCount(0);
});

test("search: typed words and a custom filter narrow every view", async ({ page }) => {
  await open(page, "search");
  await example(page).getByRole("searchbox", { name: "Buscar eventos" }).fill("ALMUERZO");
  await expect(example(page).getByRole("button", { name: /Almuerzo con el equipo/ })).toBeVisible();
  await expect(example(page).getByRole("button", { name: /Daily standup/ })).toHaveCount(0);

  await example(page).getByRole("searchbox", { name: "Buscar eventos" }).fill("");
  await expect(
    example(page)
      .getByRole("button", { name: /Viaje a Cusco/ })
      .first(),
  ).toBeVisible();
  await example(page).getByRole("checkbox", { name: "Solo con hora" }).check();
  await expect(example(page).getByRole("button", { name: /Viaje a Cusco/ })).toHaveCount(0);
});

test("context menu: a built-in menu with an item of our own", async ({ page }) => {
  await open(page, "context-menu");
  await example(page)
    .getByRole("button", { name: /Daily standup/ })
    .click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "Duplicar" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Compartir" }).click();
  await expect(example(page).getByText("Compartiste «Daily standup».")).toBeVisible();
});

test("event preview: hovering shows the place and notes", async ({ page }) => {
  await open(page, "event-preview");
  await example(page)
    .getByRole("button", { name: /Daily standup/ })
    .hover();
  await expect(page.getByRole("tooltip")).toContainText("Sala Miraflores");
  await expect(page.getByRole("tooltip")).toContainText("Traer laptop.");
});

test("mini calendar: a click jumps the calendar to that date", async ({ page }) => {
  await open(page, "mini-calendar");
  await example(page).getByRole("button", { name: "diciembre de 2026", exact: true }).click();
  await example(page)
    .getByRole("grid", { name: "diciembre de 2026" })
    .getByRole("button", { name: /^jueves, 10 de diciembre de 2026/ })
    .click();
  await expect(title(page)).toContainText("dic.");
});

test("external drag: a task dropped on the hours becomes an event and leaves the list", async ({
  page,
}) => {
  await open(page, "external-drag");
  const task = example(page)
    .getByRole("list", { name: "Pendientes" })
    .getByText("Llamar al proveedor");
  const from = (await task.boundingBox())!;
  const column = (await example(page).locator('[data-time-column="2026-11-18"]').boundingBox())!;
  const [x, y] = [column.x + column.width / 2, column.y + (column.height * 10) / 24 + 2];
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(x - 20, y - 20, { steps: 5 });
  await page.mouse.move(x, y, { steps: 5 });
  await page.mouse.up();

  await expect(example(page).getByRole("button", { name: /Llamar al proveedor/ })).toContainText(
    "10:00 – 10:30 a. m.",
  );
  await expect(
    example(page).getByRole("list", { name: "Pendientes" }).getByText("Llamar al proveedor"),
  ).toHaveCount(0);
});

test("scheduling assistant: a free time for two people opens as a new event", async ({ page }) => {
  await open(page, "scheduling-assistant");
  const people = example(page).getByRole("group", { name: "Participantes" });
  await people.getByRole("checkbox", { name: "Ana" }).check();
  await people.getByRole("checkbox", { name: "Luis" }).check();
  const first = example(page)
    .getByRole("list", { name: "Horarios sugeridos" })
    .getByRole("button")
    .first();
  // Now is Tuesday 14:00 and both are free for the rest of the day.
  await expect(first).toContainText("martes, 17 de noviembre");
  await expect(first).toContainText("2:00");
  await first.click();
  await expect(page.getByRole("dialog").getByRole("checkbox", { name: "Luis" })).toBeChecked();
});

test("loading: months are requested once, with their neighbours", async ({ page }) => {
  await open(page, "loading");
  await expect(example(page).locator("[data-event-id]").first()).toBeVisible();
  const requests = example(page).getByText(/^Meses pedidos:/);
  await expect(requests).toContainText("2026-11");
  await expect(requests).toContainText("2026-12");
  await expect(requests).toContainText("2026-10");
  await example(page).getByRole("button", { name: "el próximo mes" }).click();
  await expect(requests).toContainText("2027-01");
  // December was already preloaded, so it is not asked for again.
  await expect(requests).not.toContainText(/2026-12.*2026-12/);
});
