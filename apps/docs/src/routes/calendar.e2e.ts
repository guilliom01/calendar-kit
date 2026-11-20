import { expect, test, type Page } from "@playwright/test";

// Tuesday 2026-11-17, 14:00 in Lima. The demo events are placed around "today".
// The landing page wraps the demo in a "Live demo" region, next to headings of its own.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-17T14:00:00-05:00"));
  await page.goto("/");
  // Bring the whole demo on screen: drags need every part of it inside the viewport. The scroll
  // event comes a frame later; waiting for it keeps it from closing an event preview.
  await page.getByRole("region", { name: "Live demo" }).evaluate((element) => {
    element.scrollIntoView();
    return new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  });
});

const demo = (page: Page) => page.getByRole("region", { name: "Live demo" });
const title = (page: Page) => demo(page).getByRole("heading", { level: 2 });
/** Confirms the pending drag or resize in the confirmation dialog. */
async function confirm(page: Page, action: "Move" | "Change") {
  await page.getByRole("dialog").getByRole("button", { name: action, exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}
const viewButton = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
/** A day button of the views, not of the mini calendar, which repeats the same names. */
const dayButton = (page: Page, name: string) =>
  page.getByRole("button", { name }).and(page.locator(":not([data-mini-date])"));

test("month view shows the current month with its events", async ({ page }) => {
  await expect(title(page)).toHaveText("November 2026");
  await expect(page.getByText("Conference in Cusco")).toBeVisible();
  await expect(page.getByRole("button", { name: "Holiday" })).toBeVisible();
  // Friday: the conference bar plus 4 meetings; 3 lanes fit, 2 meetings collapse.
  // The overnight deploy (Thu 22:00 to Fri 01:00) shows only on Thursday.
  await expect(
    page.getByRole("button", {
      name: "2 more events, Friday, November 20, 2026",
    }),
  ).toBeVisible();
});

test("previous, next and today navigate by the current view", async ({ page }) => {
  await page.getByRole("button", { name: "next month" }).click();
  await expect(title(page)).toHaveText("December 2026");

  await page.getByRole("button", { name: "last month" }).click();
  await page.getByRole("button", { name: "last month" }).click();
  await expect(title(page)).toHaveText("October 2026");

  await page.getByRole("button", { name: "today" }).click();
  await expect(title(page)).toHaveText("November 2026");
});

test("week and day views show the time grid", async ({ page }) => {
  await viewButton(page, "week").click();
  await expect(title(page)).toHaveText("Nov 15 – 21, 2026");
  await expect(viewButton(page, "week")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Svelte workshop")).toBeVisible();
  await expect(page.getByText("All day")).toBeVisible();

  await page.getByRole("button", { name: "next week" }).click();
  await expect(title(page)).toHaveText("Nov 22 – 28, 2026");

  // The focused date moved from Tue 17 to Tue 24; the day view shows it.
  await viewButton(page, "day").click();
  await expect(title(page)).toHaveText("Tuesday, November 24, 2026");
});

test("clicking a day number opens that day", async ({ page }) => {
  await dayButton(page, "Wednesday, November 18, 2026").click();
  await expect(title(page)).toHaveText("Wednesday, November 18, 2026");
  await expect(page.getByText("Svelte workshop")).toBeVisible();
});

test.describe("editing", () => {
  const HOUR = 48; // 3rem hour height

  /** Drags from the given point by (dx, dy) pixels in small steps. */
  async function drag(page: Page, x: number, y: number, dx: number, dy: number) {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 5 });
    await page.mouse.move(x + dx, y + dy, { steps: 5 });
    await page.mouse.up();
  }

  test("creates an event from the toolbar at the next full hour", async ({ page }) => {
    await page.getByRole("button", { name: "New event" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "New event" })).toBeVisible();

    await dialog.getByLabel("Title").fill("Pottery class");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();

    await viewButton(page, "day").click();
    await expect(page.getByRole("button", { name: /Pottery class/ })).toContainText(
      "3:00 – 4:00 PM",
    );
  });

  test("edits and deletes an event, and undoes and redoes the delete", async ({ page }) => {
    await viewButton(page, "week").click();
    const dialog = page.getByRole("dialog");

    await page.getByRole("button", { name: /Svelte workshop/ }).click();
    await expect(dialog.getByRole("heading", { name: "Edit event" })).toBeVisible();
    await dialog.getByLabel("Title").fill("Svelte class");
    await dialog.getByRole("button", { name: "Save" }).click();
    const workshop = page.getByRole("button", { name: /Svelte class/ });
    await expect(workshop).toBeVisible();

    await workshop.click();
    await dialog.getByRole("button", { name: "Delete" }).click();
    await expect(workshop).toBeHidden();

    await page.keyboard.press("Control+z");
    await expect(workshop).toBeVisible();

    await page.getByRole("button", { name: "Redo" }).click();
    await expect(workshop).toBeHidden();
  });

  test("moves and resizes timed events in the week view", async ({ page }) => {
    await viewButton(page, "week").click();

    const workshop = page.getByRole("button", { name: /Svelte workshop/ });
    await workshop.scrollIntoViewIfNeeded();
    let box = (await workshop.boundingBox())!;
    await drag(page, box.x + box.width / 2, box.y + 20, 0, HOUR);
    await confirm(page, "Move");
    await expect(workshop).toContainText("4:00 – 7:00 PM");

    const lunch = page.getByRole("button", { name: /Team lunch/ });
    await lunch.scrollIntoViewIfNeeded();
    box = (await lunch.boundingBox())!;
    await drag(page, box.x + box.width / 2, box.y + box.height - 3, 0, HOUR);
    await confirm(page, "Change");
    await expect(lunch).toContainText("1:00 – 3:30 PM");

    // One column to the right: Wednesday 18 -> Thursday 19.
    await workshop.scrollIntoViewIfNeeded();
    box = (await workshop.boundingBox())!;
    await drag(page, box.x + box.width / 2, box.y + 20, box.width, 0);
    await confirm(page, "Move");
    await dayButton(page, "Thursday, November 19, 2026").click();
    await expect(page.getByRole("button", { name: /Svelte workshop/ })).toContainText(
      "4:00 – 7:00 PM",
    );
  });

  test("moves an event to another day in the month view", async ({ page }) => {
    const holiday = page.getByRole("button", { name: "Holiday" });
    const from = (await holiday.boundingBox())!;
    const target = (await page.locator('[data-date="2026-11-26"]').boundingBox())!;

    await drag(
      page,
      from.x + 10,
      from.y + from.height / 2,
      target.x + target.width / 2 - (from.x + 10),
      0,
    );
    await confirm(page, "Move");

    await dayButton(page, "Thursday, November 26, 2026").click();
    await expect(page.getByRole("button", { name: "Holiday" })).toBeVisible();
  });

  test("draws a new event on an empty part of the time grid", async ({ page }) => {
    await viewButton(page, "day").click();
    const column = (await page.locator('[style*="repeating-linear-gradient"]').boundingBox())!;

    // From 10:00 to 11:30.
    await drag(page, column.x + column.width / 2, column.y + 10 * HOUR + 2, 0, 1.5 * HOUR);

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "New event" })).toBeVisible();
    await expect(dialog.getByLabel("Start, hour")).toHaveValue("10:00");
    await expect(dialog.getByLabel("End, hour")).toHaveValue("11:30");
  });
});

test.describe("recurring events", () => {
  const english = (page: Page) => page.getByRole("button", { name: /English class/ });
  const dialog = (page: Page) => page.getByRole("dialog");

  async function chooseScope(page: Page, scope: string) {
    await expect(dialog(page).getByRole("heading", { name: /recurring event/ })).toBeVisible();
    await dialog(page).getByLabel(scope).check();
    await dialog(page).getByRole("button", { name: "OK" }).click();
    await expect(dialog(page)).toBeHidden();
  }

  test("show on every matching day, week after week", async ({ page }) => {
    await viewButton(page, "week").click();
    await expect(english(page)).toHaveCount(2);
    await page.getByRole("button", { name: "next week" }).click();
    await expect(english(page)).toHaveCount(2);
  });

  test("editing one occurrence changes only that one, in one undo step", async ({ page }) => {
    await viewButton(page, "week").click();
    await english(page).first().click();
    await dialog(page).getByLabel("Title").fill("Review class");
    await dialog(page).getByRole("button", { name: "Save" }).click();
    await chooseScope(page, "This event");

    await expect(page.getByRole("button", { name: /Review class/ })).toHaveCount(1);
    await expect(english(page)).toHaveCount(1);

    await page.keyboard.press("Control+z");
    await expect(english(page)).toHaveCount(2);
    await expect(page.getByRole("button", { name: /Review class/ })).toHaveCount(0);
  });

  test('moving an occurrence with "all events" moves the whole series', async ({ page }) => {
    await viewButton(page, "week").click();
    const wednesday = english(page).last();
    await wednesday.scrollIntoViewIfNeeded();
    const box = (await wednesday.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + 34, { steps: 5 });
    await page.mouse.move(box.x + box.width / 2, box.y + 58, { steps: 5 });
    await page.mouse.up();
    await chooseScope(page, "All events");

    await expect(english(page).first()).toContainText("8:00 – 9:30 PM");
    await page.getByRole("button", { name: "next week" }).click();
    await expect(english(page).first()).toContainText("8:00 – 9:30 PM");
  });

  test('deleting "this and following" keeps the earlier occurrences', async ({ page }) => {
    await viewButton(page, "week").click();
    await page.getByRole("button", { name: "next week" }).click();
    await english(page).first().click();
    await dialog(page).getByRole("button", { name: "Delete" }).click();
    await chooseScope(page, "This and following events");

    await expect(english(page)).toHaveCount(0);
    await page.getByRole("button", { name: "last week" }).click();
    await expect(english(page)).toHaveCount(2);
  });

  test("the recurrence editor builds custom rules: every 2 weeks on Tuesday and Thursday", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "New event" }).click();
    await dialog(page).getByLabel("Title").fill("Gym");
    await dialog(page).getByRole("combobox", { name: "Repeat" }).selectOption({ label: "week" });
    // Tuesday comes from the start date; add Thursday and make it every 2 weeks.
    await expect(dialog(page).getByRole("button", { name: "Tuesday" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await dialog(page).getByRole("button", { name: "Thursday" }).click();
    await dialog(page).getByRole("spinbutton", { name: "Repeat every" }).fill("2");
    await dialog(page).getByRole("button", { name: "Save" }).click();

    const gym = page.getByRole("button", { name: /Gym/ });
    await viewButton(page, "week").click();
    await expect(gym).toHaveCount(2);
    await page.getByRole("button", { name: "next week" }).click();
    await expect(gym).toHaveCount(0);
    await page.getByRole("button", { name: "next week" }).click();
    await expect(gym).toHaveCount(2);
  });

  test("the recurrence editor shows the rule of an existing series", async ({ page }) => {
    await viewButton(page, "week").click();
    await english(page).first().click();
    await expect(dialog(page).getByRole("button", { name: "Monday" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(dialog(page).getByRole("button", { name: "Wednesday" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(dialog(page).getByRole("button", { name: "Tuesday" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("a monthly series on the last day lands on 30 and 31", async ({ page }) => {
    const bills = page.getByRole("button", { name: "Pay the bills" });
    await dayButton(page, "Monday, November 30, 2026").click();
    await expect(bills).toBeVisible();
    await page.getByRole("button", { name: "tomorrow" }).click();
    await expect(bills).toHaveCount(0);

    await viewButton(page, "month").click();
    await dayButton(page, "Thursday, December 31, 2026").click();
    await expect(bills).toBeVisible();
  });
});

test("switching the time zone shows timed events at the new local time", async ({ page }) => {
  await dayButton(page, "Monday, November 16, 2026").click();
  const review = page.getByRole("button", { name: /Design review/ });
  await expect(review).toContainText("9:15 – 10:30 AM");

  await page.getByRole("combobox", { name: "Time zone" }).selectOption("Europe/Madrid");
  await expect(review).toContainText("3:15 – 4:30 PM");
});

test.describe("more views", () => {
  async function dragTo(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, {
      steps: 5,
    });
    await page.mouse.move(to.x, to.y, { steps: 5 });
    await page.mouse.up();
  }
  const center = (box: { x: number; y: number; width: number; height: number }) => ({
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  });

  test("year view shows the year, how busy each day is, and opens a day", async ({ page }) => {
    await viewButton(page, "year").click();
    await expect(title(page)).toHaveText("2026");

    await dayButton(page, "Wednesday, November 18, 2026, 3 events").click();
    await expect(title(page)).toHaveText("Wednesday, November 18, 2026");
  });

  test("agenda lists the month day by day with resources, and opens events", async ({ page }) => {
    await viewButton(page, "Agenda").click();
    const standup = page.getByRole("button", { name: /Daily standup/ });
    await expect(standup).toContainText("Ana and Luis");
    await expect(standup).toContainText("9:00 – 9:30 AM");

    await standup.click();
    await expect(page.getByRole("dialog").getByLabel("Title")).toHaveValue("Daily standup");
  });

  test("timeline groups resources and moves events between them", async ({ page }) => {
    await viewButton(page, "Timeline").click();
    const workshop = page.getByRole("button", { name: /Svelte workshop/ });
    const roomA = page.locator('[data-date="2026-11-18"][data-resource="room-a"]');

    await dragTo(
      page,
      center((await workshop.boundingBox())!),
      center((await roomA.boundingBox())!),
    );
    await confirm(page, "Move");
    const bar = center((await workshop.boundingBox())!);
    const row = (await roomA.boundingBox())!;
    expect(bar.y).toBeGreaterThan(row.y);
    expect(bar.y).toBeLessThan(row.y + row.height);

    await workshop.click();
    await expect(page.getByRole("dialog").getByLabel("Room A")).toBeChecked();
    await expect(page.getByRole("dialog").getByLabel("Room B")).not.toBeChecked();
    await page.keyboard.press("Escape");

    const rooms = page.getByRole("button", { name: "Rooms" });
    await rooms.click();
    await expect(rooms).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByText("Room A")).toBeHidden();
  });

  test("resource view shows one column per resource and creates events for it", async ({
    page,
  }) => {
    await viewButton(page, "Resources").click();
    await expect(page.getByRole("button", { name: /Team lunch/ })).toBeVisible();

    const column = (await page
      .locator('[style*="repeating-linear-gradient"]')
      .nth(2)
      .boundingBox())!;
    await page.mouse.click(column.x + column.width / 2, column.y + 10 * 48 + 5);
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Ana")).toBeChecked();
    await expect(dialog.getByLabel("Luis")).not.toBeChecked();
    await expect(dialog.getByLabel("Start, hour")).toHaveValue("10:00");
  });

  test("gantt shows tasks with progress and dependency arrows", async ({ page }) => {
    await viewButton(page, "Gantt").click();
    for (const task of ["Analysis", "Mockups", "Build", "Testing"]) {
      await expect(page.getByRole("button", { name: new RegExp(`^${task}`) })).toBeVisible();
    }
    await expect(page.getByRole("button", { name: /^Mockups, Progress 60/ })).toBeVisible();
    await expect(page.locator("svg path[marker-end]")).toHaveCount(3);
  });
});

test("the header links the docs, components and examples, and marks the current one", async ({
  page,
}) => {
  const nav = page.getByRole("navigation", { name: "Main" });
  for (const [label, heading] of [
    ["Docs", "calendar-kit"],
    ["Components", "Components"],
    ["Examples", "Examples"],
  ]) {
    await nav.getByRole("link", { name: label }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expect(nav.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
  }
  await expect(page.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/guilliom01/calendar-kit",
  );
});

test.describe("import and export", () => {
  const downloadBytes = async (download: import("@playwright/test").Download) => {
    const chunks: Buffer[] = [];
    for await (const chunk of (await download.createReadStream())!) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks);
  };
  const readDownload = async (download: import("@playwright/test").Download) =>
    (await downloadBytes(download)).toString("utf8");
  const exportWith = (page: Page, name: string) =>
    Promise.all([page.waitForEvent("download"), page.getByRole("button", { name }).click()]).then(
      ([download]) => download,
    );

  test("exports an Excel workbook with the visible events", async ({ page }) => {
    const download = await exportWith(page, "Export Excel");
    expect(download.suggestedFilename()).toBe("calendar.xlsx");
    const bytes = await downloadBytes(download);
    expect(bytes.subarray(0, 4).toString("latin1")).toBe("PK\x03\x04");
    // Stored without compression, so the sheet's text is readable in the bytes.
    expect(bytes.toString("utf8")).toContain("<t>Daily standup</t>");
  });

  test("the CSV starts with a BOM for Excel", async ({ page }) => {
    const withBom = await downloadBytes(await exportWith(page, "Export CSV"));
    expect([...withBom.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  test("exports the events as .ics, with series and their rules", async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export .ics" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("calendar.ics");
    const ics = await readDownload(download);
    expect(ics).toContain("SUMMARY:Daily standup");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO,WE");
    expect(ics).toContain("X-WR-CALNAME:calendar-kit");
  });

  test("exports the visible events as CSV with local times", async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export CSV" }).click(),
    ]);
    const csv = await readDownload(download);
    expect(csv).toContain("id,title,start,end,all_day,rrule,resources,color");
    expect(csv).toContain(
      "standup,Daily standup,2026-11-16 09:00,2026-11-16 09:30,false,,ana;luis,",
    );
  });

  test("imports a .ics file as one undo step and reports what it could not use", async ({
    page,
  }) => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:imported-1",
      "SUMMARY:Imported event",
      "DTSTART;TZID=America/Lima:20261119T100000",
      "DTEND;TZID=America/Lima:20261119T110000",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:imported-2",
      "SUMMARY:Every hour",
      "DTSTART;TZID=America/Lima:20261120T080000",
      "RRULE:FREQ=HOURLY",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    await page.locator('input[type="file"]').setInputFiles({
      name: "other.ics",
      mimeType: "text/calendar",
      buffer: Buffer.from(ics),
    });

    await expect(page.getByTestId("import-warnings")).toContainText(
      "imported-2: unsupported recurrence rule",
    );
    await viewButton(page, "week").click();
    await expect(page.getByRole("button", { name: /Imported event/ })).toContainText(
      "10:00 – 11:00 AM",
    );

    await page.keyboard.press("Control+z");
    await expect(page.getByRole("button", { name: /Imported event/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Every hour/ })).toHaveCount(0);
  });

  test("prints with the controls hidden", async ({ page }) => {
    await page.evaluate(() => {
      window.print = () => document.body.setAttribute("data-printed", "true");
    });
    await page.getByRole("button", { name: "Print" }).click();
    await expect(page.locator("body")).toHaveAttribute("data-printed", "true");

    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("button", { name: "New event" })).toBeHidden();
    await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
    await expect(title(page)).toBeVisible();
    await expect(page.getByText("Conference in Cusco")).toBeVisible();
  });
});

test.describe("languages and directions", () => {
  test('counts use plural rules: "1 event", "3 events"', async ({ page }) => {
    await viewButton(page, "year").click();
    await expect(dayButton(page, "Tuesday, November 17, 2026, 1 event")).toBeVisible();
    await expect(dayButton(page, "Wednesday, November 18, 2026, 3 events")).toBeVisible();
  });

  test("right-to-left pages drag toward the next day and mirror the gantt", async ({ page }) => {
    await page.evaluate(() => (document.documentElement.dir = "rtl"));
    await viewButton(page, "week").click();

    // In RTL the next day is on the left.
    const workshop = page.getByRole("button", { name: /Svelte workshop/ });
    await workshop.scrollIntoViewIfNeeded();
    const box = (await workshop.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - box.width / 2, box.y + 20, {
      steps: 5,
    });
    await page.mouse.move(box.x + box.width / 2 - box.width, box.y + 20, {
      steps: 5,
    });
    await page.mouse.up();
    await confirm(page, "Move");
    await dayButton(page, "Thursday, November 19, 2026").click();
    await expect(page.getByRole("button", { name: /Svelte workshop/ })).toContainText(
      "3:00 – 6:00 PM",
    );

    await viewButton(page, "Gantt").click();
    const analysis = (await page.getByRole("button", { name: /^Analysis/ }).boundingBox())!;
    const design = (await page.getByRole("button", { name: /^Mockups/ }).boundingBox())!;
    expect(analysis.x).toBeGreaterThan(design.x);
    await expect(page.locator("svg path[marker-end]")).toHaveCount(3);
  });
});

test("the documentation has a page per component, with its preview and install command", async ({
  page,
}) => {
  await page.goto("/docs");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("calendar-kit");
  const docs = page.getByRole("navigation", { name: "Documentation" });
  for (const item of [
    "full-calendar",
    "month-view",
    "time-grid",
    "agenda-view",
    "year-view",
    "timeline-view",
    "gantt-view",
    "mini-calendar",
    "calendar-search",
    "calendar-list",
    "event-context-menu",
    "event-preview",
    "scheduling-assistant",
    "event-dialog",
    "recurrence-editor",
    "import-export",
  ]) {
    await expect(docs.getByRole("link", { name: item, exact: true })).toBeVisible();
  }
  await docs.getByRole("link", { name: "month-view", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("month-view");
  await expect(docs.getByRole("link", { name: "month-view", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Components" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("region", { name: "Live example" }).locator("[data-event-id]").first(),
  ).toBeVisible();
  await expect(page.getByText("/r/month-view.json")).toBeVisible();
  await page.getByRole("tab", { name: "Code" }).click();
  await expect(page.locator("pre code").filter({ hasText: "MonthView" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "API reference" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "On this page" })).toBeVisible();
});

test("the old Blocks page redirects to the components", async ({ page }) => {
  await page.goto("/docs/blocks");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Components");
});

test("the documentation sections are reachable on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/docs");
  const docs = page.getByRole("navigation", { name: "Documentation" });
  await docs.locator("summary").click();
  await docs.getByRole("link", { name: "State and hooks" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("State and hooks");
});

test.describe("confirming changes", () => {
  test("a drag waits for confirmation and can be cancelled", async ({ page }) => {
    await viewButton(page, "week").click();
    const workshop = page.getByRole("button", { name: /Svelte workshop/ });
    await workshop.scrollIntoViewIfNeeded();
    const box = (await workshop.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + 44, { steps: 5 });
    await page.mouse.move(box.x + box.width / 2, box.y + 68, { steps: 5 });
    await page.mouse.up();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Move event?" })).toBeVisible();
    await expect(dialog).toContainText(
      '"Svelte workshop" will move to Wednesday, November 18, 2026',
    );
    await expect(dialog).toContainText("4:00");
    await dialog.getByRole("button", { name: "Cancel" }).click();

    await expect(workshop).toContainText("3:00 – 6:00 PM");
    await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
  });
});

test.describe("touch", () => {
  /** Sends touch pointer events: down on the event, then moves and up on the page. */
  async function touchDrag(page: Page, name: RegExp, dy: number, holdMs: number) {
    const target = page.getByRole("button", { name });
    await target.scrollIntoViewIfNeeded();
    const box = (await target.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + 20;
    const init = (clientY: number) => ({
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: x,
      clientY,
      bubbles: true,
    });
    await target.dispatchEvent("pointerdown", init(y));
    await page.waitForTimeout(holdMs);
    for (let step = 1; step <= 6; step++) {
      await page.evaluate(
        (options) => window.dispatchEvent(new PointerEvent("pointermove", options)),
        init(y + (dy * step) / 6),
      );
    }
    await page.evaluate(
      (options) => window.dispatchEvent(new PointerEvent("pointerup", { ...options, buttons: 0 })),
      init(y + dy),
    );
  }

  test("a quick swipe over an event scrolls instead of moving it", async ({ page }) => {
    await viewButton(page, "week").click();
    await touchDrag(page, /Svelte workshop/, 48, 0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Svelte workshop/ })).toContainText(
      "3:00 – 6:00 PM",
    );
  });

  test("a long press lifts the event so it can be dragged", async ({ page }) => {
    await viewButton(page, "week").click();
    await touchDrag(page, /Svelte workshop/, 48, 500);
    await confirm(page, "Move");
    await expect(page.getByRole("button", { name: /Svelte workshop/ })).toContainText(
      "4:00 – 7:00 PM",
    );
  });
});

test.describe("keyboard move mode", () => {
  const live = (page: Page) => page.locator('div[aria-live="polite"][aria-atomic="true"]');
  async function press(page: Page, key: string, times = 1) {
    for (let index = 0; index < times; index++) await page.keyboard.press(key);
  }

  test("M then arrows move the event; Enter saves without the confirmation dialog", async ({
    page,
  }) => {
    await viewButton(page, "week").click();
    const workshop = page.getByRole("button", { name: /Svelte workshop/ });
    await expect(workshop).toHaveAttribute("aria-keyshortcuts", "M");
    await workshop.focus();
    await page.keyboard.press("m");
    await expect(live(page)).toContainText('Moving "Svelte workshop"');

    await press(page, "ArrowDown", 4);
    await expect(live(page)).toContainText("Wednesday, November 18, 2026");
    await expect(live(page)).toContainText("4:00");
    await expect(workshop).toContainText("4:00 – 7:00 PM");

    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(workshop).toContainText("4:00 – 7:00 PM");
    await expect(workshop).toBeFocused();

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(workshop).toContainText("3:00 – 6:00 PM");
  });

  test("Escape cancels; Shift with arrows changes the length", async ({ page }) => {
    await viewButton(page, "week").click();
    const lunch = page.getByRole("button", { name: /Team lunch/ });
    await lunch.focus();
    await page.keyboard.press("m");
    await press(page, "Shift+ArrowDown", 2);
    await expect(lunch).toContainText("1:00 – 3:00 PM");
    await page.keyboard.press("Escape");
    await expect(lunch).toContainText("1:00 – 2:30 PM");
    await expect(live(page)).toHaveText("Move cancelled.");

    await page.keyboard.press("m");
    await press(page, "Shift+ArrowDown", 2);
    await page.keyboard.press("Enter");
    await expect(lunch).toContainText("1:00 – 3:00 PM");
  });

  test("in the month view, left/right move a day and up/down a week", async ({ page }) => {
    const holiday = page.getByRole("button", { name: "Holiday" });
    await holiday.focus();
    await page.keyboard.press("m");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowUp");
    await expect(live(page)).toHaveText("Wednesday, November 18, 2026");
    await page.keyboard.press("Enter");

    await dayButton(page, "Wednesday, November 18, 2026").first().click();
    await expect(page.getByRole("button", { name: "Holiday" })).toBeVisible();
  });

  test("in the timeline, up/down move the event to another resource", async ({ page }) => {
    await viewButton(page, "Timeline").click();
    const workshop = page.getByRole("button", { name: /Svelte workshop/ });
    await workshop.focus();
    await page.keyboard.press("m");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Enter");

    await workshop.click();
    await expect(page.getByRole("dialog").getByLabel("Room A")).toBeChecked();
    await expect(page.getByRole("dialog").getByLabel("Room B")).not.toBeChecked();
  });

  test("recurring events still ask for the scope", async ({ page }) => {
    await viewButton(page, "week").click();
    await page
      .getByRole("button", { name: /English class/ })
      .first()
      .focus();
    await page.keyboard.press("m");
    await press(page, "ArrowDown", 4);
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: "Edit recurring event" }),
    ).toBeVisible();
  });
});

test("dragging near the edge of the time grid scrolls it, and the preview follows the pointer", async ({
  page,
}) => {
  await viewButton(page, "week").click();
  // .first(): near midnight the preview is drawn in two parts (today and tomorrow).
  const workshop = page.getByRole("button", { name: /Svelte workshop/ }).first();
  await workshop.scrollIntoViewIfNeeded();
  const scrollTop = () =>
    workshop.evaluate((element) => {
      let node = element.parentElement;
      while (node && getComputedStyle(node).overflowY !== "auto") node = node.parentElement;
      return node!.scrollTop;
    });
  const before = await scrollTop();
  const box = (await workshop.boundingBox())!;
  const area = (await workshop.evaluate((element) => {
    let node = element.parentElement;
    while (node && getComputedStyle(node).overflowY !== "auto") node = node.parentElement;
    const { bottom } = node!.getBoundingClientRect();
    return { bottom };
  }))!;

  const x = box.x + box.width / 2;
  await page.mouse.move(x, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(x, area.bottom - 30, { steps: 5 });
  await page.mouse.move(x, area.bottom - 10, { steps: 2 });

  await expect.poll(scrollTop).toBeGreaterThan(before + 100);
  // The preview is redrawn under the pointer instead of scrolling away with the grid.
  const preview = (await workshop.boundingBox())!;
  expect(Math.abs(preview.y + 20 - (area.bottom - 10))).toBeLessThan(40);

  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(workshop).toContainText("3:00 – 6:00 PM");
});

test.describe("converting between all-day and timed by dragging", () => {
  async function dragTo(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, {
      steps: 5,
    });
    await page.mouse.move(to.x, to.y, { steps: 5 });
    await page.mouse.up();
  }

  test("a timed event dropped on the all-day row becomes all-day", async ({ page }) => {
    await viewButton(page, "week").click();
    const conference = (await page
      .getByRole("button", { name: "Conference in Cusco" })
      .boundingBox())!;
    const workshop = page.getByRole("button", { name: /Svelte workshop/ });
    await workshop.scrollIntoViewIfNeeded();
    const box = (await workshop.boundingBox())!;

    await dragTo(
      page,
      { x: box.x + box.width / 2, y: box.y + 10 },
      { x: box.x + box.width / 2, y: conference.y + conference.height / 2 },
    );
    await confirm(page, "Move");
    await expect(workshop).not.toContainText(/\d:\d\d/);
    await dayButton(page, "Wednesday, November 18, 2026").click();
    await expect(page.getByRole("button", { name: /Svelte workshop/ })).not.toContainText(
      /\d:\d\d/,
    );
  });

  test("an all-day event dropped on the hours becomes a one-hour event", async ({ page }) => {
    await viewButton(page, "week").click();
    const conference = page.getByRole("button", {
      name: /Conference in Cusco/,
    });
    const bar = (await conference.boundingBox())!;
    const workshop = (await page.getByRole("button", { name: /Svelte workshop/ }).boundingBox())!;

    await dragTo(
      page,
      { x: bar.x + 20, y: bar.y + bar.height / 2 },
      { x: bar.x + 20, y: workshop.y },
    );
    await confirm(page, "Move");
    const text = (await conference.textContent()) ?? "";
    const [from, to] = [...text.matchAll(/(\d{1,2}):\d{2}/g)].map((match) => Number(match[1]));
    expect((to! - from! + 12) % 12).toBe(1);
  });
});

test.describe("resizing from both edges", () => {
  async function dragBy(page: Page, handle: ReturnType<Page["locator"]>, dx: number, dy: number) {
    const box = (await handle.boundingBox())!;
    const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 5 });
    await page.mouse.move(x + dx, y + dy, { steps: 5 });
    await page.mouse.up();
  }

  test("the top edge of a timed event changes its start", async ({ page }) => {
    await viewButton(page, "week").click();
    const workshop = page.getByRole("button", { name: /Svelte workshop/ });
    await workshop.scrollIntoViewIfNeeded();
    await dragBy(page, workshop.locator(".cursor-ns-resize").first(), 0, -48);
    await confirm(page, "Change");
    await expect(workshop).toContainText("2:00 – 6:00 PM");
  });

  test("Shift+Alt+arrows change the start with the keyboard", async ({ page }) => {
    await viewButton(page, "week").click();
    const lunch = page.getByRole("button", { name: /Team lunch/ });
    await lunch.focus();
    await page.keyboard.press("m");
    await page.keyboard.press("Shift+Alt+ArrowUp");
    await page.keyboard.press("Shift+Alt+ArrowUp");
    await page.keyboard.press("Enter");
    await expect(lunch).toContainText("12:30");
    await expect(lunch).toContainText("2:30 PM");
  });

  test("both edges of a month bar change its first and last day", async ({ page }) => {
    const conference = page.getByRole("button", {
      name: "Conference in Cusco",
    });
    const cell = (await page.locator('[data-date="2026-11-18"]').boundingBox())!;

    await dragBy(page, conference.locator(".cursor-ew-resize").last(), cell.width, 0);
    await confirm(page, "Change");
    await dragBy(page, conference.locator(".cursor-ew-resize").first(), -cell.width, 0);
    await confirm(page, "Change");

    await dayButton(page, "Saturday, November 21, 2026").click();
    await expect(page.getByRole("button", { name: /Conference in Cusco/ })).toBeVisible();
    // Tuesday 17 is today.
    await page.getByRole("button", { name: "today" }).click();
    await expect(title(page)).toHaveText("Tuesday, November 17, 2026");
    await expect(page.getByRole("button", { name: /Conference in Cusco/ })).toBeVisible();
  });

  test("the end of a gantt bar changes its length", async ({ page }) => {
    await viewButton(page, "Gantt").click();
    const bar = page.locator("[data-event-id]").first();
    const before = (await bar.boundingBox())!.width;
    const cell = (await page.locator('[data-date="2026-11-18"]').first().boundingBox())!;
    const handle = bar.locator(".cursor-ew-resize").last();
    // Keep the drag inside the scrolling gantt area, whatever the page width.
    await handle.evaluate((element) =>
      element.scrollIntoView({ inline: "center", block: "center" }),
    );
    await dragBy(page, handle, cell.width * 2, 0);
    await confirm(page, "Change");
    await expect
      .poll(async () => (await bar.boundingBox())!.width)
      .toBeGreaterThan(before + cell.width);
  });
});

test.describe("calendars", () => {
  const eventColor = (page: Page, id: string) =>
    page
      .locator(`[data-event-id="${id}"]`)
      .first()
      .evaluate((element) => getComputedStyle(element).getPropertyValue("--event-color").trim());

  test("hiding a calendar hides its events, and showing it brings them back", async ({ page }) => {
    const holidays = page.getByRole("checkbox", { name: "Holidays" });
    await expect(holidays).toBeChecked();
    await holidays.click();
    await expect(holidays).not.toBeChecked();
    await expect(page.getByRole("button", { name: "Holiday" })).toHaveCount(0);
    await expect(page.getByText("Conference in Cusco")).toBeVisible();

    await holidays.click();
    await expect(page.getByRole("button", { name: "Holiday" })).toBeVisible();
  });

  test("events without a color take the color of their calendar", async ({ page }) => {
    expect(await eventColor(page, "standup")).toBe("oklch(0.6 0.15 250)");
  });

  test("the event dialog moves an event to another calendar", async ({ page }) => {
    await page.getByRole("button", { name: /Daily standup/ }).click();
    const dialog = page.getByRole("dialog");
    const select = dialog.getByLabel("Calendar");
    await expect(select).toHaveValue("work");
    await select.selectOption({ label: "Personal" });
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();
    await expect.poll(() => eventColor(page, "standup")).toBe("oklch(0.65 0.15 150)");
  });
});

test.describe("search and filters", () => {
  test("searching ignores accents and case, and shows only matching events", async ({ page }) => {
    const search = page.getByRole("searchbox", { name: "Search events" });
    await search.fill("ENGLÍSH");
    await expect(page.getByRole("button", { name: /English class/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Svelte workshop/ })).toHaveCount(0);

    await search.fill("");
    await expect(page.getByRole("button", { name: /Svelte workshop/ })).toBeVisible();
  });
});

test.describe("context menu", () => {
  const menu = (page: Page) => page.getByRole("menu");

  test("duplicates an event", async ({ page }) => {
    await page.getByRole("button", { name: /Svelte workshop/ }).click({ button: "right" });
    await menu(page).getByRole("menuitem", { name: "Duplicate" }).click();
    await expect(page.getByRole("button", { name: /Svelte workshop/ })).toHaveCount(2);
  });

  test("moves an event to another calendar", async ({ page }) => {
    await page.getByRole("button", { name: /Daily standup/ }).click({ button: "right" });
    await menu(page).getByRole("menuitem", { name: "Move to calendar" }).click();
    await page.getByRole("menuitem", { name: "Personal" }).click();
    await expect
      .poll(() =>
        page
          .locator('[data-event-id="standup"]')
          .evaluate((element) =>
            getComputedStyle(element).getPropertyValue("--event-color").trim(),
          ),
      )
      .toBe("oklch(0.65 0.15 150)");
  });

  test("deletes an event, and opens from the keyboard with Shift+F10", async ({ page }) => {
    const workshop = page.getByRole("button", { name: /Svelte workshop/ });
    await workshop.focus();
    await page.keyboard.press("Shift+F10");
    await menu(page).getByRole("menuitem", { name: "Delete" }).click();
    await expect(workshop).toHaveCount(0);
  });
});

test.describe("event preview", () => {
  const preview = (page: Page) => page.getByRole("tooltip");

  test("hovering an event shows its details, and Escape hides them", async ({ page }) => {
    const workshop = page.getByRole("button", { name: /Svelte workshop/ });
    await expect(workshop).not.toHaveAttribute("title");
    await workshop.hover();
    await expect(preview(page)).toContainText("Svelte workshop");
    await expect(preview(page)).toContainText("3:00");
    await expect(preview(page)).toContainText("Work");

    // The pointer can move onto the card without it closing.
    await preview(page).hover();
    await expect(preview(page)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(preview(page)).toHaveCount(0);
  });

  test("focusing an event shows its preview, linked as its description", async ({ page }) => {
    const lunch = page.getByRole("button", { name: /Team lunch/ });
    await lunch.focus();
    await expect(preview(page)).toContainText("Team lunch");
    const id = await preview(page).getAttribute("id");
    await expect(lunch).toHaveAttribute("aria-describedby", id!);

    await page.keyboard.press("Tab");
    await expect(preview(page)).not.toContainText("Team lunch");
  });

  test("focus coming back after a mouse action does not pop a card", async ({ page }) => {
    await viewButton(page, "week").click();
    const lunch = page.getByRole("button", { name: /Team lunch/ });
    await lunch.scrollIntoViewIfNeeded();
    const box = (await lunch.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 3);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height + 45, {
      steps: 5,
    });
    await page.mouse.up();
    // Closing the dialog gives focus back to the event, without a keyboard.
    await confirm(page, "Change");
    await page.mouse.move(0, 0);
    await page.waitForTimeout(700);
    await expect(preview(page)).toHaveCount(0);
  });
});

test.describe("mini calendar", () => {
  const mini = (page: Page) => page.getByRole("grid", { name: "November 2026" });

  test("shows its own month and opens a day of another month", async ({ page }) => {
    await expect(mini(page)).toBeVisible();
    await page.getByRole("button", { name: "December 2026", exact: true }).click();
    const december = page.getByRole("grid", { name: "December 2026" });
    await december.getByRole("button", { name: /^Thursday, December 10, 2026/ }).click();
    await expect(title(page)).toHaveText("December 2026");
  });

  test("marks days with events and the visible range", async ({ page }) => {
    await expect(
      mini(page).getByRole("button", {
        name: /^Wednesday, November 18, 2026, \d+ events/,
      }),
    ).toBeVisible();
    await expect(
      mini(page).getByRole("button", {
        name: "Tuesday, November 17, 2026",
        exact: false,
      }),
    ).toHaveAttribute("aria-current", "date");
  });

  test("moves with the arrow keys and opens the focused day with Enter", async ({ page }) => {
    await viewButton(page, "week").click();
    const today = mini(page).getByRole("button", {
      name: /^Tuesday, November 17, 2026/,
    });
    await today.focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await expect(
      mini(page).getByRole("button", {
        name: /^Wednesday, November 25, 2026/,
      }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(title(page)).toContainText("22");
    await expect(title(page)).toContainText("28");
  });
});

test.describe("dragging items from outside the calendar", () => {
  async function dragTo(page: Page, from: ReturnType<Page["locator"]>, x: number, y: number) {
    const box = (await from.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(x - 20, y - 20, { steps: 5 });
    await page.mouse.move(x, y, { steps: 5 });
    await page.mouse.up();
  }
  const pending = (page: Page) => page.getByRole("list", { name: "Unscheduled" });

  test("dropping on a month day creates an all-day event there", async ({ page }) => {
    const cell = (await page.locator('[data-date="2026-11-26"]').boundingBox())!;
    await dragTo(
      page,
      pending(page).getByText("Review the contract"),
      cell.x + cell.width / 2,
      cell.y + cell.height - 10,
    );
    await expect(page.getByRole("button", { name: "Review the contract" })).toBeVisible();
    await expect(pending(page).getByText("Review the contract")).toHaveCount(0);
    await dayButton(page, "Thursday, November 26, 2026").click();
    await expect(page.getByRole("button", { name: /Review the contract/ })).toBeVisible();
  });

  test("dropping on the hours creates a timed event at that time", async ({ page }) => {
    await viewButton(page, "week").click();
    const workshop = page.getByRole("button", { name: /Svelte workshop/ });
    await workshop.scrollIntoViewIfNeeded();
    const box = (await workshop.boundingBox())!;
    await dragTo(
      page,
      pending(page).getByText("Call the supplier"),
      box.x + box.width / 2,
      box.y + 2,
    );
    await expect(page.getByRole("button", { name: /Call the supplier/ })).toContainText(
      "3:00 – 4:00 PM",
    );
  });
});

test.describe("phones", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("the view switcher becomes a select", async ({ page }) => {
    await expect(page.getByRole("group", { name: "Views" })).toBeHidden();
    const select = page.getByRole("combobox", { name: "Views" });
    await expect(select).toHaveValue("month");
    await select.selectOption({ label: "Week" });
    await expect(title(page)).toContainText("15");
    await expect(title(page)).toContainText("21");
  });

  test("the month shows dots, and a tapped day lists its events below", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Svelte workshop/ })).toHaveCount(0);
    await dayButton(page, "Wednesday, November 18, 2026, 3 events").click();
    const list = page.getByRole("list", {
      name: "Wednesday, November 18, 2026",
    });
    await expect(list.getByRole("button", { name: /Svelte workshop/ })).toBeVisible();
    await expect(list.getByRole("button", { name: /Conference in Cusco/ })).toBeVisible();
    await list.getByRole("button", { name: /Svelte workshop/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});

test("an event keeps a location and a description, shown in its preview and found by search", async ({
  page,
}) => {
  await page.getByRole("button", { name: /Svelte workshop/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Location").fill("Room Miraflores");
  await dialog.getByLabel("Description").fill("Bring a laptop");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: /Svelte workshop/ }).hover();
  await expect(page.getByRole("tooltip")).toContainText("Room Miraflores");

  await page.getByRole("searchbox", { name: "Search events" }).fill("laptop");
  await expect(page.getByRole("button", { name: /Svelte workshop/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Daily standup/ })).toHaveCount(0);
});

test.describe("event dialog validation", () => {
  test("an end before the start is reported next to the field, not silently fixed", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Svelte workshop/ }).click();
    const dialog = page.getByRole("dialog");
    const end = dialog.getByLabel("End", { exact: true }).first();
    await end.fill("2026-11-10");
    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(dialog.getByText("The end must be after the start.")).toBeVisible();
    await expect(end).toHaveAttribute("aria-invalid", "true");
    await expect(end).toBeFocused();
    await expect(dialog).toBeVisible();
  });
});

test("a conflict shows the server version and the developer tells the user", async ({ page }) => {
  await page.getByRole("button", { name: /Svelte workshop/ }).click();
  const dialog = page.getByRole("dialog");
  // The demo backend answers titles with "conflict" with its own newer version.
  await dialog.getByLabel("Title").fill("Conflict test");
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect(demo(page).getByRole("status")).toHaveText(
    'Someone else changed "Svelte workshop" while you were editing it: showing their version.',
  );
  await expect(
    page.getByRole("button", {
      name: /Svelte workshop \(server version\)/,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Conflict test/ })).toHaveCount(0);
});

test.describe("arrow keys in the day grids", () => {
  const tabStops = (page: Page) => page.locator('[data-grid-date][tabindex="0"]');

  test("the month is one tab stop; arrows move, Page Down changes month, Enter opens", async ({
    page,
  }) => {
    const today = dayButton(page, "Tuesday, November 17, 2026");
    await expect(tabStops(page)).toHaveCount(1);
    await today.focus();
    await page.keyboard.press("ArrowRight");
    await expect(dayButton(page, "Wednesday, November 18, 2026")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    // Still in the November grid, which ends on Saturday 5 December.
    await expect(dayButton(page, "Wednesday, December 2, 2026")).toBeFocused();
    await expect(title(page)).toHaveText("November 2026");

    await page.keyboard.press("PageDown");
    await expect(title(page)).toHaveText("January 2027");
    await expect(dayButton(page, "Saturday, January 2, 2027")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(title(page)).toHaveText("Saturday, January 2, 2027");
  });

  test("the year is one tab stop; Home goes to the start of the week", async ({ page }) => {
    await viewButton(page, "year").click();
    await expect(tabStops(page)).toHaveCount(1);
    await tabStops(page).focus();
    await page.keyboard.press("Home");
    await expect(page.locator('[data-grid-date="2026-11-15"]')).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(page.locator('[data-grid-date="2026-11-08"]')).toBeFocused();
  });
});

test("ending a series after a count reads well for any number", async ({ page }) => {
  await page.getByRole("button", { name: "New event" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Repeat" }).selectOption({ label: "week" });
  await dialog.getByRole("radio", { name: "Number of occurrences" }).check();
  const count = dialog.getByRole("spinbutton", {
    name: "Number of occurrences",
  });
  await count.fill("1");
  await expect(count).toHaveValue("1");
  // No "1 occurrences": the count is not followed by a word that depends on it.
  await expect(dialog.getByText("occurrences", { exact: true })).toHaveCount(0);
});

test("short timed events show on one line, long ones on two", async ({ page }) => {
  await viewButton(page, "week").click();
  const standup = page.getByRole("button", { name: /Daily standup/ });
  await standup.scrollIntoViewIfNeeded();
  // 30 minutes: title and start time side by side, so nothing is cut in half.
  await expect(standup).toContainText("9:00 AM");
  await expect(standup).not.toContainText("9:30");
  expect(await standup.evaluate((element) => getComputedStyle(element).flexDirection)).toBe("row");

  // Three hours: title, then the full range below it.
  const workshop = page.getByRole("button", { name: /Svelte workshop/ });
  await expect(workshop).toContainText("3:00 – 6:00 PM");
  expect(await workshop.evaluate((element) => getComputedStyle(element).flexDirection)).toBe(
    "column",
  );
});
