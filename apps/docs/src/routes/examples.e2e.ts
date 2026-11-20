import { expect, test, type Locator, type Page } from "@playwright/test";

// Tuesday 2026-11-17, 14:00 in Lima, as in the other end-to-end tests.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-17T14:00:00-05:00"));
});

const example = (page: Page) => page.getByRole("region", { name: "Live example" });
const title = (page: Page) => example(page).getByRole("heading", { level: 2 });
const open = (page: Page, slug: string) => page.goto(`/docs/examples/${slug}`);
const center = async (locator: Locator) => {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};
/** Drags from the center of `from` to (x, y) in small steps. */
async function dragTo(page: Page, from: Locator, x: number, y: number) {
  const start = await center(from);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move((start.x + x) / 2, (start.y + y) / 2, { steps: 5 });
  await page.mouse.move(x, y, { steps: 5 });
  await page.mouse.up();
}
/** A month day cell of the live example. */
const cell = (page: Page, date: string) => example(page).locator(`[data-date="${date}"]`);
/** The event is drawn inside the day cell of `date`. */
async function expectIn(page: Page, event: Locator, date: string) {
  const chip = await center(event);
  const box = (await cell(page, date).boundingBox())!;
  expect(chip.x).toBeGreaterThan(box.x);
  expect(chip.x).toBeLessThan(box.x + box.width);
  expect(chip.y).toBeGreaterThan(box.y);
  expect(chip.y).toBeLessThan(box.y + box.height);
}

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
    "Saving and conflicts",
    "Hooks",
    "Permissions and styles",
    "Custom rendering",
    "Import and export",
    "Validation",
    "Languages and RTL",
    "Mobile",
    "Your own UI",
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
  await expect(title(page)).toHaveText("November 2026");
  await expect(example(page).locator("[data-event-id]")).toHaveCount(0);
});

test("events: read-only events, and a button that adds random ones", async ({ page }) => {
  await open(page, "events");
  const events = example(page).locator("[data-event-id]");
  await expect(events).toHaveCount(2);
  // Read-only: no keyboard move mode is offered.
  await expect(events.first()).not.toHaveAttribute("aria-keyshortcuts");

  await example(page).getByRole("button", { name: "Add a random event" }).click();
  await expect(events).toHaveCount(3);
});

test("views: the switcher moves between month, week, agenda and year", async ({ page }) => {
  await open(page, "views");
  const views = example(page).getByRole("group", { name: "Views" });
  await views.getByRole("button", { name: "week", exact: true }).click();
  await expect(title(page)).toContainText("15");
  await views.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(example(page).getByRole("button", { name: /Daily standup/ })).toBeVisible();
  await views.getByRole("button", { name: "year", exact: true }).click();
  await expect(title(page)).toHaveText("2026");
});

test("editing: create an event, then undo it", async ({ page }) => {
  await open(page, "editing");
  await example(page).getByRole("button", { name: "New event" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Pottery class");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(example(page).getByRole("button", { name: /Pottery class/ })).toBeVisible();

  await example(page).getByRole("button", { name: "Undo" }).click();
  await expect(example(page).getByRole("button", { name: /Pottery class/ })).toHaveCount(0);
});

test("recurring: a weekly series, and changing one occurrence asks for its scope", async ({
  page,
}) => {
  await open(page, "recurring");
  await example(page).getByRole("button", { name: "week", exact: true }).click();
  const classes = example(page).getByRole("button", { name: /English class/ });
  await expect(classes).toHaveCount(2);
  await classes.first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("English class (room 3)");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Edit recurring event" }),
  ).toBeVisible();
});

test("time zones: the same event moves on screen with the calendar's zone", async ({ page }) => {
  await open(page, "time-zones");
  const madrid = example(page).getByRole("button", { name: /Call with Madrid/ });
  await expect(madrid).toContainText("10:00 – 11:00 AM");
  await example(page).getByRole("combobox", { name: "Time zone" }).selectOption("Europe/Madrid");
  await expect(madrid).toContainText("4:00 – 5:00 PM");
});

test("resources: columns per resource, and rows in the timeline", async ({ page }) => {
  await open(page, "resources");
  await expect(example(page).getByText("Room A", { exact: true })).toBeVisible();
  // One event, two resources (Room B and Luis): it shows in both columns.
  await expect(example(page).getByRole("button", { name: /Client demo/ })).toHaveCount(2);
  await example(page).getByRole("button", { name: "Timeline", exact: true }).click();
  await expect(example(page).getByRole("button", { name: "Team", exact: true })).toHaveAttribute(
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
  await expect(example(page).getByRole("button", { name: "Holiday" })).toBeVisible();
  await example(page).getByRole("checkbox", { name: "Holidays" }).click();
  await expect(example(page).getByRole("button", { name: "Holiday" })).toHaveCount(0);
});

test("search: typed words and a custom filter narrow every view", async ({ page }) => {
  await open(page, "search");
  await example(page).getByRole("searchbox", { name: "Search events" }).fill("LÚNCH");
  await expect(example(page).getByRole("button", { name: /Team lunch/ })).toBeVisible();
  await expect(example(page).getByRole("button", { name: /Daily standup/ })).toHaveCount(0);

  await example(page).getByRole("searchbox", { name: "Search events" }).fill("");
  await expect(
    example(page)
      .getByRole("button", { name: /Trip to Cusco/ })
      .first(),
  ).toBeVisible();
  await example(page).getByRole("checkbox", { name: "Timed only" }).check();
  await expect(example(page).getByRole("button", { name: /Trip to Cusco/ })).toHaveCount(0);
});

test("context menu: a built-in menu with an item of our own", async ({ page }) => {
  await open(page, "context-menu");
  await example(page)
    .getByRole("button", { name: /Daily standup/ })
    .click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "Duplicate" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Share" }).click();
  await expect(example(page).getByText(`You shared "Daily standup".`)).toBeVisible();
});

test("event preview: hovering shows the place and notes", async ({ page }) => {
  await open(page, "event-preview");
  await example(page)
    .getByRole("button", { name: /Daily standup/ })
    .hover();
  await expect(page.getByRole("tooltip")).toContainText("Room Miraflores");
  await expect(page.getByRole("tooltip")).toContainText("Bring a laptop.");
});

test("mini calendar: a click jumps the calendar to that date", async ({ page }) => {
  await open(page, "mini-calendar");
  await example(page).getByRole("button", { name: "December 2026", exact: true }).click();
  await example(page)
    .getByRole("grid", { name: "December 2026" })
    .getByRole("button", { name: /^Thursday, December 10, 2026/ })
    .click();
  await expect(title(page)).toContainText("Dec");
});

test("external drag: a task dropped on the hours becomes an event and leaves the list", async ({
  page,
}) => {
  await open(page, "external-drag");
  const task = example(page)
    .getByRole("list", { name: "Unscheduled" })
    .getByText("Call the supplier");
  const from = (await task.boundingBox())!;
  const column = (await example(page).locator('[data-time-column="2026-11-18"]').boundingBox())!;
  const [x, y] = [column.x + column.width / 2, column.y + (column.height * 10) / 24 + 2];
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(x - 20, y - 20, { steps: 5 });
  await page.mouse.move(x, y, { steps: 5 });
  await page.mouse.up();

  await expect(example(page).getByRole("button", { name: /Call the supplier/ })).toContainText(
    // 30 minutes: one line with the start time.
    "10:00 AM",
  );
  await expect(
    example(page).getByRole("list", { name: "Unscheduled" }).getByText("Call the supplier"),
  ).toHaveCount(0);
});

test("scheduling assistant: a free time for two people opens as a new event", async ({ page }) => {
  await open(page, "scheduling-assistant");
  const people = example(page).getByRole("group", { name: "Participants" });
  await people.getByRole("checkbox", { name: "Ana" }).check();
  await people.getByRole("checkbox", { name: "Luis" }).check();
  await example(page).getByLabel("Duration").selectOption({ label: "60 minutes" });
  const first = example(page)
    .getByRole("list", { name: "Suggested times" })
    .getByRole("button")
    .first();
  // Now is Tuesday 14:00; Luis has lunch until 14:30.
  await expect(first).toContainText("Tuesday, November 17");
  await expect(first).toContainText("2:30");
  await first.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "New event" })).toBeVisible();
  await expect(dialog.getByRole("checkbox", { name: "Ana" })).toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: "Luis" })).toBeChecked();
});

test("loading: months are requested once, with their neighbours", async ({ page }) => {
  await open(page, "loading");
  await expect(example(page).locator("[data-event-id]").first()).toBeVisible();
  const requests = example(page).getByText(/^Months requested:/);
  await expect(requests).toContainText("2026-11");
  await expect(requests).toContainText("2026-12");
  await expect(requests).toContainText("2026-10");
  await example(page).getByRole("button", { name: "Next month" }).click();
  await expect(requests).toContainText("2027-01");
  // December was already preloaded, so it is not asked for again.
  await expect(requests).not.toContainText(/2026-12.*2026-12/);
});

test("saving: saved, rolled back on an error, or replaced on a conflict", async ({ page }) => {
  await open(page, "saving");
  const status = example(page).getByRole("status");
  const rename = async (from: RegExp, to: string) => {
    await example(page).getByRole("button", { name: from }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Title").fill(to);
    await dialog.getByRole("button", { name: "Save" }).click();
  };

  await rename(/Daily standup/, "Standup");
  await expect(status).toHaveText("Saved: update");

  await example(page).getByRole("combobox", { name: "Server" }).selectOption("error");
  await rename(/Standup/, "Never arrives");
  await expect(status).toHaveText("Could not save: the change was undone.");
  await expect(example(page).getByRole("button", { name: /Standup/ })).toBeVisible();

  await example(page).getByRole("combobox", { name: "Server" }).selectOption("conflict");
  await rename(/Standup/, "Mine");
  await expect(status).toHaveText("Someone else changed it first: showing their version.");
  await expect(
    example(page).getByRole("button", { name: /Standup \(someone else\)/ }),
  ).toBeVisible();
});

test("hooks: our own reactions replace the built-in ones", async ({ page }) => {
  await open(page, "hooks");
  const status = example(page).getByRole("status");
  await example(page)
    .getByRole("button", { name: /Daily standup/ })
    .click();
  await expect(status).toHaveText("Opened: Daily standup");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await example(page).getByRole("button", { name: "Wednesday, November 18, 2026" }).click();
  await expect(status).toHaveText("Day: 2026-11-18");
  await expect(title(page)).toHaveText("November 2026");
  // Only the month view is mounted, and nothing else.
  await expect(example(page).getByRole("group", { name: "Views" })).toHaveCount(0);
  await expect(example(page).getByRole("button", { name: "New event" })).toHaveCount(0);
});

test("hooks: onEventChange vetoes Sundays, with the mouse and the keyboard", async ({ page }) => {
  await open(page, "hooks");
  const status = example(page).getByRole("status");
  const standup = example(page).getByRole("button", { name: /Daily standup/ });
  const to = async (date: string) => {
    const box = (await cell(page, date).boundingBox())!;
    return [box.x + box.width / 2, box.y + box.height / 2] as const;
  };

  await dragTo(page, standup, ...(await to("2026-11-22")));
  await expect(status).toHaveText("No work on Sundays.");
  await expectIn(page, standup, "2026-11-17");

  // Without a confirmation dialog mounted, the change applies at once.
  await dragTo(page, standup, ...(await to("2026-11-26")));
  await expect(status).toHaveText("Moved: Daily standup");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expectIn(page, standup, "2026-11-26");

  // Thursday 26 to Sunday 22 with the keyboard.
  await standup.focus();
  await page.keyboard.press("m");
  for (let day = 0; day < 4; day++) await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await expect(status).toHaveText("No work on Sundays.");
  await expectIn(page, standup, "2026-11-26");
});

test("hooks: onSelect, onMoreClick, onEventContextMenu and onExternalDrop", async ({ page }) => {
  await open(page, "hooks");
  const status = example(page).getByRole("status");

  const empty = (await cell(page, "2026-11-27").boundingBox())!;
  await page.mouse.click(empty.x + empty.width / 2, empty.y + empty.height - 8);
  await expect(status).toHaveText("Selected: 2026-11-27");

  // Friday 20: the trip and four meetings.
  await example(page)
    .getByRole("button", { name: /more events?, Friday, November 20, 2026/ })
    .click();
  await expect(status).toHaveText("More on 2026-11-20: 5");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await example(page)
    .getByRole("button", { name: /Daily standup/ })
    .click({ button: "right" });
  await expect(status).toHaveText("Our own menu for: Daily standup");
  await expect(page.getByRole("menu")).toHaveCount(0);

  const target = (await cell(page, "2026-11-26").boundingBox())!;
  await dragTo(
    page,
    example(page).getByText("Task without a date"),
    target.x + target.width / 2,
    target.y + target.height - 10,
  );
  await expect(status).toHaveText(`Dropped "Task without a date" on 2026-11-26`);
  await expect(example(page).getByRole("button", { name: "Task without a date" })).toHaveCount(0);
});

test("permissions: fixed, move-only and dashed events", async ({ page }) => {
  await open(page, "permissions");
  await expect(example(page).getByRole("button", { name: "Holiday" })).not.toHaveAttribute(
    "aria-keyshortcuts",
  );
  const booking = example(page).getByRole("button", { name: /Room booking/ });
  await booking.focus();
  await page.keyboard.press("Delete");
  await expect(booking).toBeVisible();
  // Move-only: Shift+arrows (length) do nothing, plain arrows move it.
  await page.keyboard.press("m");
  await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("Enter");
  await expect(booking).toContainText("11:00 AM – 12:00 PM");
  await booking.focus();
  await page.keyboard.press("m");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(booking).toContainText("11:15 AM – 12:15 PM");

  const editable = example(page).getByRole("button", { name: /Editable/ });
  await editable.focus();
  await page.keyboard.press("Delete");
  await expect(editable).toHaveCount(0);
  await expect(example(page).getByRole("button", { name: /Tentative/ })).toHaveClass(
    /border-dashed/,
  );
});

test("custom rendering: our own event pills and day marks", async ({ page }) => {
  await open(page, "custom-rendering");
  await expect(example(page).getByRole("button", { name: /Daily standup/ })).toHaveClass(
    /rounded-full/,
  );
  await expect(example(page).getByText("weekend").first()).toBeVisible();
});

test("custom rendering: our own events keep clicks, dragging and keyboard moves", async ({
  page,
}) => {
  await open(page, "custom-rendering");
  const lunch = example(page).getByRole("button", { name: /Team lunch/ });
  await lunch.click();
  await expect(page.getByRole("dialog").getByLabel("Title")).toHaveValue("Team lunch");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const target = await center(cell(page, "2026-11-26"));
  await dragTo(page, lunch, target.x, target.y);
  await expectIn(page, lunch, "2026-11-26");

  await lunch.focus();
  await page.keyboard.press("m");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expectIn(page, lunch, "2026-11-27");
  await expect(lunch).toBeFocused();
});

test('custom rendering: our own "+N" opens the built-in list, even without a day view', async ({
  page,
}) => {
  await open(page, "custom-rendering");
  await example(page)
    .getByRole("button", { name: /^See \d+ more$/ })
    .click();
  const list = page.getByRole("dialog");
  for (const name of ["Trip to Cusco", "Planning", "Retro", "One on one", "Coffee"]) {
    await expect(list.getByRole("button", { name: new RegExp(name) })).toBeVisible();
  }
  await list.getByRole("button", { name: /Coffee/ }).click();
  await expect(page.getByRole("dialog").getByLabel("Title")).toHaveValue("Coffee");
});

test("custom rendering: our own preview content", async ({ page }) => {
  await open(page, "custom-rendering");
  await example(page)
    .getByRole("button", { name: /Daily standup/ })
    .hover();
  await expect(page.getByRole("tooltip")).toHaveText("Our own preview: Daily standup");
});

test("custom rendering: our own time grid events, hour labels, now line and resize handle", async ({
  page,
}) => {
  await open(page, "custom-rendering");
  await example(page).getByRole("button", { name: "week", exact: true }).click();
  await expect(example(page).getByText("09:00", { exact: true })).toBeVisible();
  await expect(example(page).getByTestId("now")).toBeVisible();

  const lunch = example(page).getByRole("button", { name: /Team lunch/ });
  await lunch.scrollIntoViewIfNeeded();
  const before = (await lunch.boundingBox())!.height;
  const handle = await center(lunch.getByTestId("resize-end"));
  await dragTo(page, lunch.getByTestId("resize-end"), handle.x, handle.y + 48);
  await expect.poll(async () => (await lunch.boundingBox())!.height).toBeGreaterThan(before + 40);
});

test("custom rendering: our own resource labels, and groups still collapse", async ({ page }) => {
  await open(page, "custom-rendering");
  await example(page).getByRole("button", { name: "Timeline", exact: true }).click();
  const team = example(page).getByRole("button", { name: "Team", exact: true });
  await expect(team).toHaveAttribute("aria-expanded", "true");
  await expect(example(page).locator('[data-resource="ana"]').first()).toBeVisible();
  await team.click();
  await expect(team).toHaveAttribute("aria-expanded", "false");
  await expect(example(page).locator('[data-resource="ana"]').first()).toBeHidden();
});

test("import and export: an .ics file comes in, an Excel workbook goes out", async ({ page }) => {
  await open(page, "import-export");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:from-google",
    "SUMMARY:Rosa's birthday",
    "DTSTART;VALUE=DATE:20261126",
    "DTEND;VALUE=DATE:20261127",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  await example(page)
    .locator('input[type="file"]')
    .setInputFiles({ name: "google.ics", mimeType: "text/calendar", buffer: Buffer.from(ics) });
  await expect(example(page).getByRole("button", { name: "Rosa's birthday" })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    example(page).getByRole("button", { name: "Export Excel" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("calendar.xlsx");
});

test("validation: our rule and the built-in one, next to their fields", async ({ page }) => {
  await open(page, "validation");
  await example(page)
    .getByRole("button", { name: /Daily standup/ })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText("The title is required.")).toBeVisible();
  await expect(dialog.getByLabel("Title")).toHaveAttribute("aria-invalid", "true");
});

test("languages: Intl translates the calendar, and Arabic turns it right-to-left", async ({
  page,
}) => {
  await open(page, "languages");
  await expect(title(page)).toHaveText("November 2026");
  const language = example(page).getByRole("combobox", { name: "Language" });
  await language.selectOption("es-PE");
  await expect(title(page)).toHaveText("noviembre de 2026");
  await language.selectOption("ar-EG");
  await expect(example(page).locator('[dir="rtl"]')).toBeVisible();
  // Day numbers use the locale's digits too, like the title.
  await expect(example(page).getByRole("button", { name: /١٧/ }).first()).toHaveText("١٧");
  await expect(title(page)).not.toHaveText("November 2026");
});

test("mobile: a select for the views and a compact month in a phone-wide box", async ({ page }) => {
  await open(page, "mobile");
  await expect(example(page).getByRole("combobox", { name: "Views" })).toBeVisible();
  await example(page)
    .getByRole("button", { name: "Wednesday, November 18, 2026, 1 event" })
    .click();
  await expect(
    example(page).getByRole("list", { name: "Wednesday, November 18, 2026" }),
  ).toContainText("Design review");
});

test("own UI: our buttons, editor and drag confirmation, without the library's", async ({
  page,
}) => {
  await open(page, "own-ui");
  // Our own editor, opened by onEventClick.
  await example(page)
    .getByRole("button", { name: /Daily standup/ })
    .first()
    .click();
  await expect(example(page).getByText("Edit appointment")).toBeVisible();
  await example(page).getByLabel("Title").fill("Standup");
  await example(page).getByRole("button", { name: "Save" }).click();
  // The standup repeats: the async resolveScope asks in our own bar and waits.
  const question = example(page).getByRole("alertdialog", { name: "Question" });
  await expect(question).toContainText(`"Daily standup" repeats`);
  await expect(example(page).getByRole("button", { name: /\bStandup/ })).toHaveCount(0);
  await question.getByRole("button", { name: "Only this one" }).click();
  await expect(example(page).getByRole("button", { name: /\bStandup/ })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Our own view buttons.
  const week = example(page).getByRole("button", { name: "Week", exact: true });
  await week.click();
  await expect(week).toHaveAttribute("aria-pressed", "true");
  await expect(title(page)).toContainText("15");

  // The async onEventChange: a drag waits for our answer.
  const standup = example(page).getByRole("button", { name: /\bStandup/ });
  await standup.scrollIntoViewIfNeeded();
  const box = (await standup.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 24, { steps: 5 });
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 48, { steps: 5 });
  await page.mouse.up();
  await expect(question).toContainText(`"Standup"`);
  await expect(question).toContainText("10:00");
  await expect(standup).not.toContainText("10:00 AM");
  await question.getByRole("button", { name: "Yes, change it" }).click();
  await expect(question).toHaveCount(0);
  await expect(standup).toContainText("10:00 AM");
});

test("editing: the built-in dialog's Custom… repeat opens the full rule editor", async ({
  page,
}) => {
  await open(page, "editing");
  await example(page).getByRole("button", { name: "New event" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Gym");
  await dialog.getByRole("combobox", { name: "Repeat" }).selectOption({ label: "Custom…" });
  // Today is Tuesday: the editor starts weekly on Tuesday; add Thursday.
  await expect(dialog.getByRole("button", { name: "Tuesday" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await dialog.getByRole("button", { name: "Thursday" }).click();
  await dialog.getByRole("button", { name: "Save" }).click();

  await example(page).getByRole("button", { name: "week", exact: true }).click();
  await expect(example(page).getByRole("button", { name: /Gym/ })).toHaveCount(2);
});

test("events: a second button opens our own simple form", async ({ page }) => {
  await open(page, "events");
  await example(page).getByRole("button", { name: "Add with my own form" }).click();
  const form = example(page).getByRole("form", { name: "My form" });
  await form.getByLabel("Title").fill("Rosa's birthday");
  await form.getByLabel("Date").fill("2026-11-26");
  await form.getByRole("button", { name: "Add" }).click();
  await expect(example(page).getByRole("button", { name: "Rosa's birthday" })).toBeVisible();
  await expect(form).toHaveCount(0);
});
