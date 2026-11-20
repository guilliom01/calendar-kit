<script lang="ts">
  import { today } from "@internationalized/date";
  import * as FullCalendar from "#lib/registry/ui/full-calendar/index.js";
  import { CalendarState, defaultLabels } from "#lib/registry/ui/full-calendar/index.js";
  import { MonthView } from "#lib/registry/ui/month-view/index.js";
  import { TimeGrid } from "#lib/registry/ui/time-grid/index.js";
  import { labels } from "./labels.js";
  import { sampleEvents } from "./sample-events.js";

  const timeZone = "America/Lima";
  const locales = { "es-PE": "Español", "en-US": "English", "ar-EG": "العربية", "ja-JP": "日本語" };

  const calendar = new CalendarState({
    editable: true,
    locale: "en-US",
    timeZone,
    events: sampleEvents(today(timeZone), timeZone),
  });

  // Dates, weekdays, "today" and "next month" come from Intl in any locale. The few texts
  // Intl cannot provide are `labels`: here Spanish, and the English defaults otherwise.
  function setLocale(next: string) {
    calendar.locale = next;
    calendar.labels = next === "es-PE" ? { ...defaultLabels, ...labels } : defaultLabels;
  }
</script>

<label class="mb-2 flex items-center gap-2 text-sm">
  Language
  <select
    class="h-8 rounded-md border bg-transparent px-2"
    value={calendar.locale}
    onchange={(change) => setLocale(change.currentTarget.value)}
  >
    {#each Object.entries(locales) as [code, name] (code)}
      <option value={code} lang={code}>{name}</option>
    {/each}
  </select>
</label>
<!-- dir="rtl" mirrors the layout, the arrows and dragging. -->
<div
  class="flex min-h-0 flex-1 flex-col"
  lang={calendar.locale}
  dir={calendar.locale.startsWith("ar") ? "rtl" : "ltr"}
>
  <FullCalendar.Root state={calendar}>
    <FullCalendar.Toolbar>
      <FullCalendar.Nav />
      <FullCalendar.Title />
      <FullCalendar.ViewSwitcher class="ms-auto" />
    </FullCalendar.Toolbar>
    <FullCalendar.View name="month"><MonthView class="flex-1" /></FullCalendar.View>
    <FullCalendar.View name="week"><TimeGrid class="flex-1" scrollToHour={8} /></FullCalendar.View>
  </FullCalendar.Root>
</div>
